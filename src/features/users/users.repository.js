const fs = require('fs');
const { USERS_FILE, SLAUGHTERHOUSES_FILE } = require('../../config/paths');
const supabaseService = require('../../services/supabase.service');

class UsersRepository {
    // ==========================================
    // Local File Helpers
    // ==========================================

    static getLocalUsers() {
        try {
            if (fs.existsSync(USERS_FILE)) {
                let users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
                if (!Array.isArray(users)) users = [];
                if (!users.some(u => u.username && u.username.toLowerCase() === 'admin')) {
                    users.unshift({
                        username: 'admin',
                        password: 'admin',
                        name: 'مدیر کل سامانه دامپزشکی',
                        role: 'admin',
                        email: 'admin@ivo.ir',
                        authId: '',
                        breed: 'مدیریت',
                        hatchingPermitCode: '',
                        epidemiologicCode: '',
                        deviceFingerprint: null,
                        deviceLockedAt: null,
                        createdBy: 'admin'
                    });
                }
                return users;
            }
        } catch (err) {
            console.error('Error reading users file:', err);
        }
        return [];
    }

    static saveLocalUsers(users) {
        try {
            fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
        } catch (err) {
            console.error('Error writing users file:', err);
        }
    }

    // ==========================================
    // Users Operations (Hybrid Supabase + Local)
    // ==========================================

    static async getAllUsers(requestingUser = null) {
        const users = this.getLocalUsers();

        // اگر کاربر ادمین است یا کاربری مشخص نشده: تمام مرغداران همه کاربران بازگردانده شوند
        if (!requestingUser || requestingUser.role === 'admin' || requestingUser.username === 'admin' || requestingUser.email === 'admin@ivo.ir') {
            return users;
        }

        // اگر کاربر عادی است: فقط مرغدارانی که خود این کاربر ثبت کرده است
        const userIdentifier = (requestingUser.email || requestingUser.username || '').trim().toLowerCase();
        return users.filter((u) => u.createdBy && u.createdBy.trim().toLowerCase() === userIdentifier);
    }

    static getAllUsersSync() {
        return this.getLocalUsers();
    }

    static async findByUsername(username) {
        if (!username) return null;
        if (supabaseService.isConfigured()) {
            try {
                const remoteUser = await supabaseService.findByUsername(username);
                if (remoteUser) return remoteUser;
            } catch (err) {
                // Fallback to local
            }
        }
        const users = this.getLocalUsers();
        return users.find((u) => u.username && u.username.toLowerCase() === username.trim().toLowerCase()) || null;
    }

    static findByUsernameSync(username) {
        if (!username) return null;
        const users = this.getLocalUsers();
        return users.find((u) => u.username && u.username.toLowerCase() === username.trim().toLowerCase()) || null;
    }

    static async findByIdentifier(identifier) {
        if (!identifier) return null;
        const clean = identifier.trim().toLowerCase();
        const users = this.getLocalUsers();
        return users.find((u) => 
            (u.username && u.username.toLowerCase() === clean) ||
            (u.email && u.email.toLowerCase() === clean)
        ) || null;
    }

    // ==========================================
    // Device Fingerprint Locking & Verification
    // ==========================================

    static verifyAndLockDevice(username, clientFingerprint) {
        if (!username) return { success: false, error: 'نام کاربری نامعتبر است.' };
        if (!clientFingerprint) {
            return {
                success: false,
                error: 'شناسه اثر انگشت مرورگر (Device Fingerprint) ارسال نشده است. لطفاً جاوااسکریپت مرورگر را فعال کنید.'
            };
        }

        const users = this.getLocalUsers();
        const cleanTarget = username.trim().toLowerCase();
        const index = users.findIndex((u) => u.username && u.username.toLowerCase() === cleanTarget);

        if (index === -1) {
            return { success: false, error: 'کاربر مورد نظر یافت نشد.' };
        }

        const user = users[index];

        // سناریو ۱: کاربر برای اولین بار با این مرورگر لاگین کرده است -> قفل کردن سیستم روی این مرورگر
        if (!user.deviceFingerprint) {
            user.deviceFingerprint = clientFingerprint.trim();
            user.deviceLockedAt = new Date().toISOString();
            this.saveLocalUsers(users);

            if (supabaseService.isConfigured()) {
                supabaseService.updateUser(user.username, {
                    deviceFingerprint: user.deviceFingerprint,
                    deviceLockedAt: user.deviceLockedAt
                }).catch((e) => console.warn('Supabase device sync warning:', e.message));
            }

            return {
                success: true,
                isNewLock: true,
                message: 'این مرورگر به عنوان سیستم انحصاری و تاییدشده شما در سامانه ثبت و قفل گردید.',
                user
            };
        }

        // سناریو ۲: اثر انگشت ارسالی با هش ثبت شده مطابقت دارد
        if (user.deviceFingerprint === clientFingerprint.trim()) {
            return {
                success: true,
                isNewLock: false,
                message: 'دستگاه و مرورگر تایید گردید.',
                user
            };
        }

        // سناریو ۳: هش ارسالی با هش ثبت شده متفاوت است -> رد قاطعانه ورود!
        return {
            success: false,
            isMismatch: true,
            error: '⛔ دسترسی غیرمجاز: این حساب کاربری قبلاً روی یک مرورگر و سیستم دیگر فعال و قفل شده است. به دلیل ضوابط امنیتی سامانه دامپزشکی، ورود تنها از طریق همان مرورگر اولیه مجاز است و امکان دسترسی از دستگاه یا مرورگر جدید وجود ندارد.',
            lockedFingerprint: user.deviceFingerprint,
            currentFingerprint: clientFingerprint
        };
    }

