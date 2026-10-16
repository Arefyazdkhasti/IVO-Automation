const permitService = require('../../features/permit/permit.service');
const dischargeService = require('../../features/discharge/discharge.service');
const sseBroker = require('../sse');

class SystemController {
    static connectSSE(req, res) {
        sseBroker.addClient(req, res);
        // Send initial status
        res.write(`event: status\ndata: ${JSON.stringify({ status: permitService.currentStatus })}\n\n`);
    }

    static getStatus(req, res) {
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
    }

    static submitCaptcha(req, res) {
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
    }

    static skipCaptcha(req, res) {
        try {
            const handledPermit = permitService.skipCaptcha();
            const handledDischarge = dischargeService.skipCaptcha();

            if (!handledPermit && !handledDischarge) {
                return res.status(400).json({ success: false, error: 'سیستم در حال حاضر در انتظار کپچا نیست.' });
            }

            res.json({ success: true, message: 'کپچا با موفقیت رد شد.' });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    static async stopAutomation(req, res) {
        try {
            await permitService.stop();
            await dischargeService.stop();
            res.json({ success: true, message: 'عملیات متوقف شد.' });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
}

module.exports = SystemController;
