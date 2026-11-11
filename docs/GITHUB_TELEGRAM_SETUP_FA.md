# فعال‌سازی FEZI AGENT در GitHub و Telegram

## ۱. الزامات اولیه

- Node.js 22؛ هیچ وابستگی npm اجباری برای هسته ربات وجود ندارد.
- فقط روی سیستم شخصی یا سرور تحت کنترل خودت اجرا کن.
- **رمزهای تلگرام، GitHub و برنامه را هرگز داخل مخزن، پیام چت یا فایل APK قرار نده.**
- برنامه را با API واقعی مدل (مانند Ollama محلی یا کلید معتبر سرویس انتخابی) پیکربندی کن. بدون مدل، /ask و /build جواب واقعی تولید نمی‌کنند.

## ۲. فعال‌سازی سریع تلگرام — بدون دامنه عمومی

1. در تلگرام به @BotFather پیام بده: `/newbot` و نام FEZI AGENT را انتخاب کن. BotFather توکن را فقط به خودت می‌دهد.
2. یک فایل `.env` بر اساس `.env.example` بساز و داخل آن `APP_PASSWORD`، `SESSION_SECRET`، `TELEGRAM_BOT_TOKEN`، `TELEGRAM_MODE=polling` و `DATA_DIR` را تنظیم کن.
3. برای شناسایی شناسه تلگرام ابتدا به ربات `/start` بفرست و `npm run telegram:id` را اجرا کن؛ نتیجه را در `TELEGRAM_ALLOWED_USER_IDS` قرار بده.
4. در یک ترمینال سرور `node --env-file=.env server.js` و در ترمینال دوم `node --env-file=.env scripts/telegram-poll.mjs` اجرا کن.
5. در تلگرام `/start`، سپس `/new فروشگاه من` و `/build یک فروشگاه واکنش‌گرا بساز` را بفرست. با `/status` وضعیت را بگیر؛ `/export` فایل ZIP را تحویل می‌دهد.
6. برای نگه‌داشتن ربات روی سرور مستقل از پروسه‌منیجر مانند systemd یا سرویس‌منیجر هاست استفاده کن. هاست اشتراکی ممکن است پردازش Polling دائمی را متوقف کند.

> اجرای `telegram:poll` به طور خودکار webhook قبلی همان بات را حذف می‌کند. همزمان از Webhook و Polling استفاده نکن.

## ۳. حالت cPanel/Webhook

1. در cPanel یک برنامه Node.js برای FEZI AGENT بساز، پورت و Startup File (`app.js`) را تنظیم کن. Node.js 22 و HTTPS لازم است.
2. متغیرهای محیطی BotFather و `TELEGRAM_ALLOWED_USER_IDS` را در پنل هاست ثبت کن.
3. `TELEGRAM_PUBLIC_URL=https://your-real-domain.example` و `TELEGRAM_WEBHOOK_SECRET` تصادفی فقط با حروف/اعداد/`_`/`-` و دست‌کم ۱۶ کاراکتر را تنظیم کن.
4. یک بار در محیط هاست اجرا کن: `node --env-file=.env scripts/telegram-setup.mjs --webhook`.
5. با `node --env-file=.env scripts/telegram-setup.mjs --status` بررسی کن که Webhook ثبت و بدون خطا باشد.
6. در این حالت تنها برنامه Node.js اصلی کافی است و نیازی به اجرای poller نیست.

## ۴. راه‌اندازی GitHub

1. مخزنی به نام `fezi-agent` بساز و محتوای **داخل** پروژه را در ریشه آن قرار بده (نه کل آرشیو گزارش‌ها).
2. `.env`، پوشه `data/`، کلیدهای خصوصی، وزن‌های مدل و فایل‌های حساس را کامیت نکن.
3. در Actions گردش کار `FEZI AGENT CI` تست‌ها را اجرا می‌کند.
4. برای استقرار اختیاری به cPanel، Secretهای `CPANEL_HOST`، `CPANEL_USER`، `CPANEL_SSH_KEY`، `CPANEL_KNOWN_HOSTS`، `CPANEL_APP_DIR`، در صورت نیاز `CPANEL_PORT` را در GitHub Actions تنظیم کن؛ بعد workflow `Deploy FEZI AGENT to cPanel (SSH)` را دستی اجرا کن.
5. SSH باید در هاست فعال باشد؛ بدون SSH از cPanel File Manager برای آپلود ZIP استفاده کن و Node App را دستی Restart کن.
6. متغیرهای اپ را **روی cPanel** تنظیم کن؛ به GitHub Workflow منتقل نکن. این Workflow به فایل‌های `data` و `.env` روی سرور دست نمی‌زند.

## ۵. محدودیت‌ها

- بدون توکن واقعی BotFather نمی‌توان `setWebhook` یا `getUpdates` را برای ربات دلخواه فعال کرد.
- GitHub مخزن نگهداری سورس و Actions است، نه میزبان همیشگی سرور Telegram یا Ollama.
- بات پیش‌فرض فقط برای شناسه‌های مجاز فعال است؛ انتشار عمومی به سامانه حساب کاربران، مجوزها و محدودیت هزینه نیاز دارد.
- `FEZI AGENT` در رابط نشان داده می‌شود؛ جزئیات موتور در پیکربندی فنی باقی می‌ماند.


## ۶. کد جدید: استقرار سریع با GitHub CLI

روی کامپیوتر یا سرور شخصی GitHub CLI را نصب کن، با حساب **موردنظر خودت** `gh auth login` بزن و سپس:

```bash
node scripts/publish-github.mjs --repo YOUR_GITHUB_USERNAME/fezi-agent --private --confirm
```

اسکریپت فقط پس از تأیید صریح، Git را تنظیم می‌کند و فایل‌های پروژه را در مخزن شخصی انتخاب‌شده می‌فرستد. فایل `.env`، پوشه data و وزن مدل‌ها از انتشار حذف شده‌اند. برای نصب روی cPanel به تنظیمات Deploy Workflow یا آپلود دستی نیاز است. **اسکریپت به‌خودی‌خود هاست یا BotFather را فعال نمی‌کند.**

## ۷. راه‌اندازی ربات روی یک سرور Docker (Polling)

ابتدا شناسه تلگرام را از فرمان `/id` یا `npm run telegram:id` دریافت کن. تنظیمات `.env` شامل BotFather token، `TELEGRAM_ALLOWED_USER_IDS`، `APP_PASSWORD`، `SESSION_SECRET` و آدرس مدل باید کامل باشند. سپس:

```bash
docker compose -f compose.telegram.yaml up -d --build
```

`app` و `bot` در namespace شبکه مشترک اجرا می‌شوند، بنابراین رمز مدیریتی FEZI AGENT از طریق اینترنت عمومی قابل دسترس نمی‌شود. Bot به API رسمی Telegram متصل می‌شود؛ برای پاسخ هوشمند باید سرویس مدل نیز آماده باشد. برای دیدن خطاها از `docker compose -f compose.telegram.yaml logs -f bot` استفاده کن.

برای کامپیوتر بدون Docker، بعد از Node.js 22، برنامه اصلی و Poller را در دو پردازش جدا اجرا کن.

## ۸. ابزارهای دسکتاپ

برای ویرایش پروژه‌ها روی کامپیوتر دکمه «⌘ محیط دسکتاپ» را بزن یا دستور `npm run desktop:list` را اجرا کن. اطلاعات در `docs/DESKTOP_EDITORS_FA.md` آمده است.