    static resetDeviceLock(username) {
        const users = this.getLocalUsers();
        const cleanTarget = (username || '').trim().toLowerCase();
        const index = users.findIndex((u) => u.username && u.username.toLowerCase() === cleanTarget);

        if (index === -1) return false;

        users[index].deviceFingerprint = null;
        users[index].deviceLockedAt = null;
        this.saveLocalUsers(users);

        if (supabaseService.isConfigured()) {
            supabaseService.updateUser(users[index].username, {
                deviceFingerprint: null,
                deviceLockedAt: null
            }).catch(() => {});
        }
        return true;
    }

    static async createUser(userData, creatorUser = null) {
        const users = this.getLocalUsers();
        const username = (userData.username || '').trim();
        if (!username) throw new Error('نام کاربری الزامی است.');
        if (!userData.password) throw new Error('کلمه عبور الزامی است.');
        if (!userData.name) throw new Error('نام و نام خانوادگی مرغدار الزامی است.');

        const exists = users.some((u) => u.username && u.username.toLowerCase() === username.toLowerCase());
        if (exists) throw new Error(`کاربری با نام کاربری "${username}" از قبل وجود دارد.`);

        const createdBy = creatorUser
            ? (creatorUser.email || creatorUser.username || 'admin').trim().toLowerCase()
            : 'admin';

        const newUser = {
            username: username,
            password: userData.password.trim(),
            name: userData.name.trim(),
            role: userData.role || 'farmer',
            email: (userData.email || '').trim(),
            authId: userData.authId || '',
            breed: (userData.breed || 'راس').trim(),
            epidemiologicCode: (userData.epidemiologicCode || '').trim(),
            hatchingPermitCode: (userData.hatchingPermitCode || '').trim(),
            deviceFingerprint: userData.deviceFingerprint || null,
            deviceLockedAt: userData.deviceLockedAt || null,
            createdBy: createdBy,
            createdAt: new Date().toISOString()
        };

        // Attempt Supabase insert if configured
        if (supabaseService.isConfigured()) {
            try {
                const remoteResult = await supabaseService.createUser(newUser);
                if (remoteResult) {
                    newUser.hatchingPermitCode = remoteResult.hatchingPermitCode;
                    newUser.epidemiologicCode = remoteResult.epidemiologicCode;
                }
            } catch (err) {
                console.warn('⚠️ [Supabase] ذخیره در سوپابیس ناموفق بود، در دیتابیس محلی ذخیره شد:', err.message);
            }
        }

        users.push(newUser);
        this.saveLocalUsers(users);
        return newUser;
    }

    static async updateUser(targetUsername, updateData, requestingUser = null) {
        const users = this.getLocalUsers();
        const cleanTarget = (targetUsername || '').trim().toLowerCase();
        const index = users.findIndex((u) => u.username && u.username.toLowerCase() === cleanTarget);
        if (index === -1) throw new Error('کاربر مورد نظر یافت نشد.');

        const isSuperAdmin = requestingUser && (requestingUser.role === 'admin' || requestingUser.username === 'admin' || requestingUser.email === 'admin@ivo.ir');

        if (requestingUser && !isSuperAdmin) {
            const userIdentifier = (requestingUser.email || requestingUser.username || '').trim().toLowerCase();
            if (users[index].createdBy && users[index].createdBy.trim().toLowerCase() !== userIdentifier) {
                throw new Error('شما مجاز به ویرایش این مرغدار نیستید؛ این رکورد متعلق به کاربر دیگری است.');
            }
            // کاربران عادی اجازه تغییر اکانت لاگین یا قفل مرورگر را ندارند
            delete updateData.deviceFingerprint;
            delete updateData.deviceLockedAt;
            delete updateData.authId;
            delete updateData.email;
        }

        const newUsername = (updateData.username || users[index].username).trim();
        if (newUsername.toLowerCase() !== cleanTarget) {
            const conflict = users.some((u, i) => i !== index && u.username && u.username.toLowerCase() === newUsername.toLowerCase());
            if (conflict) throw new Error(`نام کاربری "${newUsername}" توسط کاربر دیگری استفاده شده است.`);
        }

        const updated = {
            ...users[index],
            username: newUsername,
            password: updateData.password !== undefined ? updateData.password.trim() : users[index].password,
            name: updateData.name !== undefined ? updateData.name.trim() : users[index].name,
            breed: updateData.breed !== undefined ? updateData.breed.trim() : (users[index].breed || 'راس'),
            epidemiologicCode: updateData.epidemiologicCode !== undefined ? updateData.epidemiologicCode.trim() : (users[index].epidemiologicCode || ''),
            hatchingPermitCode: updateData.hatchingPermitCode !== undefined ? updateData.hatchingPermitCode.trim() : (users[index].hatchingPermitCode || ''),
            email: updateData.email !== undefined ? updateData.email.trim() : (users[index].email || ''),
            deviceFingerprint: updateData.deviceFingerprint !== undefined ? updateData.deviceFingerprint : users[index].deviceFingerprint,
            deviceLockedAt: updateData.deviceLockedAt !== undefined ? updateData.deviceLockedAt : users[index].deviceLockedAt
        };

        users[index] = updated;
        this.saveLocalUsers(users);

        if (supabaseService.isConfigured()) {
            try {
                await supabaseService.updateUser(cleanTarget, updated);
            } catch (err) {
                console.warn('⚠️ [Supabase] بروزرسانی در سوپابیس ناموفق بود:', err.message);
            }
        }

        return updated;
    }

