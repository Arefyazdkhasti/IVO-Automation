const { chromium } = require('playwright');
const readline = require('readline');
const fs = require('fs');
const path = require('path');

const { URLS, REPORT_PAGES } = require('../config/constants');
const { USERS_FILE, RESULTS_DIR } = require('../config/paths');
const { getTargetPersianStartDate, addDaysToPersianDate } = require('../core/jalali');

const LOGIN_URL = URLS.LOGIN_URL;
const REPORTS_HUB_URL = URLS.REPORTS_HUB_URL;
const DISCHARGE_PAGE_URL = URLS.DISCHARGE_PAGE_URL;

/**
 * Prompt user input via terminal
 */
function ask(question) {
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout,
    });

    return new Promise((resolve) => {
        rl.question(question, (answer) => {
            rl.close();
            resolve(answer.trim());
        });
    });
}

/**
 * Login function for a single user
 * @param {import('playwright').Page} page
 * @param {{ username: string, password: string, name: string }} user
 */
async function login(page, user) {
    const cleanUsername = user.username.trim();
    const cleanPassword = user.password.trim();

    console.log(`\n==============================================`);
    console.log(`Logging in for: ${user.name} (${cleanUsername})...`);

    await page.goto(LOGIN_URL, { waitUntil: 'domcontentloaded' });

    let alertMessage = '';
    page.on('dialog', async (dialog) => {
        alertMessage = dialog.message();
        console.warn(`[System Alert]: ${alertMessage}`);
        await dialog.accept();
    });

    // We try normalized lowercase username (as po6020 worked)
    const usernameToTry = cleanUsername.toLowerCase();
    await page.locator('#user').fill(usernameToTry);
    await page.locator('#pass').fill(cleanPassword);

    const captcha = page.locator('#imgCaptcha');
    await captcha.waitFor({ state: 'visible' });

    const captchaCode = await ask(`Enter CAPTCHA for "${user.name}" (${usernameToTry}): `);
    await page.locator('#txtimgcode').fill(captchaCode.trim());

    await Promise.all([
        page.waitForNavigation({ waitUntil: 'domcontentloaded', timeout: 30000 }).catch(() => {}),
        page.locator('#Button1').click(),
    ]);

    const currentUrl = page.url();
    if (currentUrl.includes('Login_Required.aspx')) {
        // Extract any on-page error label if present
        const pageError = await page.locator('#lblError, #lblMessage, #Label1, #lbl_msg, span[style*="color:Red"]').allInnerTexts().catch(() => []);
        const detailedError = alertMessage || pageError.filter(Boolean).join(' - ') || 'Incorrect captcha or credentials';
        throw new Error(`Login failed for ${cleanUsername} -> Server says: "${detailedError}"`);
    }

    console.log(`✓ Login successful for: ${user.name} (${usernameToTry})`);
    console.log(`Landed on: ${currentUrl}`);
}

/**
 * Extracts records from the GridView2 table:
 * - Separates pending undischarged records from "عدم وصول"
 */
