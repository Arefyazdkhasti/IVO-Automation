const sessionService = require('../../services/session.service');

function requireAuth(req, res, next) {
    let token = req.headers.authorization || req.headers['x-auth-token'];
    if (token && token.startsWith('Bearer ')) {
        token = token.slice(7).trim();
    }

    if (!token) {
        return res.status(401).json({
            success: false,
            error: '🔒 احراز هویت الزامی است. لطفاً ابتدا وارد حساب کاربری خود شوید.',
            requiresLogin: true
        });
    }

    const clientFingerprint = req.headers['x-device-fingerprint'] || req.query.deviceFingerprint;
    const verification = sessionService.verifySession(token, clientFingerprint);

    if (!verification.valid) {
        if (verification.reason === 'device_mismatch') {
            return res.status(403).json({
                success: false,
                error: verification.error,
                deviceMismatch: true,
                requiresLogin: true
            });
        }
        return res.status(401).json({
            success: false,
            error: 'نشست کاربری منقضی شده یا نامعتبر است. لطفاً مجدداً وارد شوید.',
            requiresLogin: true
        });
    }

    req.user = verification.session;
    next();
}

module.exports = {
    requireAuth
};
