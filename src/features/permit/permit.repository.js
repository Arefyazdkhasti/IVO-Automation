const fs = require('fs');
const { TRACKING_CODES_FILE, LAST_SUCCESSFUL_CODE_FILE, resolveDataFile } = require('../../config/paths');

const SESSION_PERMITS_FILE = resolveDataFile('session_permits.json');
const PAYMENT_LINKS_FILE = resolveDataFile('payment_links.json');

class PermitRepository {
    static getTrackingCodes() {
        try {
            if (fs.existsSync(TRACKING_CODES_FILE)) {
                return JSON.parse(fs.readFileSync(TRACKING_CODES_FILE, 'utf-8'));
            }
        } catch (e) {
            console.error('Error reading tracking codes:', e);
        }
        return [];
    }

    static saveTrackingCodes(codes) {
        fs.writeFileSync(TRACKING_CODES_FILE, JSON.stringify(codes, null, 2), 'utf-8');
    }

    static addTrackingCode(code) {
        const clean = (code || '').trim();
        if (!clean) throw new Error('کد رهگیری نمی‌تواند خالی باشد.');
        const codes = this.getTrackingCodes();
        if (!codes.includes(clean)) {
            codes.unshift(clean); // add to top
            this.saveTrackingCodes(codes);
        }
        return codes;
    }

    static deleteTrackingCode(code) {
        const clean = (code || '').trim();
        const codes = this.getTrackingCodes();
        const filtered = codes.filter((c) => String(c).trim() !== clean);
        this.saveTrackingCodes(filtered);
        return filtered;
    }

    static getLastSuccessfulCode() {
        try {
            if (fs.existsSync(LAST_SUCCESSFUL_CODE_FILE)) {
                return JSON.parse(fs.readFileSync(LAST_SUCCESSFUL_CODE_FILE, 'utf-8'));
            }
        } catch (e) {
            console.error('Error reading last successful code:', e);
        }
        return null;
    }

    static saveLastSuccessfulCode(data) {
        fs.writeFileSync(LAST_SUCCESSFUL_CODE_FILE, JSON.stringify(data, null, 2), 'utf-8');
    }

    // ==========================================
    // Session Permits History (Persistence)
    // ==========================================

    static getSessionPermits() {
        try {
            if (fs.existsSync(SESSION_PERMITS_FILE)) {
                return JSON.parse(fs.readFileSync(SESSION_PERMITS_FILE, 'utf-8'));
            }
        } catch (e) {
            console.error('Error reading session permits file:', e);
        }
        return [];
    }

    static saveSessionPermits(permits) {
        fs.writeFileSync(SESSION_PERMITS_FILE, JSON.stringify(permits, null, 2), 'utf-8');
    }

    static clearSessionPermits() {
        fs.writeFileSync(SESSION_PERMITS_FILE, JSON.stringify([], null, 2), 'utf-8');
        return [];
    }

    // ==========================================
    // Payment Links History (Persistence)
    // ==========================================

    static getPaymentLinks() {
        try {
            if (fs.existsSync(PAYMENT_LINKS_FILE)) {
                return JSON.parse(fs.readFileSync(PAYMENT_LINKS_FILE, 'utf-8'));
            }
        } catch (e) {
            console.error('Error reading payment links file:', e);
        }
        return [];
    }

    static savePaymentLinks(links) {
        fs.writeFileSync(PAYMENT_LINKS_FILE, JSON.stringify(links, null, 2), 'utf-8');
    }

    static clearPaymentLinks() {
        fs.writeFileSync(PAYMENT_LINKS_FILE, JSON.stringify([], null, 2), 'utf-8');
        return [];
    }
}

module.exports = PermitRepository;
