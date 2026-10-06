const supabaseService = require('../../services/supabase.service');
const UsersRepository = require('../../features/users/users.repository');
const sessionService = require('../../services/session.service');

class AuthController {
    // ==========================================
    // Register Farmer in Supabase Auth
    // ==========================================
    static async registerFarmer(req, res) {
        try {
            const { username, email, password } = req.body;
            if (!username) {
                return res.status(400).json({ success: false, error: 'نام کاربری مرغدار الزامی است.' });
            }
            if (!email) {
                return res.status(400).json({ success: false, error: 'ایمیل مرغدار الزامی است.' });
            }

            // Find user in database
            const user = await UsersRepository.findByUsername(username);
            if (!user) {
                return res.status(404).json({ success: false, error: 'مرغداری با این نام کاربری یافت نشد.' });
            }

            const targetPassword = (password || user.password || '').trim();
            if (!targetPassword || targetPassword.length < 6) {
                return res.status(400).json({ success: false, error: 'رمز عبور باید حداقل ۶ کاراکتر باشد.' });
            }

            // Register in Supabase Auth
            const authResult = await supabaseService.registerAuthUser({
                email: email.trim(),
                password: targetPassword,
                name: user.name,
                username: user.username,
            });

            // Update user record with email and authId
            await UsersRepository.updateUser(username, {
                email: email.trim(),
                authId: authResult.authUser?.id || null
            });

            res.status(201).json({
                success: true,
                message: authResult.message,
                isConfirmed: authResult.isConfirmed,
                credentials: {
                    email: email.trim(),
                    password: targetPassword,
                    username: user.username,
                    name: user.name
                }
            });
        } catch (err) {
            console.error('Error registering farmer auth:', err);
            res.status(400).json({ success: false, error: err.message });
        }
    }

    // ==========================================
    // Farmer / Admin Login with Device Fingerprinting
    // ==========================================
        // ==========================================
    // Supabase Auth Login with Device Fingerprinting
    // ==========================================
    static async login(req, res) {
        try {
            const { identifier, email, username, password, deviceFingerprint } = req.body;
            const targetIdentifier = (identifier || email || username || '').trim();
            const targetPassword = (password || '').trim();
            const targetFingerprint = (deviceFingerprint || '').trim();

            if (!targetIdentifier || !targetPassword) {
                return res.status(400).json({
                    success: false,
                    error: 'لطفاً ایمیل (یا نام کاربری) و رمز عبور را وارد فرمایید.'
                });
            }

            if (!targetFingerprint) {
                return res.status(400).json({
                    success: false,
                    error: '⚠️ شناسه اثر انگشت مرورگر (Device Fingerprint) شناسایی نشد. لطفاً مطمئن شوید جاوااسکریپت مرورگر فعال است.'
                });
            }

            // ۰. ورود اختصاصی مدیر کل سیستم (admin / admin)
            if (targetIdentifier.toLowerCase() === 'admin') {
                if (targetPassword !== 'admin') {
                    return res.status(401).json({
                        success: false,
                        error: 'کلمه عبور مدیر نادرست است.'
                    });
                }

                const adminUser = {
                    username: 'admin',
                    name: 'مدیر کل سامانه دامپزشکی',
                    role: 'admin',
                    email: 'admin@ivo.ir',
                    deviceFingerprint: targetFingerprint,
                    deviceLockedAt: new Date().toISOString()
                };
                const session = sessionService.createSession(adminUser, targetFingerprint);

                return res.json({
                    success: true,
                    message: 'ورود با موفقیت انجام شد. خوش آمدید مدیر کل سامانه!',
                    token: session.token,
                    user: adminUser
                });
            }


            // ۱. بررسی مستقیم با Supabase Auth برای کاربران ایمیلی (طبق خواسته کاربر)
            if (targetIdentifier.includes('@') && supabaseService.isConfigured()) {
                const sbResult = await supabaseService.loginAuthUserWithDeviceFingerprint({
                    email: targetIdentifier,
                    password: targetPassword,
                    deviceFingerprint: targetFingerprint
                });

                if (!sbResult.success) {
                    return res.status(sbResult.status || 401).json({
                        success: false,
                        error: sbResult.error,
                        deviceMismatch: !!sbResult.deviceMismatch,
                        lockedFingerprint: sbResult.lockedFingerprint,
                        currentFingerprint: sbResult.currentFingerprint
                    });
                }

                // صدور توکن نشست کاربری
                const sessionUser = {
                    id: sbResult.user.id,
                    username: sbResult.user.email,
                    name: sbResult.user.name || sbResult.user.email.split('@')[0],
                    role: 'farmer',
                    email: sbResult.user.email,
                    deviceFingerprint: targetFingerprint
                };
                const session = sessionService.createSession(sessionUser, targetFingerprint);

                const welcomeMsg = sbResult.isNewLock
                    ? 'ورود با موفقیت انجام شد. این مرورگر به عنوان سیستم انحصاری شما ثبت و قفل گردید.'
                    : 'ورود با موفقیت انجام شد. خوش آمدید ' + sessionUser.name + '!';

                return res.json({
                    success: true,
                    message: welcomeMsg,
                    token: session.token,
                    user: sessionUser
                });
            }

            // ۲. پشتیبانی از اکانت مدیر یا ورود لوکال (مثلاً admin / admin)
            let user = await UsersRepository.findByIdentifier(targetIdentifier);
            if (!user) {
                return res.status(401).json({
                    success: false,
                    error: 'حساب کاربری با این مشخصات یافت نشد.'
                });
            }

            if (user.password !== targetPassword) {
                return res.status(401).json({
                    success: false,
                    error: 'کلمه عبور وارد شده نادرست است.'
                });
            }

            const deviceResult = UsersRepository.verifyAndLockDevice(user.username, targetFingerprint);
            if (!deviceResult.success) {
                return res.status(403).json({
                    success: false,
                    error: deviceResult.error,
                    deviceMismatch: true,
                    lockedFingerprint: deviceResult.lockedFingerprint,
                    currentFingerprint: deviceResult.currentFingerprint
                });
            }

            const session = sessionService.createSession(user, targetFingerprint);
            const welcomeMsg = deviceResult.isNewLock
                ? 'ورود با موفقیت انجام شد. این مرورگر به عنوان سیستم انحصاری شما قفل گردید.'
                : 'ورود با موفقیت انجام شد. خوش آمدید ' + user.name + '!';

            return res.json({
                success: true,
                message: welcomeMsg,
                token: session.token,
                user: {
                    username: user.username,
                    name: user.name,
                    role: user.role || 'farmer',
                    email: user.email || '',
                    deviceFingerprint: user.deviceFingerprint,
                    deviceLockedAt: user.deviceLockedAt
                }
            });
        } catch (err) {
            console.error('Error in login controller:', err);
            res.status(500).json({ success: false, error: 'خطای سیستمی: ' + err.message });
        }
    }

