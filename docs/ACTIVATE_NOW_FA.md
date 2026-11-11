# فعال‌سازی FEZI AGENT روی GitHub و Telegram

مقصد انتخابی پروژه: **حساب feziai**، نام مخزن اختصاصی: **FEZI-AGENT**.

## وضعیت واقعی تا زمان تنظیم حساب‌ها

- کد روی همین بسته موجود است و آزمون‌های محلی اجرا شده‌اند.
- توکن BotFather و شناسه کاربر مجاز تلگرام در این محیط موجود نیستند؛ هیچ رباتی از اینجا فعال نشده است.
- اتصال GitHub مجوز نوشتن روی مخزن‌های موجود دارد، اما در این محیط ابزار ساخت مخزن جدید در دسترس نیست. `feziai/FEZI-AGENT` نیز در زمان بررسی وجود نداشت. پروژه را با مخزن غیرمرتبط جایگزین نکن.

## بخش اول — ساخت مخزن جدید (در مرورگر یا GitHub CLI)

در مرورگر [https://github.com/new](https://github.com/new) را باز کن؛ Owner = `feziai`، Repository name = `FEZI-AGENT`، Visibility = Private. **Initialize with README را خاموش بگذار** تا مخزن خالی باشد.

در رایانه‌ای که `git`، `gh` و Node.js 22 نصب است، ZIP سورس را استخراج کن، در پوشه پروژه وارد شو و ابتدا پیش‌نمایش را اجرا کن:

```bash
node scripts/publish-github.mjs --repo feziai/FEZI-AGENT --dry-run
```

با همان حساب `feziai` وارد شو (`gh auth login`) و سپس دستور انتشار را اجرا کن:

```bash
node scripts/publish-github.mjs --repo feziai/FEZI-AGENT --private --confirm
```

این اسکریپت اگر مخزن وجود نداشته باشد با `gh repo create` آن را می‌سازد، و اگر مخزن خالیِ ساخته‌شده باشد سورس را به آن Push می‌کند. روی مخزن دارای فایل از قبل، Force Push نمی‌کند. فایل‌های `.env`، کلیدهای خصوصی و وزن‌های مدل طبق `.gitignore` از انتشار کنار گذاشته می‌شوند؛ تنظیمات حساس را پیش از Push بازبینی کن.

## بخش دوم — راه‌اندازی تلگرام در همان روز

از ربات رسمی [@BotFather](https://t.me/BotFather) یک ربات بساز یا ربات خودت را مدیریت کن. **توکن را در ChatGPT یا GitHub قرار نده**. روی سرور Node.js 22 سورس را استخراج کن و تنظیمات خصوصی `.env` را تعریف کن:

```ini
APP_PASSWORD=YOUR_LONG_RANDOM_PASSWORD
SESSION_SECRET=YOUR_DIFFERENT_RANDOM_SECRET
TELEGRAM_BOT_TOKEN=YOUR_PRIVATE_BOTFATHER_TOKEN
TELEGRAM_ALLOWED_USER_IDS=YOUR_NUMERIC_TELEGRAM_ID
TELEGRAM_MODE=polling
TELEGRAM_BACKEND_URL=http://127.0.0.1:3000
```

شناسه عددی تلگرام را با ارسال `/start` به ربات و اجرای `node --env-file=.env scripts/telegram-id.mjs` در حالت Polling به دست بیاور.

تست اتصال (بدون تغییر دادن تنظیمات BotFather):

```bash
node --env-file=.env scripts/telegram-preflight.mjs --online
```

دو پردازش روی همان رایانه یا سرور لازم است:

```bash
node --env-file=.env server.js
node --env-file=.env scripts/telegram-poll.mjs
```

برای استفاده از `--online` ابتدا سرور را اجرا کن. گزینه Polling فقط وقتی خوب است که میزبان پروسه دائمی را نگه دارد. در cPanel اشتراکی ممکن است به‌جای Polling به **Webhook HTTPS** احتیاج باشد؛ راهنمای `docs/GITHUB_TELEGRAM_SETUP_FA.md` این حالت را توضیح می‌دهد. تنظیم `TELEGRAM_MODE` را با روش اجرا هماهنگ کن؛ Polling و Webhook را هم‌زمان اجرا نکن.

دستورهای تلگرام: `/start`، `/new نام پروژه`، `/build درخواست`، `/status`، `/export` و `/ask سوال`. پاسخ‌های هوشمند فقط در صورت وصل‌بودن یک مدل واقعی کار می‌کنند.

## بخش سوم — استقرار و اتصال هاست

پس از Push، GitHub Actions تست‌های Node.js را اجرا می‌کند. فایل `.github/workflows/deploy-cpanel.yml` برای استقرار با SSH آماده است؛ Secretهای هاست باید توسط مالک در GitHub تنظیم شوند. هاست cPanel بدون SSH به آپلود ZIP و راه‌اندازی Node.js App نیاز دارد. GitHub به‌تنهایی میزبان دائمی ربات یا مدل هوش مصنوعی نیست.
