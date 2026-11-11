# FEZI STUDIO v2.0 — ادغام واقعی با v1.9

این یک نسخه FULL از FEZI STUDIO است؛ هیچ‌کدام از فایل‌های v1.9 حذف نشده‌اند. کل بک‌اند Node.js و APIها، UI سفید/آبی/صورتی، Arina، Prompt Library و زیرساخت قبلی در بسته حضور دارند.

## ۱) GeneratePrompt.net

**واردکردن همه پرامپت‌ها هنوز تأیید نشده.** در این محیط خروجی HTTPS برای دریافت آرشیو GeneratePrompt در دسترس نبود. ۹۱ پرامپت اصلی بسته قبلی حفظ شده و هیچ پرامپت خارجیِ ناقص یا فرضی وارد نشده است.

برای انتقال واقعی همه موارد از آرشیو مالک، `JSONL.GZ` توصیه می‌شود؛ برنامه `scripts/import-generateprompt.mjs` اکنون JSON، JSON.GZ، JSONL، JSONL.GZ، NDJSON، NDJSON.GZ را قبول می‌کند. عنوان، متن، تصاویر و ویدیوهای معتبر و چندگانه را حفظ می‌کند و تکراری‌ها را حذف می‌کند. برای آرشیو خصوصی استفاده از `--export` به جای crawl عمومی توصیه می‌شود.

مثال: `npm run prompts:generateprompt -- --export /secure/export.jsonl.gz --owner-confirmed --commit`.

## ۲) بسته اول ۲۵ مأموریت واقعی FEZI Agent

شناسه `CODE-00001` تا `CODE-00025`، هر کدام فایل آموزشی مستقل دارند: مبانی، راهکار، اجرای قابل تکرار، ده بررسی محلی، خطاها، پرسش‌ها و مستندات رسمی. این درس‌ها پیش‌نویس‌اند؛ پیاده‌سازی‌های Python/Node/Telegram mock در ۲۵۰ بررسی مشترک پاس شده‌اند. پس از بررسی انسانی کیفیت (حداقل امتیاز ۸۵) و تأیید مدارک، در فهرست RAG قابل انتشار قرار می‌گیرند؛ فعلاً فقط draft staging داریم.

مسیرها:
- `academy/fezi-100k/lessons/CODE/` — درس‌ها
- `academy/fezi-100k/progress.json` — گزارش پیشرفت واقعی
- `academy/fezi-100k/reports/batch01-tests.json` — ۲۵۰ بررسی
- `academy/fezi-100k/rag/knowledge.sqlite3` — SQLite FTS5 مرحله‌بندی‌شده
- `academy/fezi-100k/rag/reviews.json` — صفر تأیید انسانی؛ برای انتشار علم به مدل‌ها صرفاً بعد از بررسی

برای اجرای تست‌ها: `npm test`، `npm run academy:batch01` و `npm run academy:rag-stage`.

**تنها آزمایش‌ها و عملیات محلی انجام شده‌اند**. اتصال واقعی Telegram/cPanel/GPU و Fine-tuning مدل‌ها نیازمند دسترسی و تنظیمات دارند؛ هیچ آموزش وزن مدل در این نسخه انجام نشده است.