    // ==========================================
    // Check Current User & Session Validity
    // ==========================================
    static async getMe(req, res) {
        try {
            let token = req.headers.authorization || req.headers['x-auth-token'];
            if (token && token.startsWith('Bearer ')) token = token.slice(7).trim();

            const clientFingerprint = req.headers['x-device-fingerprint'];
            const verification = sessionService.verifySession(token, clientFingerprint);

            if (!verification.valid) {
                return res.status(401).json({
                    success: false,
                    error: verification.error || 'نشست نامعتبر است.',
                    deviceMismatch: verification.reason === 'device_mismatch'
                });
            }

            const user = await UsersRepository.findByUsername(verification.session.username);
            const userObj = user || verification.session;

            return res.json({
                success: true,
                user: {
                    username: userObj.username,
                    name: userObj.name || userObj.username,
                    role: userObj.role || 'farmer',
                    email: userObj.email || '',
                    deviceFingerprint: userObj.deviceFingerprint,
                    deviceLockedAt: userObj.deviceLockedAt
                }
            });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    // ==========================================
    // Logout
    // ==========================================
    static async logout(req, res) {
        try {
            let token = req.headers.authorization || req.headers['x-auth-token'];
            if (token && token.startsWith('Bearer ')) token = token.slice(7).trim();
            if (token) sessionService.destroySession(token);
            res.json({ success: true, message: 'با موفقیت خارج شدید.' });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }

    // ==========================================
    // Reset Device Lock (Admin Action)
    // ==========================================
    static async resetDeviceLock(req, res) {
        try {
            const { username } = req.params;
            if (!username) {
                return res.status(400).json({ success: false, error: 'نام کاربری الزامی است.' });
            }

            const success = UsersRepository.resetDeviceLock(username);
            if (!success) {
                return res.status(404).json({ success: false, error: 'کاربر مورد نظر یافت نشد.' });
            }

            // Destroy existing sessions for this user so they must log in afresh with new device
            sessionService.destroyUserSessions(username);

            res.json({
                success: true,
                message: 'قفل سخت‌افزاری مرورگر برای کاربر ' + username + ' با موفقیت بازنشانی شد. کاربر در ورود بعدی می‌تواند با مرورگر جدید وارد شود.'
            });
        } catch (err) {
            res.status(500).json({ success: false, error: err.message });
        }
    }
}

module.exports = AuthController;
