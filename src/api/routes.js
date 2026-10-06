const express = require('express');
const router = express.Router();

const PermitController = require('./controllers/permit.controller');
const DischargeController = require('./controllers/discharge.controller');
const UsersController = require('./controllers/users.controller');
const ReportsController = require('./controllers/reports.controller');
const SystemController = require('./controllers/system.controller');
const AuthController = require('./controllers/auth.controller');
const { requireAuth } = require('./middleware/auth.middleware');

// Real-Time SSE Stream
router.get('/events', SystemController.connectSSE);

// System Status & Controls
router.get('/status', SystemController.getStatus);
router.post('/submit-captcha', requireAuth, SystemController.submitCaptcha);
router.post('/stop', requireAuth, SystemController.stopAutomation);

// ==========================================
// Authentication Routes (Device Fingerprint & Auth)
// ==========================================
router.post('/auth/login', AuthController.login);
router.get('/auth/me', AuthController.getMe);
router.post('/auth/logout', AuthController.logout);
router.post('/auth/register-farmer', AuthController.registerFarmer);
router.post('/users/:username/reset-device', requireAuth, AuthController.resetDeviceLock);

// ==========================================
// Admin & Entity Management Routes (CRUD)
// ==========================================

// Database & Supabase Integration
router.get('/database/status', UsersController.getDatabaseStatus);
router.post('/database/sync', requireAuth, UsersController.syncToSupabase);

// Users Management
router.get('/users', requireAuth, UsersController.getUsers);
router.post('/users', requireAuth, UsersController.createUser);
router.put('/users/:username', requireAuth, UsersController.updateUser);
router.delete('/users/:username', requireAuth, UsersController.deleteUser);

// Slaughterhouses Management
router.get('/slaughterhouses', UsersController.getSlaughterhouses);
router.post('/slaughterhouses', requireAuth, UsersController.createSlaughterhouse);
router.put('/slaughterhouses/:code', requireAuth, UsersController.updateSlaughterhouse);
router.delete('/slaughterhouses/:code', requireAuth, UsersController.deleteSlaughterhouse);

// Tracking Codes Management
router.get('/codes', PermitController.getCodes);
router.post('/codes', requireAuth, PermitController.saveCodes);
router.post('/codes/add', requireAuth, PermitController.addCode);
router.delete('/codes/:code', requireAuth, PermitController.deleteCode);

// ==========================================
// Permit Issuance Operations & Exports
// ==========================================
router.get('/last-successful-code', PermitController.getLastSuccessfulCode);
router.post('/start', requireAuth, PermitController.startPermit);
router.get('/permits/session', PermitController.getSessionPermits);
router.delete('/permits/session', requireAuth, PermitController.clearSessionPermits);
router.post('/permits/export/excel', PermitController.exportPermitsExcel);
router.post('/permits/export/pdf', PermitController.exportPermitsPdf);

// ==========================================
// Discharge Verification Operations & Exports
// ==========================================
router.post('/discharge/start', requireAuth, DischargeController.startDischarge);
router.post('/discharge/export/excel', DischargeController.exportDischargeExcel);
router.post('/discharge/export/pdf', DischargeController.exportDischargePdf);

// Reports Archive
router.get('/reports', ReportsController.getReports);

module.exports = router;
