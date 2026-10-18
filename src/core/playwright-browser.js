const DEFAULT_NAV_TIMEOUT_MS = 90000;

const CHROMIUM_LAUNCH_ARGS = [
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-gpu',
];

function getChromiumLaunchOptions({ headless, slowMo = 100 }) {
    return {
        headless,
        slowMo,
        args: CHROMIUM_LAUNCH_ARGS,
    };
}

async function createPortalContext(browser) {
    const context = await browser.newContext({
        viewport: { width: 1280, height: 800 },
        locale: 'fa-IR',
        timezoneId: 'Asia/Tehran',
        userAgent:
            'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        ignoreHTTPSErrors: true,
    });
    context.setDefaultNavigationTimeout(DEFAULT_NAV_TIMEOUT_MS);
    context.setDefaultTimeout(60000);
    return context;
}

/**
 * @param {import('playwright').Page} page
 * @param {string} url
 * @param {(msg: string, level?: string) => void} [log]
 */
async function gotoPortalPage(page, url, log) {
    const maxAttempts = 3;
    let lastError;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
        try {
            if (log) {
                log(`بارگذاری درگاه (${attempt}/${maxAttempts})...`, 'info');
            }
            await page.goto(url, {
                waitUntil: 'domcontentloaded',
                timeout: DEFAULT_NAV_TIMEOUT_MS,
            });
            await page.locator('#user, #pass, body').first().waitFor({ state: 'attached', timeout: 20000 });
            return;
        } catch (err) {
            lastError = err;
            if (attempt < maxAttempts) {
                await page.waitForTimeout(2500 * attempt);
            }
        }
    }

    throw new Error(
        `دسترسی به ${url} از سرور برقرار نشد (${lastError?.message || 'timeout'}). `
        + 'اتصال اینترنت سرور، DNS، فایروال یا محدودیت دسترسی به e.ivo.ir را بررسی کنید.',
    );
}

module.exports = {
    DEFAULT_NAV_TIMEOUT_MS,
    getChromiumLaunchOptions,
    createPortalContext,
    gotoPortalPage,
};
