const PermitRepository = require('../../features/permit/permit.repository');
const permitService = require('../../features/permit/permit.service');
const UsersRepository = require('../../features/users/users.repository');

class PermitController {
    static getCodes(req, res) {
        try {
            const codes = PermitRepository.getTrackingCodes();
            res.json({ success: true, codes });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    static saveCodes(req, res) {
        try {
            const { codes } = req.body;
            if (!Array.isArray(codes)) {
                return res.status(400).json({ success: false, error: 'لیست کدها باید آرایه باشد.' });
            }
            PermitRepository.saveTrackingCodes(codes);
            res.json({ success: true, count: codes.length, codes });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    static addCode(req, res) {
        try {
            const { code } = req.body;
            if (!code || !String(code).trim()) {
                return res.status(400).json({ success: false, error: 'کد رهگیری الزامی است.' });
            }
            const updatedList = PermitRepository.addTrackingCode(code);
            res.status(201).json({ success: true, message: `کد رهگیری ${code} با موفقیت افزوده شد.`, codes: updatedList });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }

    static deleteCode(req, res) {
        try {
            const { code } = req.params;
            const updatedList = PermitRepository.deleteTrackingCode(code);
            res.json({ success: true, message: `کد رهگیری ${code} با موفقیت حذف شد.`, codes: updatedList });
        } catch (err) {
            res.status(400).json({ success: false, error: err.message });
        }
    }

    static getLastSuccessfulCode(req, res) {
        try {
            const data = PermitRepository.getLastSuccessfulCode();
            res.json({ success: true, data });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    static async startPermit(req, res) {
        try {
            const {
                username,
                customCodes,
                candidateCodes,
                headless,
                permits,
                slaughterhouseCode,
                slaughterhouseName,
                quantity,
                breed,
                hatchingPermitCode,
                skipClosure,
                cooldownSeconds,
            } = req.body;

            if (!username) {
                return res.status(400).json({ success: false, error: 'نام کاربری الزامی است.' });
            }

            const user = await UsersRepository.findByUsername(username);
            if (!user) {
                return res.status(404).json({ success: false, error: 'کاربر مورد نظر یافت نشد.' });
            }

            // Create a local copy so runtime overrides don't pollute the persistent file unexpectedly
            const userPayload = { ...user };
            if (breed) userPayload.breed = breed;
            if (hatchingPermitCode) userPayload.hatchingPermitCode = hatchingPermitCode;

            if (permitService.isRunning) {
                return res.status(400).json({ success: false, error: 'یک عملیات از قبل در حال اجرا است.' });
            }

            const permitsPayload = Array.isArray(permits) && permits.length > 0
                ? permits
                : [{
                    slaughterhouseCode,
                    slaughterhouseName,
                    quantity: quantity || '2000',
                    breed: breed || userPayload.breed || 'راس',
                }];

            // Run asynchronously
            permitService
                .startPermitFlow(userPayload, {
                    permits: permitsPayload,
                    candidateCodes: Array.isArray(candidateCodes) ? candidateCodes : [],
                    customCodes,
                    headless: !!headless,
                    skipClosure: !!skipClosure,
                    cooldownSeconds: cooldownSeconds !== undefined ? Number(cooldownSeconds) : undefined,
                })
                .catch((err) => {
                    console.error('Permit workflow error:', err);
                });

            const countText = permitsPayload.length > 1 ? `${permitsPayload.length} مجوز` : 'مجوز';
            res.json({ success: true, message: `عملیات صدور ${countText} برای ${user.name} آغاز شد.` });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    static skipCooldown(req, res) {
        try {
            const skipped = permitService.skipCooldown();
            if (!skipped) {
                return res.status(400).json({ success: false, error: 'سیستم در وضعیت انتظار تایمر نیست.' });
            }
            res.json({ success: true, message: 'تایمر با موفقیت رد شد و مجوز بعدی آغاز می‌شود.' });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    static confirmClosure(req, res) {
        try {
            const { confirm } = req.body;
            const handled = permitService.confirmClosure(confirm);
            if (!handled) {
                return res.status(400).json({ success: false, error: 'سیستم در انتظار تایید اعلام خاتمه نیست.' });
            }
            res.json({ success: true, message: confirm ? 'تایید اعلام خاتمه ارسال شد.' : 'انصراف از اعلام خاتمه ثبت شد.' });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    static getPaymentLinks(req, res) {
        try {
            const links = permitService.sessionPaymentLinks || PermitRepository.getPaymentLinks();
            res.json({ success: true, count: links.length, paymentLinks: links });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    static clearPaymentLinks(req, res) {
        try {
            permitService.sessionPaymentLinks = [];
            PermitRepository.clearPaymentLinks();
            res.json({ success: true, message: 'لیست لینک‌های پرداخت پاک شد.' });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    static async checkPaymentLinks(req, res) {
        try {
            const { username, headless } = req.body;
            if (!username) {
                return res.status(400).json({ success: false, error: 'نام کاربری الزامی است.' });
            }

            const user = await UsersRepository.findByUsername(username);
            if (!user) {
                return res.status(404).json({ success: false, error: 'کاربر مورد نظر یافت نشد.' });
            }

            if (permitService.isRunning) {
                return res.status(400).json({ success: false, error: 'یک عملیات از قبل در حال اجرا است.' });
            }

            permitService
                .startPaymentLinksCheck(user, { headless: !!headless })
                .catch((err) => {
                    console.error('Check payment links workflow error:', err);
                });

            res.json({ success: true, message: `استعلام لینک‌های پرداخت برای ${user.name} آغاز شد.` });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    static getSessionPermits(req, res) {
        try {
            const permits = permitService.sessionPermits || PermitRepository.getSessionPermits();
            res.json({ success: true, count: permits.length, permits });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    static clearSessionPermits(req, res) {
        try {
            permitService.sessionPermits = [];
            PermitRepository.clearSessionPermits();
            res.json({ success: true, message: 'لیست تاریخچه مجوزهای نشست پاک شد.' });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    static async exportPermitsExcel(req, res) {
        try {
            const ExportService = require('../../features/reports/export.service');
            const permits = permitService.sessionPermits || PermitRepository.getSessionPermits();
            const buffer = await ExportService.exportPermitsToExcel(permits);

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
            res.setHeader('Content-Disposition', `attachment; filename="permits_session_${timestamp}.xlsx"`);
            res.send(buffer);
        } catch (err) {
            console.error('Error exporting permits to Excel:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    }

    static async exportPermitsPdf(req, res) {
        try {
            const ExportService = require('../../features/reports/export.service');
            const permits = permitService.sessionPermits || PermitRepository.getSessionPermits();
            const buffer = await ExportService.exportPermitsToPdf(permits);

            const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="permits_session_${timestamp}.pdf"`);
            res.send(buffer);
        } catch (err) {
            console.error('Error exporting permits to PDF:', err);
            res.status(500).json({ success: false, error: err.message });
        }
    }
}

module.exports = PermitController;
