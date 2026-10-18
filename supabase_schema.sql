-- ========================================================
-- سامانه اتوماسیون جامع دامپزشکی (IVO Automation)
-- ساخت جداول + داده‌های اولیه در Supabase
-- ========================================================
-- نحوه استفاده: کل فایل را در SQL Editor سوپابیس Paste و Run کنید.
-- داده‌ها از data/users.json، data/slaughterhouses.json، data/tracking_codes.json
-- با UPSERT (ON CONFLICT) هم‌خوان با اجرای مجدد هستند.
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

-- اضافه کردن ستون‌ها در صورتی که جدول از قبل وجود دارد
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS auth_id UUID;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'farmer';
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS device_fingerprint TEXT;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS device_locked_at TIMESTAMPTZ;
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_by TEXT;

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

-- ۴. داده‌های اولیه از data/users.json، data/slaughterhouses.json، data/tracking_codes.json
--    (تاریخ تولید: 2026-10-18)

-- مرغداران / کاربران
INSERT INTO public.users (username, name, password, email, auth_id, breed, hatching_permit_code, epidemiologic_code, role, device_fingerprint, device_locked_at, created_by, updated_at)
VALUES ('admin', 'مدیر کل سامانه دامپزشکی', 'admin', 'admin@ivo.ir', NULL, 'مدیریت', NULL, NULL, 'admin', '5631f333ad694057a0e45d494d974d05', '2026-10-04T19:53:42.339Z'::timestamptz, 'admin', timezone('utc'::text, now()))
ON CONFLICT (username) DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  email = EXCLUDED.email,
  auth_id = EXCLUDED.auth_id,
  breed = EXCLUDED.breed,
  hatching_permit_code = EXCLUDED.hatching_permit_code,
  epidemiologic_code = EXCLUDED.epidemiologic_code,
  role = EXCLUDED.role,
  device_fingerprint = EXCLUDED.device_fingerprint,
  device_locked_at = EXCLUDED.device_locked_at,
  created_by = EXCLUDED.created_by,
  updated_at = timezone('utc'::text, now());

INSERT INTO public.users (username, name, password, email, auth_id, breed, hatching_permit_code, epidemiologic_code, role, device_fingerprint, device_locked_at, created_by, updated_at)
VALUES ('PO5962', 'اصغر براتی', '8212979839', 'po5962@gmail.com', NULL, 'راس', '140410041774', '10140330085', 'farmer', NULL, NULL, 'admin', timezone('utc'::text, now()))
ON CONFLICT (username) DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  email = EXCLUDED.email,
  auth_id = EXCLUDED.auth_id,
  breed = EXCLUDED.breed,
  hatching_permit_code = EXCLUDED.hatching_permit_code,
  epidemiologic_code = EXCLUDED.epidemiologic_code,
  role = EXCLUDED.role,
  device_fingerprint = EXCLUDED.device_fingerprint,
  device_locked_at = EXCLUDED.device_locked_at,
  created_by = EXCLUDED.created_by,
  updated_at = timezone('utc'::text, now());

INSERT INTO public.users (username, name, password, email, auth_id, breed, hatching_permit_code, epidemiologic_code, role, device_fingerprint, device_locked_at, created_by, updated_at)
VALUES ('PO42416', 'جعفر شفیعی', '8212979839', NULL, NULL, 'راس', '140510014674', '10140330166', 'farmer', NULL, NULL, 'admin', timezone('utc'::text, now()))
ON CONFLICT (username) DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  email = EXCLUDED.email,
  auth_id = EXCLUDED.auth_id,
  breed = EXCLUDED.breed,
  hatching_permit_code = EXCLUDED.hatching_permit_code,
  epidemiologic_code = EXCLUDED.epidemiologic_code,
  role = EXCLUDED.role,
  device_fingerprint = EXCLUDED.device_fingerprint,
  device_locked_at = EXCLUDED.device_locked_at,
  created_by = EXCLUDED.created_by,
  updated_at = timezone('utc'::text, now());

