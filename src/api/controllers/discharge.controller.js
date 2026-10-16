const path = require('path');
const fs = require('fs');
const dischargeService = require('../../features/discharge/discharge.service');
const permitService = require('../../features/permit/permit.service');
const UsersRepository = require('../../features/users/users.repository');
const ExportService = require('../../features/reports/export.service');
const { RESULTS_DIR } = require('../../config/paths');

class DischargeController {
    static async startDischarge(req, res) {
        try {
            const { username, headless } = req.body;
            const allUsers = await UsersRepository.getAllUsers();
            let targetUsers = [];

            if (!username || username === 'ALL') {
                targetUsers = allUsers.filter(u => (u.username || '').toLowerCase() !== 'admin' && (u.role || '').toLowerCase() !== 'admin');
            } else {
                const user = await UsersRepository.findByUsername(username);
                if (!user || (user.username || '').toLowerCase() === 'admin' || (user.role || '').toLowerCase() === 'admin') {
                    return res.status(404).json({ success: false, error: 'مرغدار مورد نظر یافت نشد.' });
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
    }

    // Helper to get report payload from body or disk
    static _getReportData(req) {
        const { reportData, filename } = req.body;
        if (reportData) return reportData;

        if (filename) {
            const filePath = path.join(RESULTS_DIR, path.basename(filename));
            if (fs.existsSync(filePath)) {
                return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
            }
        }

        const latestSummary = path.join(RESULTS_DIR, 'summary_latest.json');
        if (fs.existsSync(latestSummary)) {
            return JSON.parse(fs.readFileSync(latestSummary, 'utf-8'));
        }

        return [];
    }

    static async exportDischargeExcel(req, res) {
        try {
            const { includeNoArrival } = req.body;
            const data = DischargeController._getReportData(req);

            const buffer = await ExportService.exportDischargeToExcel(data, {
                includeNoArrival: includeNoArrival !== false,
            });

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="discharge_report_${timestamp}.xlsx"`);
            res.send(buffer);
        } catch (err) {
            console.error('Error exporting discharge report to Excel:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    }

    static async exportDischargePdf(req, res) {
        try {
            const { includeNoArrival } = req.body;
            const data = DischargeController._getReportData(req);

            const buffer = await ExportService.exportDischargeToPdf(data, {
                includeNoArrival: includeNoArrival !== false,
            });

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="discharge_report_${timestamp}.pdf"`);
            res.send(buffer);
        } catch (err) {
            console.error('Error exporting discharge report to PDF:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    }
}

module.exports = DischargeController;
