# واردسازی کامل آرشیو GeneratePrompt.net به FEZI Studio

این قابلیت روی پروژه کامل FEZI Studio نصب شده است؛ ۹۱ پرامپت اصلی فعلی حذف نمی‌شوند. **در فایل ZIP اولیه هنوز هیچ متن کامل اضافی از GeneratePrompt.net وارد نشده**، چون محیط ساخت بسته به آرشیو خصوصی/خروجی دیتابیس سایت و دسترسی خروجی HTTPS دسترسی نداشت. «امکان همگام‌سازی» به معنی «انتقال کامل تأییدشده» نیست.

## روش ۱ — مطمئن‌ترین روش: JSON Export سایت متعلق به شما

از پنل دیتابیس یا مدیریت GeneratePrompt.net یک خروجی JSON از همه رکوردهای منتشرشده تهیه کنید. حداقل فیلدهای لازم برای هر رکورد:

```json
[
  {
    "sourceUrl": "https://generateprompt.net/image-prompts/YOUR_REAL_PROMPT_SLUG",
    "title": "Actual prompt title",
    "description": "Description",
    "category": "Fashion",
    "kind": "image",
    "prompt": "FULL ACTUAL PROMPT TEXT HERE",
    "media": [
      {"type":"image","url":"https://res-a.generateprompt.net/YOUR_IMAGE.webp"},
      {"type":"image","url":"https://res-a.generateprompt.net/SECOND_IMAGE.webp"},
      {"type":"video","url":"https://res-a.generateprompt.net/YOUR_VIDEO.mp4"}
    ],
    "tags": ["Fashion", "Portrait"]
  }
]
```

این صرفاً **قالب** است؛ لینک‌ها و متن مثال، داده واقعی واردشده نیستند. فیلدهای `url`، `name`، `content`، `promptText`، `images` نیز پشتیبانی می‌شوند. URL باید متعلق به GeneratePrompt.net و هر رسانه باید در زیردامنه مجاز همان سایت باشد. برای جلوگیری از نمایش نادرست، موردی که متن کامل ندارد کنار گذاشته می‌شود.

### ورود از وب‌سایت FEZI

۱. وارد حساب مالک در FEZI شوید.
۲. `/admin/prompts` را باز کنید.
۳. در بخش **GeneratePrompt.net · Owner archive sync**، فایل JSON را انتخاب و مالکیت خود را تأیید کنید.
۴. روی **Import entire JSON archive** بزنید. انتقال در بسته‌های ۱۰۰ رکوردی انجام می‌شود. موارد تکراری دوباره اضافه نمی‌شوند.
۵. `/prompts` را باز کنید. تصاویر/ویدیوها مستقیماً از دامنه اصلی لینک می‌شوند؛ فایل‌ها دانلود و کپی محلی نمی‌شوند.

### ورود از ترمینال Node.js روی cPanel

از داخل ریشه پروژه:

```bash
# پیش‌نمایش بدون نوشتن
npm run prompts:generateprompt -- --export /home/USER/private/generateprompt-export.json

# ثبت واقعی (پس از بررسی مالکیت آرشیو)
npm run prompts:generateprompt -- --export /home/USER/private/generateprompt-export.json --owner-confirmed --commit
```

اگر واردسازی را از CLI انجام دادید، برای بارگذاری اطلاعات جدید یا برنامه Node.js را ری‌استارت کنید یا در `/admin/prompts` روی **Reload CLI-imported prompts** کلیک کنید.

## روش ۲ — کشف از سایت عمومی (ممکن است کامل نباشد)

روی سروری که به GeneratePrompt.net دسترسی خروجی دارد:

```bash
npm run prompts:generateprompt -- --crawl --owner-confirmed --commit --limit 300
```

این ابزار فقط URLهای همان سایت را می‌خواند. برای شناسایی از `sitemap.xml`، `robots.txt` و صفحات دسته‌بندی Image، Video، Website، Text و مدل‌های خاص استفاده می‌کند. از هر صفحه عنوان، متن **کاملِ قابل دریافت**، دسته‌بندی، تصاویر و ویدیوها را استخراج می‌کند. اگر JavaScript سایت متن را فقط بعد از لاگین/درخواست API نمایش بدهد، استخراج امن همان مورد را `skipped` گزارش می‌کند؛ برای آن بخش حتماً از خروجی JSON استفاده کنید. برای آرشیو بسیار بزرگ، دستور را چند بار اجرا کنید تا `remainingBeforeRun` به صفر برسد. تعداد کشف‌شده به معنای پوشش کامل دیتابیس نیست.

### محدودیت واقعی محیط ساخت فایل

در زمان ساخت این ZIP، دریافت HTTPS از GeneratePrompt.net در محیط اجرا به علت عدم دسترسی DNS امکان‌پذیر نبود. بنابراین **هیچ ادعایی درباره انتقال کامل متن، شمار کل پرامپت‌ها یا موفق‌بودن crawl آنلاین نشده است**. پس از اجرای importer روی سرور، خروجی `data/prompts-v16/generateprompt-last-sync.json` شمار دقیق اضافه‌شده/ردشده را ثبت می‌کند.

## قابلیت‌های بخش پرامپت

- جستجوی متن/عنوان، فیلتر نوع و دسته، کارت با تصویر یا ویدیو
- Copy prompt و Use in Studio، نمایش چند رسانه در جزئیات
- صفحه مستقل هر مورد و sitemap قابل ایندکس
- صفحه‌بندی خودکار زمانی که تعداد از ۱۵۰ بیشتر شود؛ بارگذاری ۴۸ مورد در هر مرحله
- حفظ URL منبع کوچک در انتهای صفحه پرامپت
- تأیید مالک و کنترل مجوز رسانه؛ ورود مالک برای واردسازی ضروری است
- در صورت غیرقابل‌دسترس بودن عکس از دامنه دیگر، هاست GeneratePrompt باید نمایش رسانه با آدرس مستقیم و hotlink به دامنه FEZI را اجازه دهد.

## آزمون‌ها

`node --test tests/generateprompt-sync.test.js tests/prompt-library-v16.test.js` و `npm test`.

**آموزش‌های ۱۰۰هزار مأموریتی FEZI در این مرحله شروع نشده‌اند**؛ ابتدا باید واردسازی کامل از نسخه واقعی آرشیو و بررسی کیفیت انجام شود.
