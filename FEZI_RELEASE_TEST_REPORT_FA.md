# گزارش تست FEZI Studio — ۹ نوامبر ۲۰۲۶

**مبدأ:** `FEZI_STUDIO_WITH_WEBSITE_CONTROLLER_V101_NODE22_2026_11_09.zip`

**ادغام:** مسیر MCP اختصاصی کنترلر، ۳ ابزار دانش و آمادگی، بانک Scholar، بانک Telegram Bot Maker، راهنمای Video 5s، کاتالوگ ۴۰ ابزار MCP Apps، ۴ اسکیل مرجع FEZI Agent، صفحه مدیریتی دانش و اطلاعات اتصال.

## تست‌ها

- `node --test tests/fezi-scholar-telegram-unification.test.mjs`: **۹ موفق، صفر شکست**.
- `node --test tests/fezi-agent-skills.test.mjs`: **۴ موفق، صفر شکست**.
- `npm test`: **۵٬۶۶۸ موفق، صفر شکست**، خروجی TAP با `duration_ms` حدود ۶٫۴ ثانیه.
- `node scripts/fezi-unified-doctor.mjs`: تمام فایل‌های لازم موجود و نسخه Node.js 22 تأیید شد. اتصال خارجی را بررسی نمی‌کند.
- سرور آزمایشی Node.js روی loopback: `/health`, `/ai-chat`, `/plugins/telegram-builder`, `/fezi-agent/knowledge`, `/fezi-agent/knowledge.js`, `/api/fezi/knowledge/search` و `/api/fezi/launch/readiness` پاسخ صحیح داشتند.
- حفاظت: چهار مسیر خصوصیِ دانش/وضعیت و MCP بدون مجوز **401**؛ MCP با Bearer آزمایشی مجاز، `tools/list` را با **۱۶ ابزار** ارائه داد. ابزار `fezi_knowledge_search` نتیجه مستند از Scholar، Telegram و MCP UI برگرداند.
- لوگوی سایت با ورود مدیر **HTTP 200** دریافت شد.
- اسکن حساسیت: ۱٬۲۱۴ فایل متنی/کد بررسی شد؛ ۳۶ امضای محرمانه استخراج‌شده از فایل تنظیمات قبلی مقایسه شد؛ **۰ تطابق واقعی**.

## انجام‌نشده / نیازمند محیط استقرار

- Docker در محیط تست موجود نیست؛ اجرای کانتینری واقعی آزمایش نشده است.
- HTTPS عمومی، دامنه واقعی، OAuth/gateway برای ChatGPT، webhook واقعی Telegram، APIهای Scholar و video generation و GPU وجود ندارند یا در این آزمون به آن‌ها متصل نشده‌ایم.
- پلاگین‌های خصوصی ChatGPT با نصب سورس، به‌طور خودکار در ChatGPT نصب یا به این MCP متصل نمی‌شوند.
- تصاویر خاصی از گفتگوهای Scholar با نسبت‌دادن قابل تأیید در آرشیو پیدا نشد؛ فقط لوگوی برند قبلی به صفحه دانش اضافه شد.
- انتشار روی GitHub یا هاست اصلی انجام نشده است.

## معنی وضعیت‌ها

`READY`: فقط مسیر داخلی برنامه ثبت و قابل‌راه‌اندازی در Node است؛ `CONFIG_REQUIRED`: متغیر/مجوز/اتصال لازم است؛ `CONFIGURED_UNVERIFIED`: تنظیمات وجود دارند ولی سرویس بیرونی آزمایش نشده؛ `BUNDLED_KNOWLEDGE`: متن و مهارت مرجع موجودند، نه موتور اجرایی آنلاین.