    static async deleteUser(username, requestingUser = null) {
        const users = this.getLocalUsers();
        const cleanTarget = (username || '').trim().toLowerCase();
        const index = users.findIndex((u) => u.username && u.username.toLowerCase() === cleanTarget);
        if (index === -1) throw new Error('کاربر مورد نظر برای حذف یافت نشد.');

        const isSuperAdmin = requestingUser && (requestingUser.role === 'admin' || requestingUser.username === 'admin' || requestingUser.email === 'admin@ivo.ir');

        if (requestingUser && !isSuperAdmin) {
            const userIdentifier = (requestingUser.email || requestingUser.username || '').trim().toLowerCase();
            if (users[index].createdBy && users[index].createdBy.trim().toLowerCase() !== userIdentifier) {
                throw new Error('شما مجاز به حذف این مرغدار نیستید؛ این رکورد متعلق به کاربر دیگری است.');
            }
        }

        const deletedUser = users.splice(index, 1)[0];
        this.saveLocalUsers(users);

        if (supabaseService.isConfigured()) {
            try {
                await supabaseService.deleteUser(cleanTarget);
            } catch (err) {
                console.warn('⚠️ [Supabase] حذف از سوپابیس ناموفق بود:', err.message);
            }
        }

        return true;
    }

    // ==========================================
    // Slaughterhouse CRUD
    // ==========================================

    static getAllSlaughterhouses() {
        try {
            if (fs.existsSync(SLAUGHTERHOUSES_FILE)) {
                return JSON.parse(fs.readFileSync(SLAUGHTERHOUSES_FILE, 'utf-8'));
            }
        } catch (err) {
            console.error('Error reading slaughterhouses file:', err);
        }
        return [];
    }

    static saveSlaughterhouses(list) {
        fs.writeFileSync(SLAUGHTERHOUSES_FILE, JSON.stringify(list, null, 2), 'utf-8');
    }

    static createSlaughterhouse(data) {
        const list = this.getAllSlaughterhouses();
        const name = (data.name || '').trim();
        const code = (data.code || '').trim();
        if (!name) throw new Error('نام کشتارگاه الزامی است.');
        if (!code) throw new Error('کد یکتای جهاد کشاورزی الزامی است.');

        const exists = list.some((item) => item.code === code);
        if (exists) throw new Error(`کشتارگاهی با شناسه "${code}" از قبل ثبت شده است.`);

        const newSh = { name, code };
        list.push(newSh);
        this.saveSlaughterhouses(list);
        return newSh;
    }

    static updateSlaughterhouse(targetCode, updateData) {
        const list = this.getAllSlaughterhouses();
        const cleanTarget = (targetCode || '').trim();
        const index = list.findIndex((item) => item.code === cleanTarget);
        if (index === -1) throw new Error('کشتارگاه مورد نظر یافت نشد.');

        const newCode = (updateData.code || list[index].code).trim();
        if (newCode !== cleanTarget) {
            const conflict = list.some((item, i) => i !== index && item.code === newCode);
            if (conflict) throw new Error(`شناسه "${newCode}" برای کشتارگاه دیگری ثبت شده است.`);
        }

        const updated = {
            name: updateData.name !== undefined ? updateData.name.trim() : list[index].name,
            code: newCode,
        };

        list[index] = updated;
        this.saveSlaughterhouses(list);
        return updated;
    }

    static deleteSlaughterhouse(code) {
        const list = this.getAllSlaughterhouses();
        const cleanTarget = (code || '').trim();
        const initialLength = list.length;
        const filtered = list.filter((item) => item.code !== cleanTarget);
        if (filtered.length === initialLength) throw new Error('کشتارگاه مورد نظر برای حذف یافت نشد.');
        this.saveSlaughterhouses(filtered);
        return true;
    }
}

module.exports = UsersRepository;