INSERT INTO public.users (username, name, password, email, auth_id, breed, hatching_permit_code, epidemiologic_code, role, device_fingerprint, device_locked_at, created_by, updated_at)
VALUES ('PO557375', 'حاج علی عسگری', '8212979839', NULL, NULL, 'راس', NULL, NULL, 'farmer', NULL, NULL, 'admin', timezone('utc'::text, now()))
ON CONFLICT (username) DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  email = EXCLUDED.email,
  auth_id = EXCLUDED.auth_id,
  breed = EXCLUDED.breed,
  hatching_permit_code = EXCLUDED.hatching_permit_code,
  epidemiologic_code = EXCLUDED.epidemiologic_code,
  role = EXCLUDED.role,
  device_fingerprint = EXCLUDED.device_fingerprint,
  device_locked_at = EXCLUDED.device_locked_at,
  created_by = EXCLUDED.created_by,
  updated_at = timezone('utc'::text, now());

INSERT INTO public.users (username, name, password, email, auth_id, breed, hatching_permit_code, epidemiologic_code, role, device_fingerprint, device_locked_at, created_by, updated_at)
VALUES ('PO4646', 'رجبعلی بابایی', '1287929389', NULL, NULL, 'راس', '140510013246', '10030330021', 'farmer', NULL, NULL, 'admin', timezone('utc'::text, now()))
ON CONFLICT (username) DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  email = EXCLUDED.email,
  auth_id = EXCLUDED.auth_id,
  breed = EXCLUDED.breed,
  hatching_permit_code = EXCLUDED.hatching_permit_code,
  epidemiologic_code = EXCLUDED.epidemiologic_code,
  role = EXCLUDED.role,
  device_fingerprint = EXCLUDED.device_fingerprint,
  device_locked_at = EXCLUDED.device_locked_at,
  created_by = EXCLUDED.created_by,
  updated_at = timezone('utc'::text, now());

INSERT INTO public.users (username, name, password, email, auth_id, breed, hatching_permit_code, epidemiologic_code, role, device_fingerprint, device_locked_at, created_by, updated_at)
VALUES ('PO5937', 'شمسی', '1287929389', NULL, NULL, 'کاب', '140410048215', '10140330185', 'farmer', NULL, NULL, 'admin', timezone('utc'::text, now()))
ON CONFLICT (username) DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  email = EXCLUDED.email,
  auth_id = EXCLUDED.auth_id,
  breed = EXCLUDED.breed,
  hatching_permit_code = EXCLUDED.hatching_permit_code,
  epidemiologic_code = EXCLUDED.epidemiologic_code,
  role = EXCLUDED.role,
  device_fingerprint = EXCLUDED.device_fingerprint,
  device_locked_at = EXCLUDED.device_locked_at,
  created_by = EXCLUDED.created_by,
  updated_at = timezone('utc'::text, now());

INSERT INTO public.users (username, name, password, email, auth_id, breed, hatching_permit_code, epidemiologic_code, role, device_fingerprint, device_locked_at, created_by, updated_at)
VALUES ('PO5943', 'عبدالحسین حاجی صادقیان', '1287929389', NULL, NULL, 'راس', '140510011587', '10140330068', 'farmer', NULL, NULL, 'admin', timezone('utc'::text, now()))
ON CONFLICT (username) DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  email = EXCLUDED.email,
  auth_id = EXCLUDED.auth_id,
  breed = EXCLUDED.breed,
  hatching_permit_code = EXCLUDED.hatching_permit_code,
  epidemiologic_code = EXCLUDED.epidemiologic_code,
  role = EXCLUDED.role,
  device_fingerprint = EXCLUDED.device_fingerprint,
  device_locked_at = EXCLUDED.device_locked_at,
  created_by = EXCLUDED.created_by,
  updated_at = timezone('utc'::text, now());

INSERT INTO public.users (username, name, password, email, auth_id, breed, hatching_permit_code, epidemiologic_code, role, device_fingerprint, device_locked_at, created_by, updated_at)
VALUES ('PO5992', 'علی قندهاری', '1287929389', NULL, NULL, 'ایندین ریورز', '140510006136', '10140330106', 'farmer', NULL, NULL, 'admin', timezone('utc'::text, now()))
ON CONFLICT (username) DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  email = EXCLUDED.email,
  auth_id = EXCLUDED.auth_id,
  breed = EXCLUDED.breed,
  hatching_permit_code = EXCLUDED.hatching_permit_code,
  epidemiologic_code = EXCLUDED.epidemiologic_code,
  role = EXCLUDED.role,
  device_fingerprint = EXCLUDED.device_fingerprint,
  device_locked_at = EXCLUDED.device_locked_at,
  created_by = EXCLUDED.created_by,
  updated_at = timezone('utc'::text, now());

