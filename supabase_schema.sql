-- ========================================================
-- سامانه اتوماسیون جامع دامپزشکی (IVO Automation)
-- ساخت جداول پایگاه داده در Supabase
-- ========================================================

-- ۱. جدول مرغداران و کاربران سامانه
CREATE TABLE IF NOT EXISTS public.users (
    username TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    password TEXT NOT NULL,
    email TEXT UNIQUE,
    auth_id UUID,
    breed TEXT DEFAULT 'راس',
    hatching_permit_code TEXT,
    epidemiologic_code TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- اضافه کردن ستون‌های email و auth_id در صورتی که جدول از قبل وجود دارد
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT UNIQUE;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_id UUID;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'farmer';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS device_locked_at TIMESTAMPTZ;


-- ۲. جدول کشتارگاه‌های مقصد
CREATE TABLE IF NOT EXISTS public.slaughterhouses (
    code TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ۳. جدول کدهای رهگیری خودروهای حمل
CREATE TABLE IF NOT EXISTS public.tracking_codes (
    code TEXT PRIMARY KEY,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- فعال‌سازی امنیت سطح ردیف (Row Level Security)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.slaughterhouses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tracking_codes ENABLE ROW LEVEL SECURITY;

-- تعریف دسترسی عمومی برای کلاینت (Anon / Publishable Key)
DROP POLICY IF EXISTS "Allow anon all on users" ON public.users;
CREATE POLICY "Allow anon all on users" ON public.users 
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on slaughterhouses" ON public.slaughterhouses;
CREATE POLICY "Allow anon all on slaughterhouses" ON public.slaughterhouses 
    FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow anon all on tracking_codes" ON public.tracking_codes;
CREATE POLICY "Allow anon all on tracking_codes" ON public.tracking_codes 
    FOR ALL USING (true) WITH CHECK (true);
