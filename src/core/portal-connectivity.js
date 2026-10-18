const https = require('https');
const os = require('os');
const { URL } = require('url');
const { URLS } = require('../config/constants');

const DEFAULT_TIMEOUT_MS = 20000;

/**
 * همان مسیر شبکه‌ای که Node/Playwright از داخل کانتینر استفاده می‌کند.
 * @param {string} targetUrl
 * @param {number} [timeoutMs]
 */
function probeHttpsUrl(targetUrl, timeoutMs = DEFAULT_TIMEOUT_MS) {
    return new Promise((resolve) => {
        const started = Date.now();
        let parsed;

        try {
            parsed = new URL(targetUrl);
        } catch (err) {
            resolve({
                reachable: false,
                latencyMs: 0,
                error: err.message,
                statusCode: null,
            });
            return;
        }

        const req = https.request(
            {
                protocol: parsed.protocol,
                hostname: parsed.hostname,
                port: parsed.port || 443,
                path: `${parsed.pathname}${parsed.search}`,
                method: 'GET',
                timeout: timeoutMs,
                headers: {
                    'User-Agent': 'IVO-Automation-Portal-Health/1.0',
                },
            },
            (res) => {
                res.resume();
                resolve({
                    reachable: true,
                    latencyMs: Date.now() - started,
                    error: null,
                    statusCode: res.statusCode,
                });
            },
        );

        req.on('timeout', () => {
            req.destroy();
            resolve({
                reachable: false,
                latencyMs: Date.now() - started,
                error: 'ETIMEDOUT',
                statusCode: null,
            });
        });

        req.on('error', (err) => {
            resolve({
                reachable: false,
                latencyMs: Date.now() - started,
                error: err.code || err.message,
                statusCode: null,
            });
        });

        req.end();
    });
}

async function checkPortalFromApp() {
    const url = URLS.LOGIN_URL;
    const result = await probeHttpsUrl(url);

    let hint;
    if (result.reachable) {
        hint = 'اتصال از همین سرور/کانتینر به درگاه برقرار است. اگر اتوماسیون خطا می‌دهد، موضوع جدا از شبکه است.';
    } else if (result.error === 'ETIMEDOUT' || String(result.error).includes('TIMEDOUT')) {
        hint =
            'تایم‌اوت به e.ivo.ir از داخل اپ. حتی اگر دیتاسنتر ایران باشد، فایروال خروجی، NAT، یا مسیر اپراتور می‌تواند 443 را ببندد. از ترمینال سرویس در Dokploy هم curl بزنید.';
    } else {
        hint = `خطای شبکه: ${result.error}. DNS یا TLS را هم بررسی کنید.`;
    }

    return {
        url,
        ...result,
        hint,
        checkedAt: new Date().toISOString(),
        server: {
            hostname: os.hostname(),
            nodeEnv: process.env.NODE_ENV || 'development',
        },
    };
}

module.exports = {
    probeHttpsUrl,
    checkPortalFromApp,
};
