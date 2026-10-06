require('dotenv').config();
const fs = require('fs');
const path = require('path');
const supabaseService = require('../src/services/supabase.service');
const { USERS_FILE } = require('../src/config/paths');

async function main() {
    console.log('\n======================================================');
    console.log('🔄 بررسی اتصال و همگام‌سازی کاربران با Supabase');
    console.log('======================================================\n');

    const status = await supabaseService.checkStatus();
    console.log(`وضعیت پیکربندی: ${status.configured ? '✅ فعال' : '❌ نامشخص'}`);
    console.log(`وضعیت اتصال: ${status.connected ? '✅ متصل' : '❌ قطع'}`);
    console.log(`وضعیت جدول users: ${status.tableReady ? '✅ آماده' : '⚠️ هنوز ساخته نشده'}`);
    console.log(`پیام: ${status.message}\n`);

    if (!status.tableReady) {
        console.log('------------------------------------------------------');
        console.log('💡 راهنمای ساخت جدول users در Supabase:');
        console.log('۱. وارد داشبورد پروژه خود در https://supabase.com شوید.');
        console.log('۲. به بخش SQL Editor بروید.');
        console.log('۳. محتوای فایل supabase_schema.sql را در آنجا قرار داده و Run کنید.');
        console.log('۴. سپس مجدداً این اسکریپت را اجرا نمایید.');
        console.log('------------------------------------------------------\n');
        return;
    }

    // اگر جدول آماده است، کاربران محلی را به سوپابیس منتقل کن
    try {
        if (!fs.existsSync(USERS_FILE)) {
            console.log('❌ فایل data/users.json یافت نشد.');
            return;
        }

        const localUsers = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
        console.log(`📦 در حال همگام‌سازی ${localUsers.length} کاربر محلی با سوپابیس...`);

        const result = await supabaseService.syncUsersFromLocal(localUsers);
        console.log(`✅ ${result.message}`);
        console.log('\n🎉 عملیات همگام‌سازی با موفقیت پایان یافت!\n');
    } catch (err) {
        console.error('❌ خطا در همگام‌سازی:', err.message);
    }
}

main();
