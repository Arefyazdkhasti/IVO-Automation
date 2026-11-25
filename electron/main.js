const { app, BrowserWindow, shell, ipcMain, dialog, Menu } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');
const { spawn } = require('child_process');

// 1. Single Instance Lock
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
    app.quit();
    process.exit(0);
}

let mainWindow = null;
let serverInstance = null;
let activePort = 3000;

// 2. Prepare User Data Directories & Seeds
const userDataPath = app.getPath('userData');
const appDataDir = path.join(userDataPath, 'data');
const appResultsDir = path.join(userDataPath, 'results');

if (!fs.existsSync(appDataDir)) {
    fs.mkdirSync(appDataDir, { recursive: true });
}
if (!fs.existsSync(appResultsDir)) {
    fs.mkdirSync(appResultsDir, { recursive: true });
}

// Copy default data files to userData if they don't exist yet
const bundledDataDir = path.join(__dirname, '..', 'data');
if (fs.existsSync(bundledDataDir)) {
    try {
        const files = fs.readdirSync(bundledDataDir);
        for (const file of files) {
            const dest = path.join(appDataDir, file);
            const src = path.join(bundledDataDir, file);
            if (!fs.existsSync(dest) && fs.statSync(src).isFile()) {
                fs.copyFileSync(src, dest);
                console.log(`[Electron] Initialized seed data file: ${file}`);
            }
        }
    } catch (err) {
        console.error('[Electron] Error initializing seed data files:', err);
    }
}

// Set environment variables for Express & Services
process.env.DATA_DIR = appDataDir;
process.env.RESULTS_DIR = appResultsDir;
process.env.IS_ELECTRON = 'true';
process.env.AUTO_START_SERVER = 'false'; // prevent auto-start on require
process.env.HOST = '127.0.0.1';

/**
 * Finds an available port starting from preferredPort
 */
function getAvailablePort(preferredPort) {
    return new Promise((resolve) => {
        const testServer = net.createServer();
        testServer.once('error', () => {
            resolve(getAvailablePort(preferredPort + 1));
        });
        testServer.once('listening', () => {
            testServer.close(() => resolve(preferredPort));
        });
        testServer.listen(preferredPort, '127.0.0.1');
    });
}

/**
 * Creates the primary application window
 */
function createMainWindow(port) {
    const iconPath = path.join(__dirname, 'icon.png');

    mainWindow = new BrowserWindow({
        width: 1280,
        height: 860,
        minWidth: 1024,
        minHeight: 700,
        title: 'سامانه اتوماسیون جامع دامپزشکی (IVO Automation)',
        backgroundColor: '#0d0f12',
        show: false,
        icon: fs.existsSync(iconPath) ? iconPath : undefined,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, 'preload.js'),
        },
    });

    const appUrl = `http://127.0.0.1:${port}`;
    mainWindow.loadURL(appUrl);

    mainWindow.once('ready-to-show', () => {
        mainWindow.show();
    });

    // Handle external links (open in default browser instead of electron window)
    mainWindow.webContents.setWindowOpenHandler(({ url }) => {
        if (url.startsWith('http:') || url.startsWith('https:')) {
            shell.openExternal(url);
            return { action: 'deny' };
        }
        return { action: 'allow' };
    });

    mainWindow.on('closed', () => {
        mainWindow = null;
    });
}

/**
 * Sets up custom application menus
 */
