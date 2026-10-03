const express = require('express');
const router = express.Router();

const PermitController = require('./controllers/permit.controller');
const DischargeController = require('./controllers/discharge.controller');
const UsersController = require('./controllers/users.controller');
const ReportsController = require('./controllers/reports.controller');
const SystemController = require('./controllers/system.controller');

// Real-Time SSE Stream
router.get('/events', SystemController.connectSSE);

// System Status & Controls
router.get('/status', SystemController.getStatus);
router.post('/submit-captcha', SystemController.submitCaptcha);
router.post('/stop', SystemController.stopAutomation);

// ==========================================
// Admin & Entity Management Routes (CRUD)
// ==========================================

// Users Management
router.get('/users', UsersController.getUsers);
router.post('/users', UsersController.createUser);
router.put('/users/:username', UsersController.updateUser);
router.delete('/users/:username', UsersController.deleteUser);

// Slaughterhouses Management
router.get('/slaughterhouses', UsersController.getSlaughterhouses);
router.post('/slaughterhouses', UsersController.createSlaughterhouse);
router.put('/slaughterhouses/:code', UsersController.updateSlaughterhouse);
router.delete('/slaughterhouses/:code', UsersController.deleteSlaughterhouse);

// Tracking Codes Management
router.get('/codes', PermitController.getCodes);
router.post('/codes', PermitController.saveCodes);
router.post('/codes/add', PermitController.addCode);
router.delete('/codes/:code', PermitController.deleteCode);

// ==========================================
// Permit Issuance Operations & Exports
// ==========================================
router.get('/last-successful-code', PermitController.getLastSuccessfulCode);
router.post('/start', PermitController.startPermit);
router.get('/permits/session', PermitController.getSessionPermits);
router.delete('/permits/session', PermitController.clearSessionPermits);
router.post('/permits/export/excel', PermitController.exportPermitsExcel);
router.post('/permits/export/pdf', PermitController.exportPermitsPdf);

// ==========================================
// Discharge Verification Operations & Exports
// ==========================================
router.post('/discharge/start', DischargeController.startDischarge);
router.post('/discharge/export/excel', DischargeController.exportDischargeExcel);
router.post('/discharge/export/pdf', DischargeController.exportDischargePdf);

// Reports Archive
router.get('/reports', ReportsController.getReports);

module.exports = router;
