const { chromium } = require('playwright');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

const LOGIN_URL = 'https://e.ivo.ir/Login_Required.aspx';
const PORTAL_HOME_URL = 'https://e.ivo.ir/new_login/index1.aspx';
const POULTRY_PAGE_URL = 'https://e.ivo.ir/new_login/index_dbkava.aspx';
const CODES_FILE = path.join(__dirname, 'tracking_codes.json');

class PermitService extends EventEmitter {
    constructor() {
        super();
        this.browser = null;
        this.context = null;
        this.page = null;
        this.isRunning = false;
        this.currentStatus = 'idle'; // idle, waiting_captcha, navigating, checking_codes, success, failed
        this.captchaResolver = null;
        this.captchaRejecter = null;
    }

    log(message, type = 'info') {
        const time = new Date().toLocaleTimeString('fa-IR');
        const payload = { time, message, type };
        console.log(`[${time}] [${type.toUpperCase()}] ${message}`);
        this.emit('log', payload);
    }

    setStatus(status, meta = {}) {
        this.currentStatus = status;
        this.emit('status', { status, ...meta });
    }

    getTrackingCodes() {
        try {
            if (fs.existsSync(CODES_FILE)) {
                return JSON.parse(fs.readFileSync(CODES_FILE, 'utf-8'));
            }
        } catch (e) {
            console.error('Error reading tracking_codes.json:', e);
        }
        return [];
    }

    saveTrackingCodes(codes) {
        fs.writeFileSync(CODES_FILE, JSON.stringify(codes, null, 2), 'utf-8');
    }

    async stop() {
        this.isRunning = false;
        if (this.captchaRejecter) {
            this.captchaRejecter(new Error('عملیات توسط کاربر لغو شد.'));
            this.captchaResolver = null;
            this.captchaRejecter = null;
        }
        if (this.context) {
            await this.context.close().catch(() => {});
            this.context = null;
        }
        if (this.browser) {
            await this.browser.close().catch(() => {});
            this.browser = null;
        }
        this.setStatus('idle');
        this.log('مرورگر و فرآیند متوقف شدند.', 'warning');
    }

    submitCaptcha(code) {
        if (this.captchaResolver) {
            this.captchaResolver(code);
            this.captchaResolver = null;
            this.captchaRejecter = null;
            return true;
        }
        return false;
    }

    async waitForCaptchaInput(captchaBase64) {
        this.setStatus('waiting_captcha', { captchaImage: captchaBase64 });
        this.log('کپچا دریافت شد. لطفاً کد را در پنل وارد کنید...', 'info');

        return new Promise((resolve, reject) => {
            this.captchaResolver = resolve;
            this.captchaRejecter = reject;
        });
    }

    async startPermitFlow(user, options = {}) {
        if (this.isRunning) {
            throw new Error('یک عملیات در حال اجرا است.');
        }

        this.isRunning = true;
        this.setStatus('starting');
        this.log(`شروع صدور مجوز برای: ${user.name} (${user.username})`, 'info');

        try {
            this.browser = await chromium.launch({
                headless: options.headless !== undefined ? options.headless : false,
                slowMo: 100,
            });

            this.context = await this.browser.newContext({
                viewport: { width: 1280, height: 800 },
            });
            this.page = await this.context.newPage();

            // Setup dialog listener for alerts/confirmations
        this.lastDialogMsg = '';
        this.page.on('dialog', async (dialog) => {
            this.lastDialogMsg = dialog.message();
            this.log(`پیام سیستم پورتال (Alert): "${this.lastDialogMsg}"`, 'warning');
            await dialog.accept().catch(() => {});
        });

            // 1. Perform login with captcha verification
            await this.performLogin(user);

            // 2. Navigate to درون استانی > برون شهرستان > طیور
            await this.navigateToPoultryPermitPage();

            // 3. Check tracking codes one by one
            const codes = options.customCodes && options.customCodes.length > 0 
                ? options.customCodes 
                : this.getTrackingCodes();

            const result = await this.processTrackingCodes(codes);

            if (result.success) {
                this.setStatus('filling_details', { validCode: result.validCode });
                this.log(`در حال تکمیل مشخصات محصول، نژاد و کشتارگاه مقصد برای کد ${result.validCode}...`, 'info');

                const permitResult = await this.completePermitIssuance(user, result.validCode, options);

                this.setStatus('success', { 
                    message: `مجوز با کد ${result.validCode} و مقصد ${options.slaughterhouseName || 'کشتارگاه'} با موفقیت صادر شد!`,
                    validCode: result.validCode,
                    finalUrl: permitResult.finalUrl
                });
                this.log(`🎉 عملیات صدور مجوز با موفقیت به پایان رسید! آدرس نهایی: ${permitResult.finalUrl}`, 'success');
                return permitResult;
            } else {
                this.setStatus('failed', { 
                    message: 'هیچ‌کدام از کدهای رهگیری باز نبوده یا دکمه حمل به کشتارگاه ظاهر نشد.' 
                });
                this.log('تمام کدهای رهگیری بررسی شدند اما هیچ‌کدام باز نبودند.', 'error');
            }

            return result;

        } catch (err) {
            this.log(`خطا در اجرای فرآیند: ${err.message}`, 'error');
            this.setStatus('failed', { message: err.message });
            throw err;
        } finally {
            this.isRunning = false;
        }
    }

