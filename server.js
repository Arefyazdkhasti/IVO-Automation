const express = require('express');
const path = require('path');
const fs = require('fs');
const permitService = require('./permit_service');
const dischargeService = require('./discharge_service');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const USERS_FILE = path.join(__dirname, 'users.json');
const RESULTS_DIR = path.join(__dirname, 'results');

// Store active SSE clients
let sseClients = [];

function broadcastSSE(eventType, data) {
    const payload = `event: ${eventType}\ndata: ${JSON.stringify(data)}\n\n`;
    sseClients.forEach((client) => {
        try {
            client.res.write(payload);
        } catch (e) {
            // client disconnected
        }
    });
}

// Hook permitService events to SSE broadcast
permitService.on('log', (data) => broadcastSSE('log', data));
permitService.on('status', (data) => broadcastSSE('status', { service: 'permit', ...data }));
permitService.on('captcha_error', (data) => broadcastSSE('captcha_error', data));
permitService.on('code_progress', (data) => broadcastSSE('code_progress', data));

// Hook dischargeService events to SSE broadcast
dischargeService.on('log', (data) => broadcastSSE('log', data));
dischargeService.on('status', (data) => broadcastSSE('status', { service: 'discharge', ...data }));
dischargeService.on('captcha_error', (data) => broadcastSSE('captcha_error', data));
dischargeService.on('discharge_records_found', (data) => broadcastSSE('discharge_records_found', data));
dischargeService.on('discharge_item_progress', (data) => broadcastSSE('discharge_item_progress', data));

// SSE Endpoint
app.get('/api/events', (req, res) => {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const clientId = Date.now();
    const newClient = { id: clientId, res };
    sseClients.push(newClient);

    // Send initial status
    res.write(`event: status\ndata: ${JSON.stringify({ status: permitService.currentStatus })}\n\n`);

    req.on('close', () => {
        sseClients = sseClients.filter((c) => c.id !== clientId);
    });
});

