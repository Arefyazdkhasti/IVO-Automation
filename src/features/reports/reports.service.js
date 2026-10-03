const fs = require('fs');
const path = require('path');
const { RESULTS_DIR } = require('../../config/paths');

class ReportsService {
    static getAllReports() {
        try {
            if (!fs.existsSync(RESULTS_DIR)) {
                return [];
            }
            const files = fs.readdirSync(RESULTS_DIR).filter((f) => f.endsWith('.json'));

            // Sort newest first based on file modification time
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
                    // skip unreadable/corrupted files
                }
            }
            return reports;
        } catch (err) {
            console.error('Error fetching reports:', err);
            return [];
        }
    }
}

module.exports = ReportsService;
