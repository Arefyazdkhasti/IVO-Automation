const { createClient } = require('@supabase/supabase-js');

class SupabaseService {
    constructor() {
        this.client = null;
        this.url = null;
        this.key = null;
        this.initClient();
    }

    initClient() {
        this.url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || null;
        this.key = process.env.SUPABASE_KEY || process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || null;

        if (this.url && this.key) {
            try {
                this.client = createClient(this.url, this.key, {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false,
                    }
                });
            } catch (err) {
                console.error('⚠️ [Supabase] خطا در مقداردهی کلاینت سوپابیس:', err.message);
                this.client = null;
            }
        }
    }

    isConfigured() {
        return !!(this.client && this.url && this.key);
    }

    // بررسی سلامت اتصال و وجود جدول users
    async checkStatus() {
        if (!this.isConfigured()) {
            return {
                configured: false,
                connected: false,
                tableReady: false,
                provider: 'local',
                message: 'تنظیمات سوپابیس در فایل .env یافت نشد. دیتابیس محلی فعال است.'
            };
        }

        try {
            const { data, error } = await this.client.from('users').select('username').limit(1);
            if (error) {
                if (error.code === 'PGRST205' || error.message.includes('Could not find the table')) {
                    return {
                        configured: true,
                        connected: true,
                        tableReady: false,
                        provider: 'local_fallback',
                        message: 'سوپابیس متصل است اما جدول users هنوز ساخته نشده است. فایل supabase_schema.sql را در SQL Editor سوپابیس اجرا کنید.'
                    };
                }
                return {
                    configured: true,
                    connected: false,
                    tableReady: false,
                    provider: 'local_fallback',
                    message: `خطای سوپابیس: ${error.message}`
                };
            }

            return {
                configured: true,
                connected: true,
                tableReady: true,
                provider: 'supabase',
                message: 'اتصال به سوپابیس و جدول users برقرار است.'
            };
        } catch (err) {
            return {
                configured: true,
                connected: false,
                tableReady: false,
                provider: 'local_fallback',
                message: `خطا در ارتباط: ${err.message}`
            };
        }
    }

    // ==========================================
    // Supabase Auth Methods
    // ==========================================

    async registerAuthUser({ email, password, name, username }) {
        if (!this.isConfigured()) {
            throw new Error('سوپابیس در سرور تنظیم نشده است.');
        }
        if (!email || !password) {
            throw new Error('ایمیل و رمز عبور الزامی است.');
        }

        const { data, error } = await this.client.auth.signUp({
            email: email.trim(),
            password: password.trim(),
            options: {
                data: {
                    name: (name || '').trim(),
                    username: (username || '').trim(),
                }
            }
        });

        if (error) {
            throw new Error(error.message);
        }

        const isConfirmed = !!(data.user && data.user.email_confirmed_at);
        return {
            authUser: data.user,
            session: data.session,
            isConfirmed,
            message: isConfirmed
                ? 'اکانت کاربری با موفقیت ساخته شد و آماده ورود است.'
                : 'اکانت در سوپابیس ایجاد شد. اگر تایید ایمیل در داشبورد سوپابیس روشن است، ایمیل تایید ارسال شده است (یا می‌توانید در داشبورد سوپابیس تایید ایمیل را خاموش کنید).'
        };
    }

    
        async loginAuthUserWithDeviceFingerprint({ email, password, deviceFingerprint }) {
        if (!this.isConfigured()) {
            throw new Error('سوپابیس در سرور تنظیم نشده است.');
        }
        if (!email || !password) {
            throw new Error('ایمیل و رمز عبور الزامی است.');
        }

        const cleanEmail = email.trim();
        const cleanPassword = password.trim();

        // 1. احراز هویت مستقیم با Supabase Auth
        const { data, error } = await this.client.auth.signInWithPassword({
            email: cleanEmail,
            password: cleanPassword
        });

        if (error) {
            let msg = error.message;
            if (msg.includes('Invalid login credentials')) {
                msg = 'ایمیل یا رمز عبور اشتباه است.';
            } else if (msg.includes('Email not confirmed')) {
                msg = 'ایمیل هنوز تایید نشده است. لطفاً در داشبورد Supabase بخش Authentication تایید ایمیل را خاموش کنید.';
            }
            return {
                success: false,
                status: 401,
                error: msg
            };
        }

        const user = data.user;
        const metadata = user.user_metadata || {};
        const storedFingerprint = metadata.device_fingerprint;

        // 2. اولین بار که کاربر وارد می‌شود: ذخیره پایدار در user_metadata سوپابیس
        if (!storedFingerprint) {
            try {
                const userClient = createClient(this.url, this.key);
                await userClient.auth.setSession({
                    access_token: data.session.access_token,
                    refresh_token: data.session.refresh_token
                });
                const updateRes = await userClient.auth.updateUser({
                    data: {
                        device_fingerprint: deviceFingerprint,
                        device_locked_at: new Date().toISOString()
                    }
                });
                if (updateRes.error) {
                    throw updateRes.error;
                }
                console.log('🔒 اثر انگشت کاربر ' + cleanEmail + ' با موفقیت در Supabase Auth ثبت و قفل شد:', deviceFingerprint);
            } catch (updateErr) {
                console.error('❌ خطا در ذخیره اثر انگشت در سوپابیس:', updateErr.message);
                return {
                    success: false,
                    status: 500,
                    error: 'خطا در ثبت قفل دستگاه در سوپابیس: ' + updateErr.message
                };
            }

            return {
                success: true,
                isNewLock: true,
                user: {
                    id: user.id,
                    email: user.email,
                    name: metadata.name || user.email.split('@')[0],
                    deviceFingerprint: deviceFingerprint
                },
                session: data.session
            };
        }

        // 3. در ورودهای بعدی: اگر هش ارسالی با هش ذخیره شده مطابقت داشت -> ورود مجاز
        if (storedFingerprint === deviceFingerprint) {
            console.log('✅ ورود تایید شد: اثر انگشت کاربر ' + cleanEmail + ' با هش ذخیره‌شده در Supabase تطابق دارد.');
            return {
                success: true,
                isNewLock: false,
                user: {
                    id: user.id,
                    email: user.email,
                    name: metadata.name || user.email.split('@')[0],
                    deviceFingerprint: storedFingerprint
                },
                session: data.session
            };
        }

        // 4. اگر هش متفاوت بود -> رد قاطعانه دسترسی
        console.warn('⛔ ورود مسدود شد: اثر انگشت ارسالی با هش قفل‌شده در Supabase برای ' + cleanEmail + ' مغایرت دارد!');
        return {
            success: false,
            status: 403,
            deviceMismatch: true,
            error: '⛔ دسترسی غیرمجاز: این حساب کاربری قبلاً روی یک مرورگر/دستگاه دیگر ثبت و قفل شده است. شما فقط مجاز به استفاده از همان یک مرورگر اولیه هستید و نمی‌توانید از مرورگر یا دستگاه دیگری استفاده کنید.',
            lockedFingerprint: storedFingerprint,
            currentFingerprint: deviceFingerprint
        };
    }

    async loginAuthUser({ email, password }) {
        if (!this.isConfigured()) {
            throw new Error('سوپابیس در سرور تنظیم نشده است.');
        }
        if (!email || !password) {
            throw new Error('ایمیل و رمز عبور الزامی است.');
        }

        const { data, error } = await this.client.auth.signInWithPassword({
            email: email.trim(),
            password: password.trim()
        });

        if (error) {
            throw new Error(error.message);
        }

        // Fetch associated farmer profile if available
        let profile = null;
        try {
            const { data: userProfile } = await this.client
                .from('users')
                .select('*')
                .eq('email', email.trim())
                .maybeSingle();
            profile = userProfile;
        } catch (e) {
            // Non-critical if email column not present
        }

        return {
            user: data.user,
            session: data.session,
            profile: profile || {
                email: data.user.email,
                name: data.user.user_metadata?.name || data.user.email,
                username: data.user.user_metadata?.username || ''
            }
        };
    }

    // ==========================================
    // Users Table Operations
    // ==========================================

    async getAllUsers() {
        if (!this.isConfigured()) return null;
        try {
            const { data, error } = await this.client
                .from('users')
                .select('*')
                .order('name', { ascending: true });

            if (error) throw error;

            return (data || []).map(row => ({
                username: row.username,
                password: row.password,
                name: row.name,
                email: row.email || '',
                authId: row.auth_id || '',
                breed: row.breed || 'راس',
                hatchingPermitCode: row.hatching_permit_code || row.hatchingPermitCode || '',
                epidemiologicCode: row.epidemiologic_code || row.epidemiologicCode || '',
            }));
        } catch (err) {
            console.warn('⚠️ [Supabase] دریافت کاربران از سوپابیس با خطا مواجه شد:', err.message);
            return null;
        }
    }

    async findByUsername(username) {
        if (!this.isConfigured() || !username) return null;
        try {
            const { data, error } = await this.client
                .from('users')
                .select('*')
                .eq('username', username.trim())
                .maybeSingle();

            if (error || !data) return null;

            return {
                username: data.username,
                password: data.password,
                name: data.name,
                email: data.email || '',
                authId: data.auth_id || '',
                breed: data.breed || 'راس',
                hatchingPermitCode: data.hatching_permit_code || data.hatchingPermitCode || '',
                epidemiologicCode: data.epidemiologic_code || data.epidemiologicCode || '',
            };
        } catch (err) {
            return null;
        }
    }

    async createUser(userData) {
        if (!this.isConfigured()) return null;
        const row = {
            username: userData.username.trim(),
            password: userData.password.trim(),
            name: userData.name.trim(),
            breed: (userData.breed || 'راس').trim(),
            hatching_permit_code: (userData.hatchingPermitCode || '').trim(),
            epidemiologic_code: (userData.epidemiologicCode || '').trim(),
            updated_at: new Date().toISOString()
        };
        if (userData.email) row.email = userData.email.trim();
        if (userData.authId) row.auth_id = userData.authId;

        try {
            const { data, error } = await this.client
                .from('users')
                .insert([row])
                .select()
                .single();

            if (error) {
                // If failed due to email column missing, retry without email
                if (error.message.includes("'email'") || error.message.includes("'auth_id'")) {
                    delete row.email;
                    delete row.auth_id;
                    const retry = await this.client.from('users').insert([row]).select().single();
                    if (retry.error) throw new Error(retry.error.message);
                    return retry.data;
                }
                throw new Error(error.message);
            }

            return {
                username: data.username,
                password: data.password,
                name: data.name,
                email: data.email || '',
                breed: data.breed,
                hatchingPermitCode: data.hatching_permit_code,
                epidemiologicCode: data.epidemiologic_code
            };
        } catch (err) {
            throw err;
        }
    }

    async updateUser(username, updateData) {
        if (!this.isConfigured()) return null;
        const row = {
            updated_at: new Date().toISOString()
        };
        if (updateData.name !== undefined) row.name = updateData.name.trim();
        if (updateData.password !== undefined) row.password = updateData.password.trim();
        if (updateData.email !== undefined) row.email = updateData.email.trim();
        if (updateData.authId !== undefined) row.auth_id = updateData.authId;
        if (updateData.breed !== undefined) row.breed = updateData.breed.trim();
        if (updateData.hatchingPermitCode !== undefined) row.hatching_permit_code = updateData.hatchingPermitCode.trim();
        if (updateData.epidemiologicCode !== undefined) row.epidemiologic_code = updateData.epidemiologicCode.trim();

        try {
            const { data, error } = await this.client
                .from('users')
                .update(row)
                .eq('username', username.trim())
                .select()
                .single();

            if (error) {
                if (error.message.includes("'email'") || error.message.includes("'auth_id'")) {
                    delete row.email;
                    delete row.auth_id;
                    const retry = await this.client.from('users').update(row).eq('username', username.trim()).select().single();
                    if (retry.error) throw new Error(retry.error.message);
                    return retry.data;
                }
                throw new Error(error.message);
            }

            return {
                username: data.username,
                password: data.password,
                name: data.name,
                email: data.email || '',
                breed: data.breed,
                hatchingPermitCode: data.hatching_permit_code,
                epidemiologicCode: data.epidemiologic_code
            };
        } catch (err) {
            throw err;
        }
    }

    async deleteUser(username) {
        if (!this.isConfigured()) return null;
        const { error } = await this.client
            .from('users')
            .delete()
            .eq('username', username.trim());

        if (error) throw new Error(error.message);
        return true;
    }

    // همگام‌سازی کاربران محلی با سوپابیس (Seed / Migration)
    async syncUsersFromLocal(localUsers = []) {
        if (!this.isConfigured() || !Array.isArray(localUsers) || localUsers.length === 0) {
            return { success: false, message: 'داده‌ای برای همگام‌سازی وجود ندارد یا سوپابیس تنظیم نشده است.' };
        }

        const rows = localUsers.map(u => ({
            username: u.username.trim(),
            password: u.password.trim(),
            name: u.name.trim(),
            breed: (u.breed || 'راس').trim(),
            hatching_permit_code: (u.hatchingPermitCode || '').trim(),
            epidemiologic_code: (u.epidemiologicCode || '').trim(),
            updated_at: new Date().toISOString()
        }));

        const { data, error } = await this.client
            .from('users')
            .upsert(rows, { onConflict: 'username' })
            .select();

        if (error) {
            throw error;
        }

        return {
            success: true,
            count: data.length,
            message: `${data.length} کاربر با موفقیت در سوپابیس ذخیره شدند.`
        };
    }
}

module.exports = new SupabaseService();