// API: Get Users
app.get('/api/users', (req, res) => {
    try {
        if (fs.existsSync(USERS_FILE)) {
            const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
            return res.json({ success: true, users });
        }
        res.json({ success: true, users: [] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// API: Get Tracking Codes
app.get('/api/codes', (req, res) => {
    try {
        const codes = permitService.getTrackingCodes();
        res.json({ success: true, codes });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// API: Save Tracking Codes
app.post('/api/codes', (req, res) => {
    try {
        const { codes } = req.body;
        if (!Array.isArray(codes)) {
            return res.status(400).json({ success: false, error: 'لیست کدها باید آرایه باشد.' });
        }
        permitService.saveTrackingCodes(codes);
        res.json({ success: true, count: codes.length });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

const SLAUGHTERHOUSES_FILE = path.join(__dirname, 'slaughterhouses.json');

// API: Get Slaughterhouses
app.get('/api/slaughterhouses', (req, res) => {
    try {
        if (fs.existsSync(SLAUGHTERHOUSES_FILE)) {
            const list = JSON.parse(fs.readFileSync(SLAUGHTERHOUSES_FILE, 'utf-8'));
            return res.json({ success: true, slaughterhouses: list });
        }
        res.json({ success: true, slaughterhouses: [] });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// API: Get Last Successful Code
app.get('/api/last-successful-code', (req, res) => {
    try {
        const lastCodeFile = path.join(__dirname, 'last_successful_code.json');
        if (fs.existsSync(lastCodeFile)) {
            const data = JSON.parse(fs.readFileSync(lastCodeFile, 'utf-8'));
            return res.json({ success: true, data });
        }
        res.json({ success: true, data: null });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// API: Start Automation
app.post('/api/start', async (req, res) => {
    try {
        const { username, customCodes, headless, slaughterhouseCode, slaughterhouseName, quantity, breed, hatchingPermitCode } = req.body;
        if (!username) {
            return res.status(400).json({ success: false, error: 'نام کاربری الزامی است.' });
        }

        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
        const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());

        if (!user) {
            return res.status(404).json({ success: false, error: 'کاربر مورد نظر در users.json یافت نشد.' });
        }

        // Apply any overridden or newly provided details from UI
        if (breed) user.breed = breed;
        if (hatchingPermitCode) user.hatchingPermitCode = hatchingPermitCode;

        if (permitService.isRunning) {
            return res.status(400).json({ success: false, error: 'یک عملیات از قبل در حال اجرا است.' });
        }

        // Run asynchronously so the request returns immediately
        permitService.startPermitFlow(user, {
            customCodes,
            headless: !!headless,
            slaughterhouseCode,
            slaughterhouseName,
            quantity: quantity || '2000',
        }).catch((err) => {
            console.error('Workflow error:', err);
        });

        res.json({ success: true, message: `عملیات صدور مجوز برای ${user.name} آغاز شد.` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// API: Start Discharge Flow
app.post('/api/discharge/start', async (req, res) => {
    try {
        const { username, headless } = req.body;

        const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
        let targetUsers = [];

        if (!username || username === 'ALL') {
            targetUsers = users;
        } else {
            const user = users.find((u) => u.username.toLowerCase() === username.toLowerCase());
            if (!user) {
                return res.status(404).json({ success: false, error: 'کاربر مورد نظر یافت نشد.' });
            }
            targetUsers = [user];
        }

        if (dischargeService.isRunning || permitService.isRunning) {
            return res.status(400).json({ success: false, error: 'یک عملیات دیگر در حال حاضر در حال اجرا است.' });
        }

        dischargeService.startDischargeFlow(targetUsers, { headless: !!headless }).catch((err) => {
            console.error('Discharge error:', err);
        });

        const targetDesc = targetUsers.length > 1 ? `تمام ${targetUsers.length} مرغدار` : targetUsers[0].name;
        res.json({ success: true, message: `عملیات استعلام و تایید تخلیه برای ${targetDesc} آغاز شد.` });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// API: Get Reports List
app.get('/api/reports', (req, res) => {
    try {
        if (!fs.existsSync(RESULTS_DIR)) {
            return res.json({ success: true, reports: [] });
        }
        const files = fs.readdirSync(RESULTS_DIR).filter((f) => f.endsWith('.json'));

        // Sort newest first
        files.sort((a, b) => {
            const statA = fs.statSync(path.join(RESULTS_DIR, a));
            const statB = fs.statSync(path.join(RESULTS_DIR, b));
            return statB.mtimeMs - statA.mtimeMs;
        });

        const reports = [];
        for (const file of files) {
            try {
                const raw = fs.readFileSync(path.join(RESULTS_DIR, file), 'utf-8');
                const content = JSON.parse(raw);
                if (Array.isArray(content)) {
                    const totalDischarged = content.reduce((sum, r) => sum + (r.stats?.totalDischarged || 0), 0);
                    const totalNoArrival = content.reduce((sum, r) => sum + (r.stats?.totalNoArrival || 0), 0);
                    const totalChecked = content.reduce((sum, r) => sum + (r.stats?.totalChecked || 0), 0);
                    reports.push({
                        filename: file,
                        isSummary: true,
                        summaryList: content,
                        executionTimestamp: content[0]?.executionTimestamp || new Date().toISOString(),
                        stats: { totalDischarged, totalNoArrival, totalChecked },
                    });
                } else {
                    reports.push({ filename: file, isSummary: false, ...content });
                }
            } catch (e) {
                // skip unreadable
            }
        }
        res.json({ success: true, reports });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// API: Submit Captcha Code (supports both services)
app.post('/api/submit-captcha', (req, res) => {
    try {
        const { captchaCode } = req.body;
        if (!captchaCode) {
            return res.status(400).json({ success: false, error: 'کد کپچا الزامی است.' });
        }

        const handledPermit = permitService.submitCaptcha(captchaCode);
        const handledDischarge = dischargeService.submitCaptcha(captchaCode);

        if (!handledPermit && !handledDischarge) {
            return res.status(400).json({ success: false, error: 'سیستم در انتظار کپچا نیست.' });
        }

        res.json({ success: true, message: 'کپچا دریافت شد.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// API: Stop Automation (supports both services)
app.post('/api/stop', async (req, res) => {
    try {
        await permitService.stop();
        await dischargeService.stop();
        res.json({ success: true, message: 'عملیات متوقف شد.' });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// API: Current Status
app.get('/api/status', (req, res) => {
    res.json({
        success: true,
        permit: {
            status: permitService.currentStatus,
            isRunning: permitService.isRunning,
        },
        discharge: {
            status: dischargeService.currentStatus,
            isRunning: dischargeService.isRunning,
        },
        isRunning: permitService.isRunning || dischargeService.isRunning,
    });
});

app.listen(PORT, () => {
    console.log(`\n======================================================`);
    console.log(`🚀 پنل اتوماسیون صدور مجوز دامپزشکی فعال شد!`);
    console.log(`🌐 آدرس دسترسی در مرورگر: http://localhost:${PORT}`);
    console.log(`======================================================\n`);
});
