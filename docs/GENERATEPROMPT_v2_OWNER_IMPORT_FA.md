# انتقال GeneratePrompt.net — داده واقعی در اولویت

تمام فهرست عمومی سایت (عکس/ویدیو/وب/متن) از نظر مسیرها بررسی شد، ولی محیط ساخت فایل دسترسی HTTPS خروجی برای دریافت تمام صفحات یا آرشیو خصوصی ندارد. ۹۱ پرامپت قبلی حفظ شدند؛ رکورد تازه از GeneratePrompt بدون دریافت کامل واقعی به صورت موفق ثبت نشد.

## راه انتقال کامل با حداقل RAM

از خروجی مالک با قالب `JSON`, `JSONL`, `NDJSON`, `JSON.GZ`, `JSONL.GZ`, `NDJSON.GZ` استفاده کن. هر خط JSONL یک پرامپت مستقل است. فیلدهای ضروری: `sourceUrl`, `title`, `prompt`, `kind`, `category`; برای چند عکس/ویدیو `media` آرایه باشد. متن کامل باید واقعاً وجود داشته باشد، نه snippet.

Dry-run بدون ثبت:

`node scripts/import-generateprompt.mjs --export /secure/archive.jsonl.gz`

ثبت پس از بررسی حقوق محتوای موجود در آرشیو:

`node scripts/import-generateprompt.mjs --export /secure/archive.jsonl.gz --owner-confirmed --commit`

خروجی: `data/prompts-v16/generateprompt-last-sync.json`. اگر رسانه‌های دامنه بیرونی روی FEZI نمایش داده نشدند باید CSP/hotlink/CORS وب‌سایت منبع بررسی شود. قول نمایش بدون همکاری سایت منبع نمی‌توان داد.

شمار انتقال کامل فقط با مقایسه شناسه‌ها با گزارش export دیتابیس اصلی قابل اثبات است. تنها مالکیت دامنه به خودی خود حق توزیع آثار آپلودشده شخص ثالث را ایجاد نمی‌کند.