function buildAppMenu() {
    const isMac = process.platform === 'darwin';

    const template = [
        ...(isMac ? [{
            label: 'اتوماسیون دامپزشکی',
            submenu: [
                { role: 'about', label: 'درباره سامانه' },
                { type: 'separator' },
                { role: 'services', label: 'خدمات' },
                { type: 'separator' },
                { role: 'hide', label: 'مخفی کردن' },
                { role: 'hideOthers', label: 'مخفی کردن بقیه' },
                { role: 'unhide', label: 'نمایش همه' },
                { type: 'separator' },
                { role: 'quit', label: 'خروج از برنامه' },
            ]
        }] : []),
        {
            label: 'پرونده',
            submenu: [
                {
                    label: 'باز کردن پوشه داده‌ها (تنظیمات و کدهای رهگیری)',
                    accelerator: 'CmdOrCtrl+D',
                    click: () => shell.openPath(appDataDir),
                },
                {
                    label: 'باز کردن پوشه گزارش‌ها و خروجی‌ها',
                    accelerator: 'CmdOrCtrl+R',
                    click: () => shell.openPath(appResultsDir),
                },
                { type: 'separator' },
                isMac ? { role: 'close', label: 'بستن پنجره' } : { role: 'quit', label: 'خروج' },
            ],
        },
        {
            label: 'ویرایش',
            submenu: [
                { role: 'undo', label: 'واگرد (Undo)' },
                { role: 'redo', label: 'انجام مجدد (Redo)' },
                { type: 'separator' },
                { role: 'cut', label: 'برش (Cut)' },
                { role: 'copy', label: 'کپی (Copy)' },
                { role: 'paste', label: 'چسباندن (Paste)' },
                { role: 'selectAll', label: 'انتخاب همه' },
            ],
        },
        {
            label: 'نمایش',
            submenu: [
                { role: 'reload', label: 'بارگذاری مجدد (Reload)' },
                { role: 'forceReload', label: 'بارگذاری مجدد کامل' },
                { role: 'toggleDevTools', label: 'ابزارهای توسعه‌دهنده (DevTools)' },
                { type: 'separator' },
                { role: 'resetZoom', label: 'اندازه پیش‌فرض (۱۰۰٪)' },
                { role: 'zoomIn', label: 'بزرگ‌نمایی' },
                { role: 'zoomOut', label: 'کوچک‌نمایی' },
                { type: 'separator' },
                { role: 'togglefullscreen', label: 'حالت تمام‌صفحه' },
            ],
        },
        {
            label: 'راهنما',
            submenu: [
                {
                    label: 'نصب / بروزرسانی مرورگر Playwright',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'بررسی مرورگر Playwright',
                            message: 'در حال نصب یا بروزرسانی مرورگر Playwright...',
                            detail: 'برنامه در صورت عدم نصب Playwright، به‌صورت خودکار از مرورگر Google Chrome یا Microsoft Edge سیستم شما استفاده می‌کند.',
                            buttons: ['شروع دانلود مرورگر', 'انصراف'],
                        }).then(({ response }) => {
                            if (response === 0) {
                                installPlaywrightBrowser();
                            }
                        });
                    },
                },
                { type: 'separator' },
                {
                    label: 'درباره سامانه اتوماسیون دامپزشکی',
                    click: () => {
                        dialog.showMessageBox(mainWindow, {
                            type: 'info',
                            title: 'سامانه اتوماسیون جامع دامپزشکی',
                            message: 'نسخه ۱.۰.۰ (IVO Automation)',
                            detail: 'سیستم هوشمند صدور پروانه حمل بهداشتی و تایید تخلیه گواهی‌ها\nطراحی و پیاده‌سازی اختصاصی با فریمورک Electron و Playwright',
                            buttons: ['تایید'],
                        });
                    },
                },
            ],
        },
    ];

    const menu = Menu.buildFromTemplate(template);
    Menu.setApplicationMenu(menu);
}

/**
 * Downloads Playwright Chromium if requested
 */
function installPlaywrightBrowser() {
    const proc = spawn('npx', ['playwright', 'install', 'chromium'], {
        shell: true,
        stdio: 'inherit',
    });

    proc.on('close', (code) => {
        if (code === 0) {
            dialog.showMessageBox(mainWindow, {
                type: 'info',
                title: 'تکمیل عملیات',
                message: 'مرورگر Playwright با موفقیت دانلود و نصب شد.',
            });
        } else {
            dialog.showMessageBox(mainWindow, {
                type: 'warning',
                title: 'خطا در نصب',
                message: `کد خطای ${code} رخ داد.`,
                detail: 'نگران نباشید؛ برنامه همچنان می‌تواند از Chrome یا Edge سیستم شما استفاده کند.',
            });
        }
    });
}

// IPC Handlers
ipcMain.on('open-data-folder', () => shell.openPath(appDataDir));
ipcMain.on('open-results-folder', () => shell.openPath(appResultsDir));
ipcMain.handle('get-app-version', () => app.getVersion());

// Handle single instance focus
app.on('second-instance', () => {
    if (mainWindow) {
        if (mainWindow.isMinimized()) mainWindow.restore();
        mainWindow.focus();
    }
});

// App Lifecycle
app.whenReady().then(async () => {
    try {
        buildAppMenu();

        // Find available port (prefer 3000, 3002, etc.)
        activePort = await getAvailablePort(Number(process.env.PORT) || 3000);
        process.env.PORT = String(activePort);

        // Require and start Express server
        const { startServer } = require('../server');
        serverInstance = await startServer(activePort, '127.0.0.1');

        createMainWindow(activePort);

        app.on('activate', () => {
            if (BrowserWindow.getAllWindows().length === 0) {
                createMainWindow(activePort);
            }
        });
    } catch (err) {
        console.error('[Electron] Error during startup:', err);
        dialog.showErrorBox('خطای راه‌اندازی برنامه', `سرور داخلی نتوانست اجرا شود:\n${err.message}`);
        app.quit();
    }
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});

app.on('before-quit', async () => {
    if (serverInstance) {
        const { stopServer } = require('../server');
        await stopServer().catch(() => {});
    }
});
