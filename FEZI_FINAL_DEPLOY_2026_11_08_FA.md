# FEZI Studio — بسته نهایی آماده آپلود (نسخه آزمایشی استقرار)

## محتوای بسته
یک سورس واحد Node.js 22 با FEZI Agent، Plugin Hub، ربات‌ساز تلگرام، داشبورد مدل‌های رایگان و بانک فشرده اسکیل‌ها.

## ترتیب نصب
1. سورس را در محیط خصوصی و امن استخراج کن. این ZIP را به پوشه public_html عمومی یا GitHub Pages کپی نکن: برنامه به Node.js فعال نیاز دارد.
2. روی VPS یا هاست دارای Node.js 22 و ترمینال فعال، `cp .env.example .env` و کلیدهای محرمانهٔ **کاملاً جدید** را فقط در `.env` قرار بده. از توکن‌هایی که در گفتگوها منتشر شدند استفاده نکن.
3. `APP_PASSWORD`، `SESSION_SECRET` با مقادیر امن و `PUBLIC_BASE_URL` به HTTPS واقعی تغییر کنند. `HOST=0.0.0.0` فقط برای کانتینر باشد؛ پشت reverse proxy محافظت کن.
4. برای Docker از `docker compose -f compose.api-first.yaml up -d --build` استفاده کن. روی cPanel باید Startup File=`server.js` و Node.js>=22 و راهکار فرآیند دائمی وجود داشته باشد؛ پشتیبانی آپلود ZIP به معنی پشتیبانی از Node.js نیست.
5. صفحه `/` و `/plugins`، `/plugins/telegram-manager`، `/plugins/chatgpt-builder` و `/fezi-agent/skill-creator` را آزمایش کن.
6. BotFather: ربات مرکزی جدید بساز، توکن تازه و `TELEGRAM_FACTORY_WEBHOOK_SECRET` را در Secret Store وارد کن؛ سپس روی سرور اصلی HTTPS دستور `npm run telegram:factory:setup -- --apply` را اجرا کن. قبل از انتشار این فرمان را اجرا نکن.
7. در تلگرام `/start`، `/plugins`، `/skills`، `/createplugin`، `/agent`، `/newbot` و `/mybots` را تست کن. سازنده سایت منوی Mini App را باز می‌کند.
8. انتخاب مدل رایگان OpenRouter را با API معتبر تست کن؛ هیچ مدل ابری/محلی یا باتی بدون اتصال و نتیجه واقعی READY اعلام نمی‌شود.
9. دیتابیس/لاگ‌های اجرا در Volume دائمی ذخیره شوند. بکاپ رمزنگاری‌شده و Rollback آزمایش شود.

## Plugin Creator ChatGPT
در حال حاضر وجود اسکیل مشترک برای ۱۰ پلاگین از ۱۳ تای شناسایی‌شده تأیید شده است. به‌روزرسانی مجدد Telegram Bot Maker در این نسخه انجام می‌شود؛ انتشار بات مرکزی تلگرام جداگانه و بعد از HTTPS است. پلاگین خصوصی را نمی‌توان با Bot API تلگرام به ChatGPT نصب کرد.

## نکته امنیتی
فایل `Dotenv.txt` یا کلیدهای سابق را در هیچ سرور/مخزن عمومی قرار نده. توکن‌هایی که در متن گفتگو منتشر شده‌اند باید باطل و تعویض شوند.

## وضعیت
این خروجی سورس تست‌شده و آماده شروع استقرار است، نه تأیید عملیاتی سرویس‌های API/GPU/Telegram روی اینترنت.
