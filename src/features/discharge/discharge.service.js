const { chromium } = require('playwright');
const EventEmitter = require('events');
const fs = require('fs');
const path = require('path');

const { URLS, REPORT_PAGES } = require('../../config/constants');
const { RESULTS_DIR, USERS_FILE } = require('../../config/paths');
const { getTargetPersianStartDate, addDaysToPersianDate } = require('../../core/jalali');

const LOGIN_URL = URLS.LOGIN_URL;
const REPORTS_HUB_URL = URLS.REPORTS_HUB_URL;
const DISCHARGE_PAGE_URL = URLS.DISCHARGE_PAGE_URL;

class DischargeService extends EventEmitter {
    constructor() {
        super();
        this.browser = null;
        this.context = null;
        this.page = null;
        this.isRunning = false;
        this.currentStatus = 'idle';
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
        this.log('عملیات بررسی تخلیه متوقف شد.', 'warning');
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

    skipCaptcha() {
        if (this.captchaRejecter) {
            this.log('کپچا توسط کاربر رد (اسکیپ) شد.', 'warning');
            const rejecter = this.captchaRejecter;
            this.captchaResolver = null;
            this.captchaRejecter = null;
            rejecter(new Error('CAPTCHA_SKIPPED'));
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

    async startDischargeFlow(usersInput, options = {}) {
        if (this.isRunning) {
            throw new Error('یک عملیات در حال اجرا است.');
        }

        if (!fs.existsSync(RESULTS_DIR)) {
            fs.mkdirSync(RESULTS_DIR, { recursive: true });
        }

        const targetUsers = Array.isArray(usersInput) ? usersInput : [usersInput];
        if (targetUsers.length === 0) {
            throw new Error('هیچ کاربری برای بررسی مشخص نشده است.');
        }

        this.isRunning = true;
        this.setStatus('starting');
        this.log(`شروع بررسی گواهی‌ها و تخلیه برای ${targetUsers.length} مرغدار/کاربر...`, 'info');

        const allReports = [];
        let totalDischargedAll = 0;

        try {
            this.browser = await chromium.launch({
                headless: options.headless !== undefined ? options.headless : false,
                slowMo: 60,
            });

            for (let uIdx = 0; uIdx < targetUsers.length; uIdx++) {
                if (!this.isRunning) break;
                const user = targetUsers[uIdx];

                this.log(`\n======================================================`, 'info');
                this.log(`[${uIdx + 1}/${targetUsers.length}] آغاز فرآیند برای: ${user.name} (${user.username})`, 'info');
                this.log(`======================================================`, 'info');

                this.context = await this.browser.newContext({
                    viewport: { width: 1280, height: 800 },
                });
                this.page = await this.context.newPage();

                this.page.on('dialog', async (dialog) => {
                    const msg = dialog.message();
                    this.log(`پیام سیستم: "${msg}"`, 'warning');
                    await dialog.accept().catch(() => {});
                });

                try {
                    // 1. Perform Login
                    await this.performLogin(user);

                    // 2. Search undischarged records in 4 reports
                    const { startDate, pendingRecords, excludedRecords } = await this.collectUndischargedRecords(user);

                    this.emit('discharge_records_found', {
                        userIndex: uIdx,
                        totalUsers: targetUsers.length,
                        user: user.name,
                        username: user.username,
                        startDate,
                        totalPending: pendingRecords.length,
                        totalNoArrival: excludedRecords.length,
                        pendingRecords,
                        excludedRecords,
                    });

                    // 3. Process discharge confirmations
                    let completedRecords = [];
                    if (pendingRecords.length > 0) {
                        this.setStatus('discharging', {
                            user: user.name,
                            userIndex: uIdx + 1,
                            totalUsers: targetUsers.length,
                            total: pendingRecords.length,
                        });
                        completedRecords = await this.processDischargeWorkflow(pendingRecords);
                    } else {
                        this.log(`هیچ موردی با وضعیت "تخلیه نشده" برای کاربر ${user.name} یافت نشد.`, 'info');
                    }

                    totalDischargedAll += completedRecords.length;

                    // Build User Report
                    const userReport = {
                        user: user.name,
                        username: user.username,
                        checkedFromDate: startDate,
                        executionTimestamp: new Date().toISOString(),
                        noArrivalRecords: excludedRecords.map((r) => ({
                            trackingCode: r.trackingCode,
                            creationDate: r.fullDateText,
                            reportType: r.reportName,
                            status: r.status,
                        })),
                        dischargedRecords: completedRecords.map((r) => ({
                            trackingCode: r.trackingCode,
                            creationDate: r.creationDate,
                            dischargeDateSet: r.dischargeDate,
                            reportType: r.reportName,
                            status: r.status,
                        })),
                        stats: {
                            totalDischarged: completedRecords.length,
                            totalNoArrival: excludedRecords.length,
                            totalChecked: pendingRecords.length + excludedRecords.length,
                        },
                    };

                    allReports.push(userReport);

                    // Save JSON Report per user (with timestamp to preserve history)
                    const userTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
                    const userTimestampedPath = path.join(RESULTS_DIR, `report_${user.username}_${userTimestamp}.json`);
                    fs.writeFileSync(userTimestampedPath, JSON.stringify(userReport, null, 2), 'utf-8');

                    // Also keep latest
                    const userReportPath = path.join(RESULTS_DIR, `report_${user.username}.json`);
                    fs.writeFileSync(userReportPath, JSON.stringify(userReport, null, 2), 'utf-8');
                    this.log(`گزارش تخلیه کاربر در فایل report_${user.username}_${userTimestamp}.json ذخیره شد.`, 'success');

                } catch (userErr) {
                    if (userErr.message === 'CAPTCHA_SKIPPED') {
                        this.log(`بررسی کاربر ${user.name} به دلیل رد کردن کپچا متوقف و به کاربر بعدی منتقل شد.`, 'warning');
                    } else {
                        this.log(`خطا در بررسی کاربر ${user.name}: ${userErr.message}`, 'error');
                    }
                } finally {
                    if (this.context) {
                        await this.context.close().catch(() => {});
                        this.context = null;
                        this.page = null;
                    }
                }
            }

            // Save combined summary with timestamp to preserve history
            const summaryTimestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const summaryTimestampedPath = path.join(RESULTS_DIR, `summary_${summaryTimestamp}.json`);
            fs.writeFileSync(summaryTimestampedPath, JSON.stringify(allReports, null, 2), 'utf-8');

            // Also keep summary_latest.json
            const summaryPath = path.join(RESULTS_DIR, 'summary_latest.json');
            fs.writeFileSync(summaryPath, JSON.stringify(allReports, null, 2), 'utf-8');
            this.log(`گزارش تجمیعی کل کاربران در summary_${summaryTimestamp}.json ذخیره شد.`, 'success');

            this.setStatus('success', {
                message: `بررسی تمام ${targetUsers.length} کاربر به پایان رسید. (${totalDischargedAll} مورد تایید تخلیه شد)`,
                reportsCount: allReports.length,
            });

            return allReports;

        } catch (err) {
            this.log(`خطای کلی در بررسی تخلیه: ${err.message}`, 'error');
            this.setStatus('failed', { message: err.message });
            throw err;
        } finally {
            if (this.browser) {
                await this.browser.close().catch(() => {});
                this.browser = null;
            }
            this.isRunning = false;
        }
    }

    async performLogin(user) {
        const cleanUsername = user.username.trim().toLowerCase();
        const cleanPassword = user.password.trim();

        this.setStatus('logging_in');
        this.log(`ورود به سامانه برای ${user.name}...`, 'info');

        await this.page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded', timeout: 45000 });

        let loginSuccess = false;
        let attempt = 0;

        while (!loginSuccess && this.isRunning && attempt < 5) {
            attempt++;
            await this.page.locator('#user').fill(cleanUsername);
            await this.page.locator('#pass').fill(cleanPassword);

            const captchaElem = this.page.locator('#imgCaptcha');
            await captchaElem.waitFor({ state: 'visible', timeout: 20000 });
            await this.page.waitForTimeout(500);

            const captchaBuffer = await captchaElem.screenshot();
            const captchaBase64 = `data:image/jpeg;base64,${captchaBuffer.toString('base64')}`;

            let captchaCode;
            try {
                captchaCode = await this.waitForCaptchaInput(captchaBase64);
            } catch (err) {
                if (err.message === 'CAPTCHA_SKIPPED') {
                    this.log(`کپچای کاربر ${user.name} رد شد (اسکیپ).`, 'warning');
                    throw err;
                }
                throw err;
            }
            if (!this.isRunning) return;

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
                this.log(`ورود با موفقیت انجام شد!`, 'success');
            }
        }

        if (!loginSuccess) {
            throw new Error('تعداد تلاش‌های ناموفق لاگین بیش از حد مجاز بود.');
        }
    }

    async collectUndischargedRecords(user) {
        const startDate = getTargetPersianStartDate();
        this.setStatus('checking_reports', { startDate });
        this.log(`محاسبه بازه زمانی استعلام گواهی‌ها: از تاریخ ${startDate}...`, 'info');

        await this.page.goto(REPORTS_HUB_URL, { waitUntil: 'domcontentloaded' }).catch(() => {});
        await this.page.waitForTimeout(800);

        const pendingRecords = [];
        const excludedRecords = [];

        for (const report of REPORT_PAGES) {
            if (!this.isRunning) break;

            this.log(`بررسی گزارش: ${report.name}...`, 'info');
            await this.page.goto(report.url, { waitUntil: 'domcontentloaded', timeout: 30000 });
            await this.page.waitForTimeout(1000);

            if (this.page.url().includes('notallow.aspx')) {
                this.log(`دسترسی به گزارش ${report.name} محدود است (notallow.aspx). رد شد.`, 'warning');
                continue;
            }

            const dateInput = this.page.locator('#dte1');
            if (!(await dateInput.isVisible().catch(() => false))) {
                continue;
            }

            await dateInput.click();
            await dateInput.fill('');
            await dateInput.fill(startDate);

            // Click Search Button (#Button2)
            await Promise.all([
                this.page.waitForLoadState('domcontentloaded').catch(() => {}),
                this.page.locator('#Button2').click(),
            ]);

            await this.page.waitForTimeout(1200);

            if (this.page.url().includes('notallow.aspx')) {
                continue;
            }

            const { toDischarge, noArrival } = await this.extractRecordsFromReport(report.name);
            this.log(`گزارش ${report.name}: ${toDischarge.length} مورد تخلیه نشده، ${noArrival.length} مورد عدم وصول`, 'info');

            pendingRecords.push(...toDischarge);
            excludedRecords.push(...noArrival);
        }

        return { startDate, pendingRecords, excludedRecords };
    }

    async extractRecordsFromReport(reportName) {
        const toDischarge = [];
        const noArrival = [];

        const totalCountText = await this.page.locator('#Label3').innerText().catch(() => '0');
        const totalCount = parseInt(totalCountText.trim(), 10) || 0;

        if (totalCount === 0) {
            return { toDischarge, noArrival };
        }

        const table = this.page.locator('#GridView2');
        if (!(await table.isVisible().catch(() => false))) {
            return { toDischarge, noArrival };
        }

        const headerCells = await table.locator('tr').first().locator('th').allInnerTexts();
        const trackingCodeIdx = headerCells.findIndex((h) => h.includes('کد رهگیری') && !h.includes('خودرو'));
        const dateIdx = headerCells.findIndex((h) => h.trim() === 'تاریخ');
        const dischargeIdx = headerCells.findIndex((h) => h.trim() === 'تخلیه');

        const rows = await table.locator('tr').all();
        for (let i = 1; i < rows.length; i++) {
            const cells = await rows[i].locator('td').all();
            if (cells.length === 0) continue;

            const dischargeText = dischargeIdx !== -1 && cells[dischargeIdx]
                ? (await cells[dischargeIdx].innerText()).trim()
                : '';

            const trackingCode = trackingCodeIdx !== -1 && cells[trackingCodeIdx]
                ? (await cells[trackingCodeIdx].innerText()).trim()
                : '';
            const fullDateText = dateIdx !== -1 && cells[dateIdx]
                ? (await cells[dateIdx].innerText()).trim()
                : '';

            if (!trackingCode) continue;

            const isDischarged = dischargeText.includes('تخلیه شده');
            const isNoArrival = dischargeText.includes('عدم وصول');

            if (!isDischarged) {
                if (isNoArrival) {
                    noArrival.push({ trackingCode, fullDateText, reportName, status: dischargeText });
                } else {
                    toDischarge.push({ trackingCode, fullDateText, reportName, status: dischargeText || 'تخلیه نشده' });
                }
            }
        }

        return { toDischarge, noArrival };
    }

    async processDischargeWorkflow(pendingRecords) {
        this.log(`آغاز فرآیند ثبت تایید تخلیه برای ${pendingRecords.length} گواهی...`, 'info');
        const completed = [];

        for (let i = 0; i < pendingRecords.length; i++) {
            if (!this.isRunning) break;

            const item = pendingRecords[i];
            this.emit('discharge_item_progress', {
                index: i,
                total: pendingRecords.length,
                trackingCode: item.trackingCode,
                status: 'processing',
            });

            this.log(`[${i + 1}/${pendingRecords.length}] در حال ثبت تایید تخلیه کد: [${item.trackingCode}]...`, 'info');

            try {
                // 1. Open discharge page
                await this.page.goto(DISCHARGE_PAGE_URL, { waitUntil: 'domcontentloaded', timeout: 30000 });
                await this.page.waitForTimeout(800);

                // 2. Fill search box #idcode
                const idInput = this.page.locator('#idcode');
                await idInput.waitFor({ state: 'visible', timeout: 15000 });
                await idInput.fill('');
                await idInput.fill(item.trackingCode);

                // 3. Click search #Button1
                await Promise.all([
                    this.page.waitForLoadState('domcontentloaded').catch(() => {}),
                    this.page.locator('#Button1').click(),
                ]);
                await this.page.waitForTimeout(1200);

                // 4. Click "تایید تخلیه" in search results
                const confirmBtn = this.page.locator('input[value="تایید تخلیه"]').first();
                if (!(await confirmBtn.isVisible().catch(() => false))) {
                    this.log(`دکمه "تایید تخلیه" برای کد [${item.trackingCode}] یافت نشد.`, 'warning');
                    continue;
                }

                await Promise.all([
                    this.page.waitForLoadState('domcontentloaded').catch(() => {}),
                    confirmBtn.click(),
                ]);
                await this.page.waitForTimeout(1500);

                // 5. Calculate and set discharge date (Creation + 1 day)
                const dischargeDate = addDaysToPersianDate(item.fullDateText, 1);
                const takhDateInput = this.page.locator('#takh_dte');
                if (await takhDateInput.isVisible().catch(() => false) && dischargeDate) {
                    await takhDateInput.click();
                    await takhDateInput.fill('');
                    await takhDateInput.fill(dischargeDate);
                }

                // 6. Click scale button ("دریافت مستقیم اطلاعات از باسکول")
                const scaleButton = this.page.locator('input[value*="دریافت مستقیم اطلاعات از باسکول"], #Button1').first();
                if (await scaleButton.isVisible().catch(() => false)) {
                    await Promise.all([
                        this.page.waitForLoadState('domcontentloaded').catch(() => {}),
                        scaleButton.click(),
                    ]);
                    await this.page.waitForTimeout(3000);
                }

                // 7. Click Final Submit: #bb3
                const submitButton = this.page.locator('#bb3, input[value*="تایید و ارسال"]').first();
                if (await submitButton.isVisible().catch(() => false)) {
                    await Promise.all([
                        this.page.waitForLoadState('domcontentloaded').catch(() => {}),
                        submitButton.click(),
                    ]);
                    await this.page.waitForTimeout(2000);
                }

                this.log(`✓ تایید تخلیه کد [${item.trackingCode}] با موفقیت ثبت گردید!`, 'success');
                completed.push({
                    trackingCode: item.trackingCode,
                    creationDate: item.fullDateText,
                    dischargeDate,
                    reportName: item.reportName,
                    status: 'تایید تخلیه ثبت شد',
                });

                this.emit('discharge_item_progress', {
                    index: i,
                    total: pendingRecords.length,
                    trackingCode: item.trackingCode,
                    status: 'success',
                });

            } catch (err) {
                this.log(`خطا در ثبت تخلیه کد ${item.trackingCode}: ${err.message}`, 'error');
            }

            await this.page.waitForTimeout(600);
        }

        return completed;
    }
}

module.exports = new DischargeService();
