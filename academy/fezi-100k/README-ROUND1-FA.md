# FEZI Agent — اولین بسته آموزشی اجرایی (۲۵ مأموریت)

این بسته بر مبنای ۲۵ شناسه نخست `CODE` در فایل اصلی ۱۰۰٬۰۰۰ موردی تهیه شده است. **۲۵ درس پیش‌نویس**، ۳ نمونه محلی Python/Node/Telegram، ۲۵۰ چک fixture و بانک RAG مرحله‌بندی‌شده دارد؛ آموزش وزن هیچ مدل AI انجام نشده و اتصال API واقعی را بررسی نکرده است.

- `lessons/CODE/*.md` — ۲۵ فایل اختصاصی با مفاهیم، اجرا، حداقل ۱۰ چک، اشکال رایج و منبع
- `examples/` — نمونه‌های عملی
- `tests/run_batch01.py` — اجرای ۲۵۰ چک fixture به صورت local (ده چک برای هر ID با تکرار سناریو)
- `reports/batch01-tests.json` — گزارش واقعی؛ پیش از انتشار دوباره تولید می‌شود
- `progress.json` — شمار واقعی پیش‌نویس و بازبینی و RAG
- `rag/knowledge.sqlite3` — draft_staging قابل جست‌وجوی خصوصی؛ `reviewed_knowledge` فقط برای درس verified و امتیاز >=85

اجرای آزمایش: `python3 academy/fezi-100k/tests/run_batch01.py`

بازسازی جست‌وجوی محلی: `python3 academy/fezi-100k/rag/build_staging.py`

**حالت QA:** بدون امتیاز بازبینی مستقل، هیچ درس به عنوان verified یا knowledge published معرفی نمی‌شود. برای اجرای روی cPanel، Telegram API و fine-tuning به مراحل جدا نیاز است. مثال‌ها آموزشی هستند و به محیط واقعی انتشار وصل نشده‌اند.

مستندات رسمی: https://docs.python.org/3/tutorial/introduction.html ، https://nodejs.org/learn/getting-started/introduction-to-nodejs ، https://core.telegram.org/bots/api
