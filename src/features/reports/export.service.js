const ExcelJS = require('exceljs');
const { chromium } = require('playwright');

class ExportService {
    // ==========================================
    // 1. Permits Issuance Exports (Excel & PDF)
    // ==========================================

    /**
     * Generate Excel for Issued Permits
     * @param {Array} permits 
     * @returns {Promise<Buffer>}
     */
    static async exportPermitsToExcel(permits = []) {
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'سامانه اتوماسیون جامع دامپزشکی (IVO)';
        workbook.created = new Date();

        const sheet = workbook.addWorksheet('مجوزهای صادر شده', {
            views: [{ rightToLeft: true }]
        });

        // Setup columns
        sheet.columns = [
            { header: 'ردیف', key: 'index', width: 8 },
            { header: 'تاریخ و زمان صدور', key: 'dateFa', width: 22 },
            { header: 'نام مرغدار', key: 'farmerName', width: 20 },
            { header: 'نام کاربری', key: 'farmerUsername', width: 14 },
            { header: 'کد رهگیری خودرو', key: 'trackingCode', width: 16 },
            { header: 'کشتارگاه مقصد', key: 'slaughterhouse', width: 26 },
            { header: 'تعداد قطعه', key: 'quantity', width: 14 },
            { header: 'نژاد گله', key: 'breed', width: 14 },
            { header: 'کد اپیدمیولوژیک', key: 'epidemiologicCode', width: 18 },
            { header: 'مجوز جوجه‌ریزی', key: 'hatchingPermitCode', width: 18 },
            { header: 'وضعیت صدور', key: 'status', width: 18 },
        ];

        // Style Header Row
        const headerRow = sheet.getRow(1);
        headerRow.height = 28;
        headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Tahoma' };
        headerRow.fill = {
            type: 'pattern',
            pattern: 'solid',
            fgColor: { argb: 'FF990000' } // Acura Crimson Red
        };
        headerRow.alignment = { vertical: 'middle', horizontal: 'center' };

        // Add Data Rows
        permits.forEach((item, idx) => {
            const row = sheet.addRow({
                index: idx + 1,
                dateFa: item.dateFa || new Date(item.timestamp).toLocaleString('fa-IR'),
                farmerName: item.farmerName || item.name || '-',
                farmerUsername: item.farmerUsername || item.username || '-',
                trackingCode: item.trackingCode || '-',
                slaughterhouse: item.slaughterhouse || '-',
                quantity: item.quantity || '2000',
                breed: item.breed || 'راس',
                epidemiologicCode: item.epidemiologicCode || '-',
                hatchingPermitCode: item.hatchingPermitCode || '-',
                status: item.status || 'صادر شده (موفق)',
            });

            row.height = 24;
            row.alignment = { vertical: 'middle', horizontal: 'center' };
            row.font = { name: 'Tahoma', size: 10 };

            // Zebra striping
            if (idx % 2 === 1) {
                row.fill = {
                    type: 'pattern',
                    pattern: 'solid',
                    fgColor: { argb: 'FFF5F5F5' }
                };
            }
        });

        // Add border to all cells
        sheet.eachRow((row) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                    left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                    bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                    right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
                };
            });
        });

        return await workbook.xlsx.writeBuffer();
    }

    /**
     * Generate PDF for Issued Permits
     * @param {Array} permits 
     * @returns {Promise<Buffer>}
     */
    static async exportPermitsToPdf(permits = []) {
        const currentDateFa = new Intl.DateTimeFormat('fa-IR-u-nu-latn', { dateStyle: 'full', timeStyle: 'short' }).format(new Date());
        
        let rowsHtml = '';
        permits.forEach((item, idx) => {
            rowsHtml += `
                <tr>
                    <td style="text-align: center;">${idx + 1}</td>
                    <td>${item.farmerName || '-'} <br><small style="color: #666;">(${item.farmerUsername || '-'})</small></td>
                    <td style="font-family: monospace; font-weight: bold; text-align: center;">${item.trackingCode || '-'}</td>
                    <td>${item.slaughterhouse || '-'}</td>
                    <td style="text-align: center;">${item.quantity || '2000'}</td>
                    <td style="text-align: center;">${item.breed || 'راس'}</td>
                    <td style="font-family: monospace; text-align: center;">${item.hatchingPermitCode || '-'}</td>
                    <td style="text-align: center;"><span class="badge success">موفق</span></td>
                </tr>
            `;
        });

        const html = `
        <!DOCTYPE html>
        <html lang="fa" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <style>
                @page { size: A4 landscape; margin: 15mm; }
                body {
                    font-family: Tahoma, 'Vazirmatn', sans-serif;
                    direction: rtl;
                    color: #222;
                    margin: 0;
                    padding: 0;
                    font-size: 11px;
                }
                .header {
                    border-bottom: 2px solid #cc0000;
                    padding-bottom: 10px;
                    margin-bottom: 15px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .title { font-size: 16px; font-weight: bold; color: #cc0000; }
                .subtitle { font-size: 11px; color: #555; margin-top: 4px; }
                .meta { text-align: left; font-size: 10px; color: #666; }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }
                th {
                    background-color: #222;
                    color: #fff;
                    padding: 8px 6px;
                    font-size: 10.5px;
                    border: 1px solid #333;
                }
                td {
                    padding: 7px 6px;
                    border: 1px solid #ddd;
                }
                tr:nth-child(even) { background-color: #f9f9f9; }
                .badge {
                    padding: 3px 8px;
                    border-radius: 3px;
                    font-size: 9.5px;
                    font-weight: bold;
                }
                .badge.success { background: #dcfce7; color: #15803d; }
                .footer {
                    margin-top: 20px;
                    text-align: center;
                    font-size: 9px;
                    color: #888;
                    border-top: 1px solid #eee;
                    padding-top: 8px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <div class="title">گزارش رسمی مجوزهای صادر شده حمل طیور به کشتارگاه</div>
                    <div class="subtitle">سامانه جامع اتوماسیون دامپزشکی (IVO Automation)</div>
                </div>
                <div class="meta">
                    <div>تاریخ تهیه گزارش: ${currentDateFa}</div>
                    <div>تعداد پروانه‌های این گزارش: ${permits.length} پروانه</div>
                </div>
            </div>

            <table>
                <thead>
                    <tr>
                        <th style="width: 35px;">#</th>
                        <th>نام مرغدار و نام کاربری</th>
                        <th>کد رهگیری خودرو</th>
                        <th>کشتارگاه مقصد</th>
                        <th style="width: 70px;">تعداد قطعه</th>
                        <th style="width: 65px;">نژاد گله</th>
                        <th>مجوز جوجه‌ریزی</th>
                        <th style="width: 65px;">وضعیت</th>
                    </tr>
                </thead>
                <tbody>
                    ${rowsHtml || '<tr><td colspan="8" style="text-align: center; padding: 20px;">هیچ مجوزی در این نشست یافت نشد.</td></tr>'}
                </tbody>
            </table>

            <div class="footer">
                این گزارش به صورت خودکار توسط سامانه اتوماسیون دامپزشکی تولید شده است و به عنوان مستند رسمی حمل و ترابری قابل استناد است.
            </div>
        </body>
        </html>
        `;

        return await this.renderHtmlToPdf(html, 'landscape');
    }

    // ==========================================
    // 2. Discharge & Clearance Exports (Excel & PDF)
    // ==========================================

    /**
     * Generate Excel for Discharge Verification
     * @param {Array|Object} reportData 
     * @param {Object} options { includeNoArrival: boolean }
     * @returns {Promise<Buffer>}
     */
    static async exportDischargeToExcel(reportData, options = {}) {
        const includeNoArrival = options.includeNoArrival !== undefined ? options.includeNoArrival : true;
        const workbook = new ExcelJS.Workbook();
        workbook.creator = 'سامانه اتوماسیون جامع دامپزشکی (IVO)';
        workbook.created = new Date();

        // Normalize reportData to an array of user reports
        const reportsList = Array.isArray(reportData) ? reportData : [reportData];

        // Collect all discharged records and no-arrival records
        const allDischarged = [];
        const allNoArrival = [];

        reportsList.forEach((rep) => {
            const userName = rep.user || rep.farmerName || rep.username || 'مرغدار';
            const userCode = rep.username || '';

            if (Array.isArray(rep.dischargedRecords)) {
                rep.dischargedRecords.forEach((item) => {
                    allDischarged.push({
                        userName,
                        userCode,
                        trackingCode: item.trackingCode || '-',
                        creationDate: item.creationDate || '-',
                        dischargeDateSet: item.dischargeDateSet || '-',
                        reportType: item.reportType || '-',
                        status: item.status || 'تایید تخلیه با موفقیت ثبت شد',
                    });
                });
            }

            if (Array.isArray(rep.noArrivalRecords)) {
                rep.noArrivalRecords.forEach((item) => {
                    allNoArrival.push({
                        userName,
                        userCode,
                        trackingCode: item.trackingCode || '-',
                        creationDate: item.creationDate || '-',
                        source: item.source || '-',
                        destination: item.destination || '-',
                        status: 'عدم وصول (در انتظار تخلیه)',
                    });
                });
            }
        });

        // SHEET 1: Discharged Records
        const sheet1 = workbook.addWorksheet('تایید تخلیه شده‌ها', {
            views: [{ rightToLeft: true }]
        });

        sheet1.columns = [
            { header: 'ردیف', key: 'idx', width: 8 },
            { header: 'نام مرغدار', key: 'userName', width: 20 },
            { header: 'نام کاربری', key: 'userCode', width: 14 },
            { header: 'کد رهگیری گواهی', key: 'trackingCode', width: 18 },
            { header: 'تاریخ و ساعت صدور', key: 'creationDate', width: 20 },
            { header: 'تاریخ ثبت تخلیه', key: 'dischargeDateSet', width: 16 },
            { header: 'نوع گزارش', key: 'reportType', width: 24 },
            { header: 'وضعیت نهایی', key: 'status', width: 26 },
        ];

        const h1 = sheet1.getRow(1);
        h1.height = 28;
        h1.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Tahoma' };
        h1.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF15803D' } }; // Green
        h1.alignment = { vertical: 'middle', horizontal: 'center' };

        allDischarged.forEach((item, i) => {
            const row = sheet1.addRow({
                idx: i + 1,
                ...item
            });
            row.height = 24;
            row.alignment = { vertical: 'middle', horizontal: 'center' };
            row.font = { name: 'Tahoma', size: 10 };
            if (i % 2 === 1) {
                row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
            }
        });

        sheet1.eachRow((row) => {
            row.eachCell((cell) => {
                cell.border = {
                    top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                    left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                    bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                    right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
                };
            });
        });

        // SHEET 2: No-Arrival Records (Only if includeNoArrival is true)
        if (includeNoArrival) {
            const sheet2 = workbook.addWorksheet('موارد عدم وصول (تخلیه نشده)', {
                views: [{ rightToLeft: true }]
            });

            sheet2.columns = [
                { header: 'ردیف', key: 'idx', width: 8 },
                { header: 'نام مرغدار', key: 'userName', width: 20 },
                { header: 'نام کاربری', key: 'userCode', width: 14 },
                { header: 'کد رهگیری گواهی', key: 'trackingCode', width: 18 },
                { header: 'تاریخ صدور گواهی', key: 'creationDate', width: 20 },
                { header: 'مبدأ محموله', key: 'source', width: 24 },
                { header: 'مقصد محموله', key: 'destination', width: 24 },
                { header: 'وضعیت', key: 'status', width: 22 },
            ];

            const h2 = sheet2.getRow(1);
            h2.height = 28;
            h2.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Tahoma' };
            h2.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFB45309' } }; // Amber/Orange
            h2.alignment = { vertical: 'middle', horizontal: 'center' };

            allNoArrival.forEach((item, i) => {
                const row = sheet2.addRow({
                    idx: i + 1,
                    ...item
                });
                row.height = 24;
                row.alignment = { vertical: 'middle', horizontal: 'center' };
                row.font = { name: 'Tahoma', size: 10 };
                if (i % 2 === 1) {
                    row.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFF5F5F5' } };
                }
            });

            sheet2.eachRow((row) => {
                row.eachCell((cell) => {
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        left: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        bottom: { style: 'thin', color: { argb: 'FFE0E0E0' } },
                        right: { style: 'thin', color: { argb: 'FFE0E0E0' } }
                    };
                });
            });
        }

        return await workbook.xlsx.writeBuffer();
    }

    /**
     * Generate PDF for Discharge Verification
     * @param {Array|Object} reportData 
     * @param {Object} options { includeNoArrival: boolean }
     * @returns {Promise<Buffer>}
     */
    static async exportDischargeToPdf(reportData, options = {}) {
        const includeNoArrival = options.includeNoArrival !== undefined ? options.includeNoArrival : true;
        const currentDateFa = new Intl.DateTimeFormat('fa-IR-u-nu-latn', { dateStyle: 'full', timeStyle: 'short' }).format(new Date());

        const reportsList = Array.isArray(reportData) ? reportData : [reportData];
        const allDischarged = [];
        const allNoArrival = [];

        reportsList.forEach((rep) => {
            const userName = rep.user || rep.farmerName || rep.username || 'مرغدار';
            const userCode = rep.username || '';

            if (Array.isArray(rep.dischargedRecords)) {
                rep.dischargedRecords.forEach((item) => {
                    allDischarged.push({ userName, userCode, ...item });
                });
            }

            if (Array.isArray(rep.noArrivalRecords)) {
                rep.noArrivalRecords.forEach((item) => {
                    allNoArrival.push({ userName, userCode, ...item });
                });
            }
        });

        let dischargedRowsHtml = '';
        allDischarged.forEach((item, idx) => {
            dischargedRowsHtml += `
                <tr>
                    <td style="text-align: center;">${idx + 1}</td>
                    <td>${item.userName} <small style="color: #666;">(${item.userCode})</small></td>
                    <td style="font-family: monospace; font-weight: bold; text-align: center;">${item.trackingCode || '-'}</td>
                    <td style="text-align: center;">${item.creationDate || '-'}</td>
                    <td style="text-align: center; color: #15803d; font-weight: bold;">${item.dischargeDateSet || '-'}</td>
                    <td>${item.reportType || '-'}</td>
                    <td style="text-align: center;"><span class="badge success">تایید شده</span></td>
                </tr>
            `;
        });

        let noArrivalSectionHtml = '';
        if (includeNoArrival) {
            let noArrivalRowsHtml = '';
            allNoArrival.forEach((item, idx) => {
                noArrivalRowsHtml += `
                    <tr>
                        <td style="text-align: center;">${idx + 1}</td>
                        <td>${item.userName} <small style="color: #666;">(${item.userCode})</small></td>
                        <td style="font-family: monospace; font-weight: bold; text-align: center;">${item.trackingCode || '-'}</td>
                        <td style="text-align: center;">${item.creationDate || '-'}</td>
                        <td>${item.source || '-'}</td>
                        <td>${item.destination || '-'}</td>
                        <td style="text-align: center;"><span class="badge warning">عدم وصول</span></td>
                    </tr>
                `;
            });

            noArrivalSectionHtml = `
                <div style="margin-top: 30px;">
                    <div style="font-size: 13px; font-weight: bold; color: #b45309; margin-bottom: 8px;">
                        ⚠️ لیست موارد عدم وصول (در انتظار تخلیه) - تعداد: ${allNoArrival.length} مورد
                    </div>
                    <table>
                        <thead>
                            <tr style="background: #78350f;">
                                <th style="width: 35px;">#</th>
                                <th>نام مرغدار</th>
                                <th>کد رهگیری گواهی</th>
                                <th>تاریخ صدور</th>
                                <th>مبدأ</th>
                                <th>مقصد</th>
                                <th style="width: 70px;">وضعیت</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${noArrivalRowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 15px;">موردی یافت نشد.</td></tr>'}
                        </tbody>
                    </table>
                </div>
            `;
        }

        const html = `
        <!DOCTYPE html>
        <html lang="fa" dir="rtl">
        <head>
            <meta charset="UTF-8">
            <style>
                @page { size: A4 landscape; margin: 15mm; }
                body {
                    font-family: Tahoma, 'Vazirmatn', sans-serif;
                    direction: rtl;
                    color: #222;
                    margin: 0;
                    padding: 0;
                    font-size: 11px;
                }
                .header {
                    border-bottom: 2px solid #15803d;
                    padding-bottom: 10px;
                    margin-bottom: 15px;
                    display: flex;
                    justify-content: space-between;
                    align-items: center;
                }
                .title { font-size: 16px; font-weight: bold; color: #15803d; }
                .subtitle { font-size: 11px; color: #555; margin-top: 4px; }
                .meta { text-align: left; font-size: 10px; color: #666; }
                .stats-bar {
                    display: flex;
                    gap: 15px;
                    margin-bottom: 15px;
                    background: #f8fafc;
                    border: 1px solid #e2e8f0;
                    padding: 8px 12px;
                    border-radius: 4px;
                }
                .stat-item { font-size: 11px; }
                .stat-item strong { color: #0f172a; }
                table {
                    width: 100%;
                    border-collapse: collapse;
                    margin-top: 10px;
                }
                th {
                    background-color: #14532d;
                    color: #fff;
                    padding: 7px 6px;
                    font-size: 10.5px;
                    border: 1px solid #166534;
                }
                td {
                    padding: 6px 6px;
                    border: 1px solid #ddd;
                }
                tr:nth-child(even) { background-color: #f9f9f9; }
                .badge {
                    padding: 3px 8px;
                    border-radius: 3px;
                    font-size: 9.5px;
                    font-weight: bold;
                }
                .badge.success { background: #dcfce7; color: #15803d; }
                .badge.warning { background: #fef3c7; color: #b45309; }
                .footer {
                    margin-top: 25px;
                    text-align: center;
                    font-size: 9px;
                    color: #888;
                    border-top: 1px solid #eee;
                    padding-top: 8px;
                }
            </style>
        </head>
        <body>
            <div class="header">
                <div>
                    <div class="title">گزارش استعلام و ثبت تایید تخلیه گواهی‌های حمل دامپزشکی</div>
                    <div class="subtitle">سازمان دامپزشکی کشور - گزارش تخلیه به تفکیک خودرو و باسکول کشتارگاه</div>
                </div>
                <div class="meta">
                    <div>تاریخ تهیه گزارش: ${currentDateFa}</div>
                    <div>فیلتر عدم وصول: ${includeNoArrival ? 'شامل موارد عدم وصول' : 'فقط تایید تخلیه شده‌ها'}</div>
                </div>
            </div>

            <div class="stats-bar">
                <div class="stat-item">✅ مجموع تایید تخلیه شده‌ها: <strong>${allDischarged.length} مورد</strong></div>
                ${includeNoArrival ? `<div class="stat-item">⚠️ مجموع موارد عدم وصول: <strong>${allNoArrival.length} مورد</strong></div>` : ''}
            </div>

            <div style="font-size: 13px; font-weight: bold; color: #15803d; margin-bottom: 8px;">
                ✅ لیست محموله‌های تایید تخلیه شده
            </div>
            <table>
                <thead>
                    <tr>
                        <th style="width: 35px;">#</th>
                        <th>نام مرغدار</th>
                        <th>کد رهگیری گواهی</th>
                        <th>تاریخ صدور</th>
                        <th>تاریخ ثبت تخلیه</th>
                        <th>نوع گزارش</th>
                        <th style="width: 70px;">وضعیت</th>
                    </tr>
                </thead>
                <tbody>
                    ${dischargedRowsHtml || '<tr><td colspan="7" style="text-align: center; padding: 15px;">هیچ مورد تایید تخلیه‌ای ثبت نشده است.</td></tr>'}
                </tbody>
            </table>

            ${noArrivalSectionHtml}

            <div class="footer">
                این گزارش حاصل پردازش خودکار کارتابل‌های دامپزشکی کشور بوده و مورد تایید سیستم اتوماسیون می‌باشد.
            </div>
        </body>
        </html>
        `;

        return await this.renderHtmlToPdf(html, 'landscape');
    }

    /**
     * Shared Playwright Chromium PDF renderer
     * @param {string} html 
     * @param {'portrait'|'landscape'} orientation 
     * @returns {Promise<Buffer>}
     */
    static async renderHtmlToPdf(html, orientation = 'portrait') {
        const browser = await chromium.launch({ headless: true });
        try {
            const context = await browser.newContext();
            const page = await context.newPage();
            await page.setContent(html, { waitUntil: 'load' });
            const pdfBuffer = await page.pdf({
                format: 'A4',
                landscape: orientation === 'landscape',
                printBackground: true,
                margin: {
                    top: '12mm',
                    bottom: '12mm',
                    left: '10mm',
                    right: '10mm',
                },
            });
            return pdfBuffer;
        } finally {
            await browser.close().catch(() => {});
        }
    }
}

module.exports = ExportService;