INSERT INTO public.users (username, name, password, email, auth_id, breed, hatching_permit_code, epidemiologic_code, role, device_fingerprint, device_locked_at, created_by, updated_at)
VALUES ('PO5949', 'علی محمد جمیشیدیان', '8212979839', NULL, NULL, 'راس', '140510011254', '10140330074', 'farmer', NULL, NULL, 'admin', timezone('utc'::text, now()))
ON CONFLICT (username) DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  email = EXCLUDED.email,
  auth_id = EXCLUDED.auth_id,
  breed = EXCLUDED.breed,
  hatching_permit_code = EXCLUDED.hatching_permit_code,
  epidemiologic_code = EXCLUDED.epidemiologic_code,
  role = EXCLUDED.role,
  device_fingerprint = EXCLUDED.device_fingerprint,
  device_locked_at = EXCLUDED.device_locked_at,
  created_by = EXCLUDED.created_by,
  updated_at = timezone('utc'::text, now());

INSERT INTO public.users (username, name, password, email, auth_id, breed, hatching_permit_code, epidemiologic_code, role, device_fingerprint, device_locked_at, created_by, updated_at)
VALUES ('po6020', 'ابولفضل میرزاده', '8212979839', NULL, NULL, 'راس', '140510018016', '10140330133', 'farmer', NULL, NULL, 'admin', timezone('utc'::text, now()))
ON CONFLICT (username) DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  email = EXCLUDED.email,
  auth_id = EXCLUDED.auth_id,
  breed = EXCLUDED.breed,
  hatching_permit_code = EXCLUDED.hatching_permit_code,
  epidemiologic_code = EXCLUDED.epidemiologic_code,
  role = EXCLUDED.role,
  device_fingerprint = EXCLUDED.device_fingerprint,
  device_locked_at = EXCLUDED.device_locked_at,
  created_by = EXCLUDED.created_by,
  updated_at = timezone('utc'::text, now());

INSERT INTO public.users (username, name, password, email, auth_id, breed, hatching_permit_code, epidemiologic_code, role, device_fingerprint, device_locked_at, created_by, updated_at)
VALUES ('PO5946', 'مانده علی براتی', '1287929389', NULL, NULL, 'راس', '140510008401', '10140330071', 'farmer', NULL, NULL, 'admin', timezone('utc'::text, now()))
ON CONFLICT (username) DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  email = EXCLUDED.email,
  auth_id = EXCLUDED.auth_id,
  breed = EXCLUDED.breed,
  hatching_permit_code = EXCLUDED.hatching_permit_code,
  epidemiologic_code = EXCLUDED.epidemiologic_code,
  role = EXCLUDED.role,
  device_fingerprint = EXCLUDED.device_fingerprint,
  device_locked_at = EXCLUDED.device_locked_at,
  created_by = EXCLUDED.created_by,
  updated_at = timezone('utc'::text, now());

INSERT INTO public.users (username, name, password, email, auth_id, breed, hatching_permit_code, epidemiologic_code, role, device_fingerprint, device_locked_at, created_by, updated_at)
VALUES ('PO6464', 'محسن اسماعیلی', '8212979839', NULL, NULL, 'راس', '140510014944', '10190330039', 'farmer', NULL, NULL, 'admin', timezone('utc'::text, now()))
ON CONFLICT (username) DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  email = EXCLUDED.email,
  auth_id = EXCLUDED.auth_id,
  breed = EXCLUDED.breed,
  hatching_permit_code = EXCLUDED.hatching_permit_code,
  epidemiologic_code = EXCLUDED.epidemiologic_code,
  role = EXCLUDED.role,
  device_fingerprint = EXCLUDED.device_fingerprint,
  device_locked_at = EXCLUDED.device_locked_at,
  created_by = EXCLUDED.created_by,
  updated_at = timezone('utc'::text, now());

INSERT INTO public.users (username, name, password, email, auth_id, breed, hatching_permit_code, epidemiologic_code, role, device_fingerprint, device_locked_at, created_by, updated_at)
VALUES ('PO5865', 'محمد کرباسی ایثارگران', '1287929389', NULL, NULL, 'راس', NULL, NULL, 'farmer', NULL, NULL, 'admin', timezone('utc'::text, now()))
ON CONFLICT (username) DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  email = EXCLUDED.email,
  auth_id = EXCLUDED.auth_id,
  breed = EXCLUDED.breed,
  hatching_permit_code = EXCLUDED.hatching_permit_code,
  epidemiologic_code = EXCLUDED.epidemiologic_code,
  role = EXCLUDED.role,
  device_fingerprint = EXCLUDED.device_fingerprint,
  device_locked_at = EXCLUDED.device_locked_at,
  created_by = EXCLUDED.created_by,
  updated_at = timezone('utc'::text, now());

