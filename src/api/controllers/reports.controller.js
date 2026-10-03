const ReportsService = require('../../features/reports/reports.service');

class ReportsController {
    static getReports(req, res) {
        try {
            const reports = ReportsService.getAllReports();
            res.json({ success: true, reports });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
}

module.exports = ReportsController;
