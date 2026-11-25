const { chromium } = require('playwright');

const DEFAULT_NAV_TIMEOUT_MS = 90000;

const CHROMIUM_LAUNCH_ARGS = [
    '--disable-dev-shm-usage',
    '--no-sandbox',
    '--disable-gpu',
];

function getChromiumLaunchOptions({ headless, slowMo = 100 } = {}) {
    const opts = {
        headless,
        slowMo,
        args: CHROMIUM_LAUNCH_ARGS,
    };
    if (process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH) {
        opts.executablePath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH;
    }
    if (process.env.PLAYWRIGHT_CHANNEL) {
        opts.channel = process.env.PLAYWRIGHT_CHANNEL;
    }
    return opts;
}

/**
 * Launches Chromium with automatic fallback to system Google Chrome or Microsoft Edge
 * if Playwright browser binaries are not installed on the host machine.
 */
async function launchPlaywrightChromium(launchOptions = {}) {
    const opts = getChromiumLaunchOptions(launchOptions);
    try {
        return await chromium.launch(opts);
    } catch (primaryErr) {
        const msg = String(primaryErr?.message || '');
        const isMissingBrowser =
            msg.includes("Executable doesn't exist") ||
            msg.includes('playwright was just installed') ||
            msg.includes('Failed to launch');

        if (isMissingBrowser && !opts.channel && !opts.executablePath) {
            console.warn('[Playwright] مرورگر پیش‌فرض یافت نشد. تلاش برای اجرای گوگل کروم سیستم...');
            try {
                return await chromium.launch({ ...opts, channel: 'chrome' });
            } catch (_) {
                console.warn('[Playwright] گوگل کروم سیستم یافت نشد. تلاش برای اجرای مایکروسافت اج...');
            }
            try {
                return await chromium.launch({ ...opts, channel: 'msedge' });
            } catch (_) {
                console.warn('[Playwright] مایکروسافت اج سیستم یافت نشد.');
            }
        }
        throw primaryErr;
    }
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
    launchPlaywrightChromium,
    createPortalContext,
    gotoPortalPage,
};