INSERT INTO public.users (username, name, password, email, auth_id, breed, hatching_permit_code, epidemiologic_code, role, device_fingerprint, device_locked_at, created_by, updated_at)
VALUES ('PO5986', 'مصطفی باقری', '8212979839', NULL, NULL, 'راس', NULL, NULL, 'farmer', NULL, NULL, 'admin', timezone('utc'::text, now()))
ON CONFLICT (username) DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  email = EXCLUDED.email,
  auth_id = EXCLUDED.auth_id,
  breed = EXCLUDED.breed,
  hatching_permit_code = EXCLUDED.hatching_permit_code,
  epidemiologic_code = EXCLUDED.epidemiologic_code,
  role = EXCLUDED.role,
  device_fingerprint = EXCLUDED.device_fingerprint,
  device_locked_at = EXCLUDED.device_locked_at,
  created_by = EXCLUDED.created_by,
  updated_at = timezone('utc'::text, now());

INSERT INTO public.users (username, name, password, email, auth_id, breed, hatching_permit_code, epidemiologic_code, role, device_fingerprint, device_locked_at, created_by, updated_at)
VALUES ('Po6465', 'مهدی اسماعیلی', '1287929389', NULL, NULL, 'راس', NULL, NULL, 'farmer', NULL, NULL, 'admin', timezone('utc'::text, now()))
ON CONFLICT (username) DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  email = EXCLUDED.email,
  auth_id = EXCLUDED.auth_id,
  breed = EXCLUDED.breed,
  hatching_permit_code = EXCLUDED.hatching_permit_code,
  epidemiologic_code = EXCLUDED.epidemiologic_code,
  role = EXCLUDED.role,
  device_fingerprint = EXCLUDED.device_fingerprint,
  device_locked_at = EXCLUDED.device_locked_at,
  created_by = EXCLUDED.created_by,
  updated_at = timezone('utc'::text, now());

INSERT INTO public.users (username, name, password, email, auth_id, breed, hatching_permit_code, epidemiologic_code, role, device_fingerprint, device_locked_at, created_by, updated_at)
VALUES ('PO547892', 'نعمت الله روانبخش', '8212979839', NULL, NULL, 'ایندین ریورز', '140510019417', '10140330188', 'farmer', NULL, NULL, 'admin', timezone('utc'::text, now()))
ON CONFLICT (username) DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  email = EXCLUDED.email,
  auth_id = EXCLUDED.auth_id,
  breed = EXCLUDED.breed,
  hatching_permit_code = EXCLUDED.hatching_permit_code,
  epidemiologic_code = EXCLUDED.epidemiologic_code,
  role = EXCLUDED.role,
  device_fingerprint = EXCLUDED.device_fingerprint,
  device_locked_at = EXCLUDED.device_locked_at,
  created_by = EXCLUDED.created_by,
  updated_at = timezone('utc'::text, now());

INSERT INTO public.users (username, name, password, email, auth_id, breed, hatching_permit_code, epidemiologic_code, role, device_fingerprint, device_locked_at, created_by, updated_at)
VALUES ('po6430', 'مجتبی اسماعیلی', '8212979839', NULL, NULL, 'راس', NULL, NULL, 'farmer', NULL, NULL, 'admin@ivo.ir', timezone('utc'::text, now()))
ON CONFLICT (username) DO UPDATE SET
  name = EXCLUDED.name,
  password = EXCLUDED.password,
  email = EXCLUDED.email,
  auth_id = EXCLUDED.auth_id,
  breed = EXCLUDED.breed,
  hatching_permit_code = EXCLUDED.hatching_permit_code,
  epidemiologic_code = EXCLUDED.epidemiologic_code,
  role = EXCLUDED.role,
  device_fingerprint = EXCLUDED.device_fingerprint,
  device_locked_at = EXCLUDED.device_locked_at,
  created_by = EXCLUDED.created_by,
  updated_at = timezone('utc'::text, now());