    async performLogin(user) {
        const cleanUsername = user.username.trim().toLowerCase();
        const cleanPassword = user.password.trim();

        this.setStatus('logging_in');
        this.log(`در حال ورود به سامانه دامپزشکی برای ${user.name}...`, 'info');

        await this.page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });

        let loginSuccess = false;
        let attempt = 0;

        while (!loginSuccess && this.isRunning && attempt < 5) {
            attempt++;
            this.log(`تلاش لاگین (مرحله ${attempt})...`, 'info');

            await this.page.locator('#user').fill(cleanUsername);
            await this.page.locator('#pass').fill(cleanPassword);

            const captchaElem = this.page.locator('#imgCaptcha');
            await captchaElem.waitFor({ state: 'visible', timeout: 20000 });

            // Small delay to ensure image data is loaded
            await this.page.waitForTimeout(500);

            // Capture screenshot of captcha image
            const captchaBuffer = await captchaElem.screenshot();
            const captchaBase64 = `data:image/jpeg;base64,${captchaBuffer.toString('base64')}`;

            // Wait for user to input captcha from Web UI
            const captchaCode = await this.waitForCaptchaInput(captchaBase64);
            if (!this.isRunning) return;

            this.log(`کد کپچا وارد شد: ${captchaCode}. در حال ارسال به پورتال...`, 'info');
            await this.page.locator('#txtimgcode').fill(captchaCode.trim());

            await Promise.all([
                this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
                this.page.locator('#Button1').click(),
            ]);

            const currentUrl = this.page.url();
            if (currentUrl.includes('Login_Required.aspx')) {
                const pageErrors = await this.page.locator('#lblError, #lblMessage, #Label1, #lbl_msg, span[style*="color:Red"]').allInnerTexts().catch(() => []);
                const detailedError = pageErrors.filter(Boolean).join(' ') || 'کد امنیتی یا مشخصات اشتباه است.';
                this.log(`ورود ناموفق بود: ${detailedError}. تلاش مجدد...`, 'warning');
                this.emit('captcha_error', { message: detailedError });
                await this.page.waitForTimeout(1000);
            } else {
                loginSuccess = true;
                this.log(`ورود با موفقیت انجام شد! آدرس فعلی: ${currentUrl}`, 'success');
            }
        }

        if (!loginSuccess) {
            throw new Error('تعداد تلاش‌های ناموفق لاگین بیش از حد مجاز بود.');
        }
    }

    async navigateToPoultryPermitPage() {
        this.setStatus('navigating');
        this.log('در حال هدایت به منوی "درون استانی > برون شهرستان > طیور"...', 'info');

        // Check if we are not on portal home
        const currentUrl = this.page.url();
        if (!currentUrl.includes('index1.aspx') && !currentUrl.includes('index_dbkava.aspx')) {
            await this.page.goto(PORTAL_HOME_URL, { waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {});
        }

        await this.page.waitForTimeout(1000);

        let navigated = false;

        // Method 1: Check if A72 is in DOM and trigger __doPostBack
        try {
            const hasA72 = await this.page.evaluate(() => {
                const link = document.querySelector('#A72');
                if (link) {
                    if (typeof window.__doPostBack === 'function') {
                        window.__doPostBack('A72', '');
                        return true;
                    }
                    link.click();
                    return true;
                }
                return false;
            });

            if (hasA72) {
                this.log('دستور پست‌بک آیتم منوی طیور (A72) اجرا شد. در حال انتظار برای بارگذاری صفحه...', 'info');
                await this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {});
            }
        } catch (e) {
            this.log(`تلاش مستقیم پست‌بک: ${e.message}`, 'warning');
        }

        // Method 2: If not yet on index_dbkava.aspx, interact with menu items
        if (!this.page.url().includes('index_dbkava.aspx')) {
            try {
                this.log('تلاش برای باز کردن سلسله مراتبی منوها با ماوس...', 'info');
                // Hover "درون استاني"
                const intraProvMenu = this.page.locator('a.MenuBarItemSubmenu:has-text("درون استاني")').first();
                if (await intraProvMenu.isVisible()) {
                    await intraProvMenu.hover();
                    await this.page.waitForTimeout(400);

                    // Hover "برون شهرستان"
                    const interCountyMenu = this.page.locator('a.MenuBarItemSubmenu:has-text("برون شهرستان")').first();
                    if (await interCountyMenu.isVisible()) {
                        await interCountyMenu.hover();
                        await this.page.waitForTimeout(400);
                    }
                }

                const poultryLink = this.page.locator('#A72, a:has-text("طيور")').first();
                if (await poultryLink.isVisible()) {
                    await Promise.all([
                        this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 15000 }).catch(() => {}),
                        poultryLink.click(),
                    ]);
                }
            } catch (err) {
                this.log(`کلیک روی منو با خطا مواجه شد: ${err.message}`, 'warning');
            }
        }

        // Method 3: Fallback direct navigation if permitted
        if (!this.page.url().includes('index_dbkava.aspx')) {
            this.log('هدایت مستقیم به آدرس index_dbkava.aspx...', 'info');
            await this.page.goto(POULTRY_PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
        }

        // Verify we reached the page
        await this.ensureOnPoultryPermitPage();
        this.log('صفحه ورود کد رهگیری (index_dbkava.aspx) با موفقیت باز شد.', 'success');
    }

    async ensureOnPoultryPermitPage() {
        const currentUrl = this.page.url();
        if (!currentUrl.includes('index_dbkava.aspx')) {
            this.log(`خروج از صفحه تشخیص داده شد (${currentUrl}). در حال بازگشت با دکمه Back مرورگر...`, 'warning');
            
            // Try going back first as requested
            try {
                await Promise.all([
                    this.page.waitForLoadState('domcontentloaded', { timeout: 8000 }).catch(() => {}),
                    this.page.goBack({ timeout: 8000 }).catch(() => {}),
                ]);
            } catch (e) {}

            // If still not on index_dbkava.aspx, navigate directly
            if (!this.page.url().includes('index_dbkava.aspx')) {
                this.log('بازگشت مستقیم به آدرس index_dbkava.aspx...', 'info');
                await this.page.goto(POULTRY_PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 25000 }).catch(() => {});
            }

            await this.page.waitForTimeout(1000);
        }

        // Wait for specific input field on index_dbkava.aspx (using .first() to avoid strict mode violations)
        const gidInput = this.page.locator('input#gid[type="text"], input[name="gid"][type="text"]').first();
        await gidInput.waitFor({ state: 'visible', timeout: 15000 });
        return gidInput;
    }

    async processTrackingCodes(codes) {
        this.setStatus('checking_codes', { totalCodes: codes.length, currentIndex: 0 });
        this.log(`شروع بررسی ${codes.length} کد رهگیری برای یافتن کد باز...`, 'info');

        for (let i = 0; i < codes.length; i++) {
            if (!this.isRunning) {
                this.log('فرآیند متوقف شد.', 'warning');
                return { success: false, reason: 'stopped' };
            }

            const code = String(codes[i]).trim();
            if (!code) continue;

            this.emit('code_progress', {
                index: i,
                code: code,
                status: 'checking',
                message: `در حال بررسی کد ${code} (${i + 1} از ${codes.length})...`
            });
            this.log(`[${i + 1}/${codes.length}] تست کد رهگیری: ${code}`, 'info');

            try {
                // Ensure we are strictly on index_dbkava.aspx
                const gidInput = await this.ensureOnPoultryPermitPage();
                await gidInput.click();
                await gidInput.fill('');
                await gidInput.fill(code);

                // Click confirm button: <input type="submit" name="taeed" value="تاييد" id="taeed">
                const taeedBtn = this.page.locator('input#taeed, input[name="taeed"]').first();
                this.lastDialogMsg = '';

                await Promise.all([
                    this.page.waitForLoadState('domcontentloaded').catch(() => {}),
                    taeedBtn.click(),
                ]);

                // Wait for slaughter button: <input type="submit" name="button4" value="حمل به کشتارگاه" id="button4">
                const slaughterBtn = this.page.locator('input#button4, input[name="button4"], input[value="حمل به کشتارگاه"]').first();
                let isSlaughterBtnVisible = false;
                try {
                    await slaughterBtn.waitFor({ state: 'visible', timeout: 5000 });
                    isSlaughterBtnVisible = true;
                } catch (e) {
                    isSlaughterBtnVisible = false;
                }

                if (isSlaughterBtnVisible) {
                    this.log(`✓ دکمه "حمل به کشتارگاه" برای کد رهگیری ${code} نمایان شد!`, 'success');
                    this.emit('code_progress', {
                        index: i,
                        code: code,
                        status: 'matched',
                        message: 'دکمه حمل به کشتارگاه ظاهر شد!'
                    });

                    // Click slaughter button
                    this.log(`در حال کلیک روی دکمه "حمل به کشتارگاه"...`, 'info');
                    await Promise.all([
                        this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {}),
                        slaughterBtn.click(),
                    ]);

                    this.log(`دکمه "حمل به کشتارگاه" با موفقیت فشرده شد! آدرس جاری: ${this.page.url()}`, 'success');

                    this.emit('code_progress', {
                        index: i,
                        code: code,
                        status: 'completed',
                        message: 'دکمه حمل به کشتارگاه کلیک شد و فرآیند با موفقیت انجام گرفت.'
                    });

                    return { success: true, validCode: code };
                } else {
                    // Check for any error label on page or dialog alert
                    const pageAlert = await this.page.locator('#Label4, span[style*="color:Red"], #lblError, #Label1, #lbl_msg').allInnerTexts().catch(() => []);
                    const alertDetail = this.lastDialogMsg || pageAlert.map((t) => t.trim()).filter(Boolean).join(' ') || 'دکمه حمل به کشتارگاه ظاهر نشد';
                    
                    this.log(`کد ${code} باز نیست یا با خطا مواجه شد: (${alertDetail})`, 'warning');
                    this.emit('code_progress', {
                        index: i,
                        code: code,
                        status: 'rejected',
                        message: alertDetail
                    });

                    // If code was not valid and page moved away from index_dbkava.aspx, return back
                    await this.ensureOnPoultryPermitPage();
                }
            } catch (err) {
                this.log(`خطا در بررسی کد ${code}: ${err.message}`, 'error');
                this.emit('code_progress', {
                    index: i,
                    code: code,
                    status: 'error',
                    message: err.message
                });
                // Ensure page recovered for next code
                await this.ensureOnPoultryPermitPage().catch(() => {});
            }

            // Small delay between code checks
            await this.page.waitForTimeout(600);
        }

        return { success: false, reason: 'no_valid_code_found' };
    }

    async completePermitIssuance(user, validCode, options = {}) {
        this.log('گام ۱: در حال تکمیل مشخصات کالا و نژاد طیور...', 'info');

        // Wait for dropdowns on cars_bygid_kava_tyr page
        await this.page.waitForSelector('#prdct, #aghlam, #race', { state: 'visible', timeout: 20000 });

        // 1. Select Product: مرغ زنده - جهت كشتار (128)
        const prdctSelect = this.page.locator('#prdct');
        if (await prdctSelect.isVisible().catch(() => false)) {
            await prdctSelect.selectOption('128').catch(() => {});
            await prdctSelect.dispatchEvent('change').catch(() => {});
            this.log('محصول: "مرغ زنده - جهت كشتار" انتخاب شد.', 'info');
        }

        await this.page.waitForTimeout(500);

        // 2. Select Product Type: مرغ زنده - گوشتی جهت كشتار (127)
        const aghlamSelect = this.page.locator('#aghlam');
        if (await aghlamSelect.isVisible().catch(() => false)) {
            await aghlamSelect.selectOption('127').catch(() => {});
            await aghlamSelect.dispatchEvent('change').catch(() => {});
            this.log('نوع محصول: "مرغ زنده - گوشتی جهت كشتار" انتخاب شد.', 'info');
        }

        await this.page.waitForTimeout(500);

        // 3. Select Breed
        const BREED_MAP = {
            'کاب': { value: '1', label: 'کاب' },
            'راس': { value: '2', label: 'راس' },
            'هوبارد': { value: '3', label: 'هوبارد' },
            'آربور آکرز': { value: '4', label: 'آربور آکرز' },
            'لوهمن': { value: '5', label: 'لوهمن' },
            'هیبرو جی': { value: '6', label: 'هیبرو جی' },
            'آرين': { value: '7', label: 'آرين' },
            'آرین': { value: '7', label: 'آرين' },
            'ایندین ریورز': { value: '57', label: 'ایندین ریورز' },
        };

        const userBreed = (user.breed || options.breed || 'راس').trim();
        const breedInfo = BREED_MAP[userBreed] || { value: '2', label: 'راس' };

        const raceSelect = this.page.locator('#race');
        if (await raceSelect.isVisible().catch(() => false)) {
            await raceSelect.selectOption(breedInfo.value).catch(() => {});
            await raceSelect.dispatchEvent('change').catch(() => {});

            // Also set CascadingDropDown1_ClientState if present
            await this.page.evaluate(({ val, lbl }) => {
                const stateInput = document.querySelector('#CascadingDropDown1_ClientState');
                if (stateInput) {
                    stateInput.value = `${val}:::${lbl}:::`;
                }
            }, { val: breedInfo.value, lbl: breedInfo.label }).catch(() => {});

            this.log(`نژاد محصول: "${breedInfo.label}" (کد: ${breedInfo.value}) انتخاب شد.`, 'info');
        }

        await this.page.waitForTimeout(600);

        // 4. Click confirm button: <input type="submit" name="Button1" value="تایید" id="Button1">
        const confirmBtn = this.page.locator('input#Button1[value*="تایید"]').first();
        this.log('کلیک روی دکمه تایید مشخصات نژاد و محصول...', 'info');

        await Promise.all([
            this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
            confirmBtn.click(),
        ]);

        await this.page.waitForTimeout(1500);

        // 5. Arrived at A2_4_2_tyr.aspx (Destination allocation)
        this.log(`انتقال به صفحه تخصیص واحد مقصد انجام شد (${this.page.url()}).`, 'info');

        // A. Fill Hatching Permit Code (کد مجوزجوجه ریزی مبدا) in Row 1
        const hatchingCode = (user.hatchingPermitCode || options.hatchingPermitCode || '').trim();
        this.log(`ورود کد مجوز جوجه‌ریزی مبدا: "${hatchingCode}"...`, 'info');

        let hatchInput = this.page.locator('tr:has-text("جوجه") input[type="text"], td:has-text("جوجه") input[type="text"]').first();
        if (!(await hatchInput.isVisible().catch(() => false))) {
            // First text input on the page is hatching permit code
            hatchInput = this.page.locator('input[type="text"]').nth(0);
        }
        await hatchInput.fill('');
        if (hatchingCode) {
            await hatchInput.fill(hatchingCode);
        }

        await this.page.waitForTimeout(400);

        // B. Fill Jihad Unit Code (شناسه یکتای جهادی واحد مقصد) in Row 2
        const slaughterhouseCode = (options.slaughterhouseCode || '190805534221').trim();
        const slaughterhouseName = options.slaughterhouseName || 'ساینا';
        this.log(`ورود شناسه یکتای جهادی کشتارگاه مقصد: "${slaughterhouseCode}" (${slaughterhouseName})...`, 'info');

        const fetchUnitBtn = this.page.locator('input#Button2[value*="فراخوانی واحد"], input#Button2').first();
        await fetchUnitBtn.waitFor({ state: 'visible', timeout: 20000 });

        // Locate input for Jihad code (beside Button2)
        let jihadInput = this.page.locator('tr:has-text("شناسه یکتای جهادی") input[type="text"], tr:has-text("مقصد") input[type="text"]').first();
        if (!(await jihadInput.isVisible().catch(() => false))) {
            const rowWithBtn = this.page.locator('tr:has(#Button2)');
            if (await rowWithBtn.isVisible().catch(() => false)) {
                jihadInput = rowWithBtn.locator('input[type="text"]').first();
            } else {
                // Second text input on page
                jihadInput = this.page.locator('input[type="text"]').nth(1);
            }
        }

        await jihadInput.fill('');
        await jihadInput.fill(slaughterhouseCode);

        // C. Click "فراخوانی واحد"
        this.log('کلیک روی دکمه "فراخوانی واحد"...', 'info');
        await Promise.all([
            this.page.waitForLoadState('domcontentloaded').catch(() => {}),
            fetchUnitBtn.click(),
        ]);

        await this.page.waitForTimeout(2000);

        // D. Select unit from #SSVahed_code2 dropdown
        const vahedSelect = this.page.locator('#SSVahed_code2');
        await vahedSelect.waitFor({ state: 'visible', timeout: 15000 });

        // Wait until options are populated (> 1 options)
        await this.page.waitForFunction(() => {
            const select = document.querySelector('#SSVahed_code2');
            return select && select.options && select.options.length > 1;
        }, { timeout: 15000 }).catch(() => {});

        // Select the first valid slaughterhouse option (index 1)
        await vahedSelect.selectOption({ index: 1 }).catch(() => {});
        await vahedSelect.dispatchEvent('change').catch(() => {});

        const selectedUnitText = await this.page.evaluate(() => {
            const sel = document.querySelector('#SSVahed_code2');
            return sel && sel.selectedIndex >= 0 ? sel.options[sel.selectedIndex].text : '';
        });
        this.log(`واحد کشتارگاه مقصد انتخاب شد: "${selectedUnitText}"`, 'success');

        await this.page.waitForTimeout(600);

        // E. Fill quantity in #qnt
        const quantity = String(options.quantity || '2000').trim();
        this.log(`ورود تعداد قطعه: ${quantity}...`, 'info');
        const qntInput = this.page.locator('#qnt');
        await qntInput.waitFor({ state: 'visible', timeout: 10000 });
        await qntInput.fill('');
        await qntInput.fill(quantity);

        // F. Click Submit on destination page: <input type="submit" name="Button1" value="   تایید و ارسال     " id="Button1" class="login-submit">
        this.log('کلیک روی دکمه "تایید و ارسال" مرحله تخصیص واحد...', 'info');
        const nextStepBtn = this.page.locator('input#Button1.login-submit, input#Button1[value*="تایید و ارسال"]').first();

        await Promise.all([
            this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => {}),
            nextStepBtn.click(),
        ]);

        await this.page.waitForTimeout(2000);

        // G. Arrived at Final Step (a2_4_2_tyr_mog_cp.aspx)
        this.log(`در حال ورود به صفحه ثبت نهایی و تاییدیه مجوز (${this.page.url()})...`, 'info');
        await this.page.waitForURL((url) => url.href.includes('a2_4_2_tyr_mog_cp.aspx') || url.href.includes('mog_cp'), { timeout: 25000 }).catch(() => {});

        // 1. Fill Owner Name (#owner)
        const ownerInput = this.page.locator('#owner');
        await ownerInput.waitFor({ state: 'visible', timeout: 15000 });
        await ownerInput.fill('');
        await ownerInput.fill(user.name);
        this.log(`نام مالک وارد شد: "${user.name}"`, 'info');

        // 2. Select Sex: "هر دو"
        const sexSelect = this.page.locator('#sex');
        if (await sexSelect.isVisible().catch(() => false)) {
            await sexSelect.selectOption('هر دو').catch(() => {});
            await sexSelect.dispatchEvent('change').catch(() => {});
            this.log('جنسیت: "هر دو" انتخاب شد.', 'info');
        }

        // 3. Purpose: "کشتار"
        const purposeSelect = this.page.locator('select#manzoor, select[name*="manzoor"], select[name*="mnzr"], select:has(option:has-text("کشتار"))').first();
        if (await purposeSelect.isVisible().catch(() => false)) {
            await purposeSelect.selectOption({ label: 'کشتار' }).catch(async () => {
                const optVal = await purposeSelect.locator('option:has-text("کشتار")').first().getAttribute('value');
                if (optVal) await purposeSelect.selectOption(optVal);
            });
            this.log('به منظور: "کشتار" انتخاب شد.', 'info');
        } else {
            const purposeInput = this.page.locator('input#manzoor, input[name*="manzoor"], tr:has-text("منظور") input[type="text"]').first();
            if (await purposeInput.isVisible().catch(() => false)) {
                await purposeInput.fill('کشتار');
                this.log('به منظور: "کشتار" درج شد.', 'info');
            }
        }

        // 4. Remarks: #txt1 with specified template
        const epidemiologicCode = user.epidemiologicCode || '';
        const remarksTemplate = `کد اپیدمیولوژیک: ${epidemiologicCode}\nکد رهگیری: ${validCode}\n${user.name}`;

        const remarksInput = this.page.locator('#txt1');
        if (await remarksInput.isVisible().catch(() => false)) {
            await remarksInput.fill('');
            await remarksInput.fill(remarksTemplate);
            this.log(`ملاحظات ثبت شد:\n${remarksTemplate}`, 'info');
        }

        // 5. Validity Duration: 3 Days (#etebar & #etebar2)
        const etebarInput = this.page.locator('#etebar');
        if (await etebarInput.isVisible().catch(() => false)) {
            await etebarInput.fill('3');
            const etebar2Select = this.page.locator('#etebar2');
            if (await etebar2Select.isVisible().catch(() => false)) {
                await etebar2Select.selectOption('روز').catch(() => {});
            }
            this.log('مدت اعتبار: "۳ روز" تنظیم شد.', 'info');
        }

        // Save last successful code for reuse in same session
        this.saveLastSuccessfulCode(validCode, user);

        // 6. Click Final Submit Button: <input type="submit" name="Button1" value="تایید و ارسال" id="Button1">
        this.log('در حال کلیک روی دکمه "تایید و ارسال" نهایی صدور مجوز...', 'info');
        const finalSubmitBtn = this.page.locator('input#Button1[value*="تایید و ارسال"], input#Button1').first();

        await Promise.all([
            this.page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 35000 }).catch(() => {}),
            finalSubmitBtn.click(),
        ]);

        await this.page.waitForTimeout(2000);
        const finalReportUrl = this.page.url();
        this.log(`مجوز با موفقیت صادر شد و صفحه گزارش باز شد: ${finalReportUrl}`, 'success');

        return {
            success: true,
            finalUrl: finalReportUrl,
            validCode: validCode,
            slaughterhouse: selectedUnitText || slaughterhouseName,
            quantity: quantity,
        };
    }

    saveLastSuccessfulCode(code, user) {
        try {
            const data = {
                code,
                username: user.username,
                name: user.name,
                timestamp: new Date().toISOString()
            };
            fs.writeFileSync(path.join(__dirname, 'last_successful_code.json'), JSON.stringify(data, null, 2), 'utf-8');
            this.log(`کد رهگیری موفق (${code}) برای استفاده مجدد در این نشست ذخیره شد.`, 'info');
        } catch (e) {
            console.error('Error saving last successful code:', e);
        }
    }
}

module.exports = new PermitService();