async function extractRecordsFromReport(page, reportName) {
    const toDischarge = [];
    const noArrival = [];

    const totalCountText = await page.locator('#Label3').innerText().catch(() => '0');
    const totalCount = parseInt(totalCountText.trim(), 10) || 0;
    console.log(`Total records reported (#Label3): ${totalCount}`);

    if (totalCount === 0) {
        console.log(`No records found for [${reportName}]. Moving to next.`);
        return { toDischarge, noArrival };
    }

    const table = page.locator('#GridView2');
    const tableExists = await table.isVisible().catch(() => false);
    if (!tableExists) {
        return { toDischarge, noArrival };
    }

    const headerCells = await table.locator('tr').first().locator('th').allInnerTexts();
    const trackingCodeIdx = headerCells.findIndex((h) => h.includes('کد رهگیری') && !h.includes('خودرو'));
    const dateIdx = headerCells.findIndex((h) => h.trim() === 'تاریخ');
    const dischargeIdx = headerCells.findIndex((h) => h.trim() === 'تخلیه');

    const rows = await table.locator('tr').all();
    for (let i = 1; i < rows.length; i++) {
        const row = rows[i];
        const cells = await row.locator('td').all();
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

/**
 * Searches reports to find undischarged records
 */
async function collectUndischargedRecords(page, user) {
    const startDate = getTargetPersianStartDate();
    console.log(`\n[Workflow] Target start date calculated: ${startDate}`);

    await page.goto(REPORTS_HUB_URL, { waitUntil: 'domcontentloaded' });
    await page.waitForTimeout(1000);

    const pendingRecords = [];
    const excludedRecords = [];

    for (const report of REPORT_PAGES) {
        console.log(`\n----------------------------------------------`);
        console.log(`[Step] Checking report: ${report.name}...`);
        await page.goto(report.url, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1200);

        if (page.url().includes('notallow.aspx')) {
            console.error(`Blocked (notallow.aspx) on ${report.name}. Skipping.`);
            await page.goto(REPORTS_HUB_URL, { waitUntil: 'domcontentloaded' });
            continue;
        }

        const dateInput = page.locator('#dte1');
        const isDateVisible = await dateInput.isVisible().catch(() => false);
        if (!isDateVisible) {
            await page.goto(REPORTS_HUB_URL, { waitUntil: 'domcontentloaded' });
            continue;
        }

        await dateInput.click();
        await dateInput.fill('');
        await dateInput.fill(startDate);

        await Promise.all([
            page.waitForLoadState('domcontentloaded').catch(() => {}),
            page.locator('#Button2').click(),
        ]);

        await page.waitForTimeout(1200);

        if (page.url().includes('notallow.aspx')) {
            console.error(`Postback blocked (notallow.aspx) for ${report.name}.`);
            await page.goto(REPORTS_HUB_URL, { waitUntil: 'domcontentloaded' });
            continue;
        }

        const { toDischarge, noArrival } = await extractRecordsFromReport(page, report.name);
        pendingRecords.push(...toDischarge);
        excludedRecords.push(...noArrival);
    }

    return { startDate, pendingRecords, excludedRecords };
}

/**
 * Performs discharge confirmation for all collected codes
 */
async function processDischargeWorkflow(page, pendingRecords) {
    if (pendingRecords.length === 0) {
        console.log('\n[Discharge] No undischarged records to process.');
        return [];
    }

    console.log(`\n==============================================`);
    console.log(`Starting discharge registration for ${pendingRecords.length} record(s)...`);

    const completed = [];

    for (let i = 0; i < pendingRecords.length; i++) {
        const item = pendingRecords[i];
        console.log(`\n[${i + 1}/${pendingRecords.length}] Processing tracking code: [${item.trackingCode}]...`);

        // 1. Go to discharge search page
        await page.goto(DISCHARGE_PAGE_URL, { waitUntil: 'domcontentloaded' });
        await page.waitForTimeout(1000);

        // 2. Fill search box #idcode
        const idInput = page.locator('#idcode');
        await idInput.waitFor({ state: 'visible', timeout: 15000 });
        await idInput.fill(item.trackingCode);

        // 3. Click search #Button1
        console.log(`Searching for tracking code [${item.trackingCode}]...`);
        await Promise.all([
            page.waitForLoadState('domcontentloaded').catch(() => {}),
            page.locator('#Button1').click(),
        ]);
        await page.waitForTimeout(1500);

        // 4. Click "تایید تخلیه" in the search results table
        const confirmBtn = page.locator('input[value="تایید تخلیه"]').first();
        const hasConfirmBtn = await confirmBtn.isVisible().catch(() => false);

        if (!hasConfirmBtn) {
            console.warn(`No "تایید تخلیه" button found for code [${item.trackingCode}]. Skipping.`);
            continue;
        }

        console.log(`Clicking "تایید تخلیه"...`);
        await Promise.all([
            page.waitForLoadState('domcontentloaded').catch(() => {}),
            confirmBtn.click(),
        ]);
        await page.waitForTimeout(2000);

        // 5. Calculate and set discharge date (creation date + 1 day)
        const dischargeDate = addDaysToPersianDate(item.fullDateText, 1);
        console.log(`Calculated discharge date (Creation + 1 day): ${dischargeDate}`);

        const takhDateInput = page.locator('#takh_dte');
        if (await takhDateInput.isVisible().catch(() => false) && dischargeDate) {
            await takhDateInput.click();
            await takhDateInput.fill('');
            await takhDateInput.fill(dischargeDate);
            console.log(`Discharge date set to: ${dischargeDate}`);
        }

        // 6. Click "دریافت مستقیم اطلاعات از باسکول"
        console.log(`Clicking "دریافت مستقیم اطلاعات از باسکول"...`);
        const scaleButton = page.locator('input[value*="دریافت مستقیم اطلاعات از باسکول"], #Button1');
        await Promise.all([
            page.waitForLoadState('domcontentloaded').catch(() => {}),
            scaleButton.click(),
        ]);
        console.log(`Waiting for باسکول data to load...`);
        await page.waitForTimeout(3500);

        // 7. Click "تایید و ارسال" (#bb3)
        console.log(`Clicking final submit (#bb3: تایید و ارسال)...`);
        const submitButton = page.locator('#bb3, input[value*="تایید و ارسال"]');
        await Promise.all([
            page.waitForLoadState('domcontentloaded').catch(() => {}),
            submitButton.click(),
        ]);
        await page.waitForTimeout(2500);

        console.log(`✓ Record [${item.trackingCode}] successfully submitted!`);
        completed.push({
            trackingCode: item.trackingCode,
            creationDate: item.fullDateText,
            dischargeDate,
            reportName: item.reportName,
            status: 'تایید تخلیه با موفقیت ثبت شد',
        });
    }

    return completed;
}

(async () => {
    if (!fs.existsSync(USERS_FILE)) {
        console.error(`File ${USERS_FILE} not found!`);
        process.exit(1);
    }

    if (!fs.existsSync(RESULTS_DIR)) {
        fs.mkdirSync(RESULTS_DIR, { recursive: true });
    }

    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    console.log(`Loaded ${users.length} user(s) to process.`);

    const browser = await chromium.launch({
        headless: false,
        slowMo: 50,
    });

    const allReports = [];

    try {
        for (const user of users) {
            const context = await browser.newContext();
            const page = await context.newPage();

            try {
                await login(page, user);

                // Step 1: Collect undischarged records and excluded records
                const { startDate, pendingRecords, excludedRecords } = await collectUndischargedRecords(page, user);

                // Step 2: Register discharge for pending records
                const completedRecords = await processDischargeWorkflow(page, pendingRecords);

                // Build User Task JSON Report
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
                    },
                };

                allReports.push(userReport);

                // Save individual report to file
                const userReportPath = path.join(RESULTS_DIR, `report_${user.username}.json`);
                fs.writeFileSync(userReportPath, JSON.stringify(userReport, null, 2), 'utf-8');

                // Print formatted JSON report to terminal for this user
                console.log(`\n======================================================`);
                console.log(`>>> JSON TASK REPORT FOR USER: ${user.name} (${user.username}) <<<`);
                console.log(`======================================================`);
                console.log(JSON.stringify(userReport, null, 2));
                console.log(`Saved report to: ${userReportPath}`);
                console.log(`======================================================\n`);

            } catch (err) {
                console.error(`Error processing user ${user.name} (${user.username}):`, err.message);
            } finally {
                await context.close();
            }
        }

        // Save combined report
        const summaryPath = path.join(RESULTS_DIR, 'summary_latest.json');
        fs.writeFileSync(summaryPath, JSON.stringify(allReports, null, 2), 'utf-8');
        console.log(`All operations finished. Combined summary saved to: ${summaryPath}`);

    } catch (globalError) {
        console.error('Global script error:', globalError);
    } finally {
        await browser.close();
    }
})();