# FEZI Agent — کتابخانه اسکیل‌های پلاگین + اولویت ساخت وب‌سایت

**هدف اصلی FEZI Agent:** ساخت سایت، ویرایش و رفع خطا، آماده‌سازی نصب، تست، پیش‌نمایش، انتشار مجاز و Rollback. قابلیت‌های دیگر ثانویه‌اند.

## اضافه‌شده در این بسته

- `core/agent-skills.mjs`: کتابخانه قابل جستجوی اسکیل‌ها و انتخاب خودکار راهنمای مرتبط با درخواست.
- `agent-skills/library/fezi-agent-core/`: ۱۲ اسکیل تخصصی ساخت و مدیریت سایت.
- `agent-skills/library/fezi-studio-plugin/`: ۸ فایل SKILL واقعی که از بسته‌های موجود پلاگین FEZI Studio برداشت شدند.
- `scripts/import-agent-skills.py`: وارد کردن فایل‌های واقعی SKILL.md از آرشیوهای رسمی پلاگین‌های **متعلق به خودتان**؛ فایل‌ها فقط مرجع‌اند.
- `GET /api/fezi/skills?q=site`: فهرست اسکیل‌ها با احراز هویت ادمین.
- نمایش «اسکیل‌های ساخت و ویرایش سایت» در نوار کناری FEZI Agent؛ هدر اصلی تغییر نکرده است.
- موتور FEZI Agent اسکیل‌های مرتبط را پیش از برنامه‌ریزی/ویرایش داخل کانتکست می‌بیند؛ اما فقط از ابزارهای واقعاً پیاده‌سازی‌شده می‌تواند استفاده کند.

## همگام‌سازی تمامی اسکیل‌های دیگر پلاگین‌ها

این بسته شامل ۲۰ SKILL.md عملی در وب‌سایت است، نه کل متن همه اسکیل‌های همه پلاگین‌ها. برای انتقال بقیه، فایل ZIP یا tar.gz **نسخه فعلی پلاگین** را از Plugin Creator دریافت کنید و این دستور را برای هرکدام اجرا کنید:

```bash
python3 scripts/import-agent-skills.py --plugin fezi-studio-premium-suite --archive /path/to/premium-plugin.tar.gz
python3 scripts/import-agent-skills.py --plugin fedi-plugin-maker --archive /path/to/super-plugin.zip
python3 scripts/import-agent-skills.py --plugin fezi-host-manager --archive /path/to/gitfez-plugin.tar.gz
```

از آن پس سرور را Restart کنید. **فقط کپی SKILL.md به سایت دسترسی GitHub، سرور یا سرویس ChatGPT نمی‌دهد.** باید connector / MCP / OAuth جداگانه با مجوز معتبر وصل شود.

## تست

```bash
node --test tests/fezi-agent-skills.test.mjs
```

## محدودیت‌ها

- نصب روی سرور و انتشار زنده بدون مجوز و ابزار واقعی انجام نمی‌شود.
- اسکیل‌های واردشده دستور اجرای کد نیستند؛ مدل آن‌ها را به‌عنوان مرجع مطالعه می‌کند.
- کلید خصوصی یا رمز عبور در آرشیو قرار ندهید.
- هدر سایت، پیکربندی مدل‌ها و سایر امکانات بدون تغییر حفظ شده‌اند.
