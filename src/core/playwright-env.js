/**
 * Headed Chromium needs a display (X11/Wayland). Docker and most Linux servers have none.
 */
function hasDisplayServer() {
    return Boolean(process.env.DISPLAY || process.env.WAYLAND_DISPLAY);
}

function serverRequiresHeadless() {
    if (process.env.PLAYWRIGHT_HEADLESS === 'true') return true;
    if (process.env.PLAYWRIGHT_HEADLESS === 'false') return false;
    // Xvfb / real display → headed launch is possible even in production
    if (hasDisplayServer()) return false;
    if (process.env.NODE_ENV === 'production') return true;
    if (process.platform === 'linux') return true;
    return false;
}

/**
 * @param {boolean | undefined} requested - from API/UI (true = headless)
 * @returns {{ headless: boolean, forcedHeadless: boolean }}
 */
function resolvePlaywrightHeadless(requested) {
    const mustHeadless = serverRequiresHeadless();
    if (mustHeadless) {
        return { headless: true, forcedHeadless: requested === false };
    }
    if (requested === undefined) {
        return { headless: false, forcedHeadless: false };
    }
    return { headless: !!requested, forcedHeadless: false };
}

module.exports = {
    hasDisplayServer,
    serverRequiresHeadless,
    resolvePlaywrightHeadless,
};
