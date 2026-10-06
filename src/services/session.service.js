const crypto = require('crypto');

class SessionService {
    constructor() {
        // In-memory session cache: token -> session data
        this.sessions = new Map();
        // Session validity duration: 7 days
        this.TTL_MS = 7 * 24 * 60 * 60 * 1000;
        
        // Clean expired sessions periodically (every 1 hour)
        setInterval(() => this.cleanup(), 60 * 60 * 1000).unref();
    }

    createSession(user, deviceFingerprint) {
        const token = crypto.randomBytes(32).toString('hex');
        const now = Date.now();
        const sessionData = {
            token,
            username: user.username,
            name: user.name,
            role: user.role || 'farmer',
            email: user.email || '',
            deviceFingerprint: (deviceFingerprint || '').trim(),
            createdAt: now,
            expiresAt: now + this.TTL_MS
        };
        this.sessions.set(token, sessionData);
        return sessionData;
    }

    getSession(token) {
        if (!token) return null;
        const session = this.sessions.get(token);
        if (!session) return null;
        if (Date.now() > session.expiresAt) {
            this.sessions.delete(token);
            return null;
        }
        return session;
    }

    verifySession(token, clientFingerprint = null) {
        const session = this.getSession(token);
        if (!session) return { valid: false, reason: 'invalid_or_expired' };

        if (clientFingerprint && session.deviceFingerprint) {
            if (session.deviceFingerprint !== clientFingerprint.trim()) {
                return {
                    valid: false,
                    reason: 'device_mismatch',
                    error: 'شناسه اثر انگشت مرورگر با نشست تطابق ندارد. لطفاً مجدداً وارد شوید.'
                };
            }
        }

        return { valid: true, session };
    }

    destroySession(token) {
        if (token) this.sessions.delete(token);
    }

    destroyUserSessions(username) {
        if (!username) return;
        const clean = username.trim().toLowerCase();
        for (const [tok, sess] of this.sessions.entries()) {
            if (sess.username && sess.username.toLowerCase() === clean) {
                this.sessions.delete(tok);
            }
        }
    }

    cleanup() {
        const now = Date.now();
        for (const [tok, sess] of this.sessions.entries()) {
            if (now > sess.expiresAt) {
                this.sessions.delete(tok);
            }
        }
    }
}

module.exports = new SessionService();
