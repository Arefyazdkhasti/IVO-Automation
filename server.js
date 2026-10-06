require('dotenv').config();
const path = require('path');
const express = require('express');
const { PUBLIC_DIR } = require('./src/config/paths');
const { DEFAULTS } = require('./src/config/constants');
const sseBroker = require('./src/api/sse');
const apiRoutes = require('./src/api/routes');
const permitService = require('./src/features/permit/permit.service');
const dischargeService = require('./src/features/discharge/discharge.service');

const app = express();
const PORT = process.env.PORT || DEFAULTS.PORT;

// Middleware
app.use(express.json());
app.use(express.static(PUBLIC_DIR));

// Hook Permit Service events to SSE broadcast
permitService.on('log', (data) => sseBroker.broadcast('log', data));
permitService.on('status', (data) => sseBroker.broadcast('status', { service: 'permit', ...data }));
permitService.on('captcha_error', (data) => sseBroker.broadcast('captcha_error', data));
permitService.on('code_progress', (data) => sseBroker.broadcast('code_progress', data));
permitService.on('permit_issued', (data) => sseBroker.broadcast('permit_issued', data));

// Hook Discharge Service events to SSE broadcast
dischargeService.on('log', (data) => sseBroker.broadcast('log', data));
dischargeService.on('status', (data) => sseBroker.broadcast('status', { service: 'discharge', ...data }));
dischargeService.on('captcha_error', (data) => sseBroker.broadcast('captcha_error', data));
dischargeService.on('discharge_records_found', (data) => sseBroker.broadcast('discharge_records_found', data));
dischargeService.on('discharge_item_progress', (data) => sseBroker.broadcast('discharge_item_progress', data));

// Mount Central API Router
app.use('/api', apiRoutes);

// Client-Side Routing Fallback (SPA routing support for /login, /permits, /discharge, /admin, etc.)
app.use((req, res, next) => {
    if (req.method === 'GET' && !req.path.startsWith('/api')) {
        // Prevent returning HTML for missing static assets (images, css, js, fonts)
        if (req.path.includes('.') && !req.path.endsWith('.html')) {
            return res.status(404).end();
        }
        return res.sendFile(path.join(PUBLIC_DIR, 'index.html'));
    }
    next();
});

// Server Listen
app.listen(PORT, () => {
    console.log(`
======================================================`);
    console.log(`🚀 پنل اتوماسیون جامع دامپزشکی (IVO Automation) فعال شد!`);
    console.log(`🌐 آدرس دسترسی در مرورگر: http://localhost:${PORT}`);
    console.log(`======================================================
`);
});

module.exports = app;