-- کشتارگاه‌ها (توجه: دو رکورد با code یکسان 180008152301 در JSON وجود دارد؛ آخرین نام در upsert برنده می‌شود)
INSERT INTO public.slaughterhouses (code, name, updated_at)
VALUES ('180008074501', 'هما', timezone('utc'::text, now()))
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, updated_at = timezone('utc'::text, now());

INSERT INTO public.slaughterhouses (code, name, updated_at)
VALUES ('180008105501', 'زرین طیور', timezone('utc'::text, now()))
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, updated_at = timezone('utc'::text, now());

INSERT INTO public.slaughterhouses (code, name, updated_at)
VALUES ('190805354821', 'درسا', timezone('utc'::text, now()))
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, updated_at = timezone('utc'::text, now());

INSERT INTO public.slaughterhouses (code, name, updated_at)
VALUES ('180008073801', 'سپید', timezone('utc'::text, now()))
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, updated_at = timezone('utc'::text, now());

INSERT INTO public.slaughterhouses (code, name, updated_at)
VALUES ('180008155001', 'ثمین', timezone('utc'::text, now()))
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, updated_at = timezone('utc'::text, now());

INSERT INTO public.slaughterhouses (code, name, updated_at)
VALUES ('180008074101', 'سمانه', timezone('utc'::text, now()))
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, updated_at = timezone('utc'::text, now());

INSERT INTO public.slaughterhouses (code, name, updated_at)
VALUES ('180008152301', 'سپاهان', timezone('utc'::text, now()))
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, updated_at = timezone('utc'::text, now());

INSERT INTO public.slaughterhouses (code, name, updated_at)
VALUES ('180008074001', 'زیبا', timezone('utc'::text, now()))
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, updated_at = timezone('utc'::text, now());

INSERT INTO public.slaughterhouses (code, name, updated_at)
VALUES ('180008140501', 'گلپایگان', timezone('utc'::text, now()))
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, updated_at = timezone('utc'::text, now());

INSERT INTO public.slaughterhouses (code, name, updated_at)
VALUES ('190805534221', 'ساینا', timezone('utc'::text, now()))
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, updated_at = timezone('utc'::text, now());

INSERT INTO public.slaughterhouses (code, name, updated_at)
VALUES ('180008124201', 'ماکیان', timezone('utc'::text, now()))
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, updated_at = timezone('utc'::text, now());

INSERT INTO public.slaughterhouses (code, name, updated_at)
VALUES ('180008152301', 'اصفهان مرغ', timezone('utc'::text, now()))
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, updated_at = timezone('utc'::text, now());

INSERT INTO public.slaughterhouses (code, name, updated_at)
VALUES ('180008084701', 'پرطلایی خرم آباد', timezone('utc'::text, now()))
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, updated_at = timezone('utc'::text, now());

INSERT INTO public.slaughterhouses (code, name, updated_at)
VALUES ('180008154001', 'هامون', timezone('utc'::text, now()))
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, updated_at = timezone('utc'::text, now());

INSERT INTO public.slaughterhouses (code, name, updated_at)
VALUES ('180008051801', 'بهسا مرغ خمین', timezone('utc'::text, now()))
ON CONFLICT (code) DO UPDATE SET name = EXCLUDED.name, updated_at = timezone('utc'::text, now());

-- کدهای رهگیری خودرو
INSERT INTO public.tracking_codes (code, is_active)
VALUES ('1897098', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('1895972', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('1044344', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('1897097', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('1419829', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('2499359', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('2173790', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('2058039', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('2583341', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('2206837', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('3572325', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('3179668', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('3751307', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('3665945', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('3143498', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('3734734', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('4389514', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('4685510', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('4922156', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('4148551', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('4002944', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('4685103', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('5883550', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('5872063', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('5755989', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('5890445', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('6358854', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('6731318', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('6414229', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('6103730', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('6773831', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('6047829', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('7561735', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('7536254', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('7350688', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('7718880', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('7484166', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('7800472', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('8256377', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('8878446', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('8173899', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('8285583', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('8018581', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('8893078', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('9905547', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('9679895', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('9346210', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('9928323', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('9971882', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('9714678', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('0358042', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('0772966', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('0149754', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('0783905', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

INSERT INTO public.tracking_codes (code, is_active)
VALUES ('0364334', true)
ON CONFLICT (code) DO UPDATE SET is_active = EXCLUDED.is_active;

