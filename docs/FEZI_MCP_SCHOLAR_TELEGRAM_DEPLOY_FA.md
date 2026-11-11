# راهنمای انتشار نسخه یکپارچه FEZI Studio + MCP Controller + Scholar + Telegram

تاریخ تهیه: ۹ نوامبر ۲۰۲۶

## ۱. وضعیت بسته

این نسخه روی **آخرین سورس یکپارچه FEZI Studio / Node.js 22 دارای FEZI Website Controller** ساخته شده است؛ تمام فایل‌های قبلی حفظ شده‌اند و منابع بازیابی‌شده از گفتگوهای FEZI به مسیر ثابت `references/fezi-scholar-telegram/` اضافه شده‌اند.

- MCP خصوصی قبلی `/mcp/fezi-agent` حفظ شده است.
- مسیر هم‌ارز اختصاصی کنترلر: `/mcp/fezi-website-controller` با **همان احراز هویت خصوصی**.
- کاتالوگ ۴۰ ابزار MCP Apps UI نیز به‌صورت **مرجع** همراه بسته قرار گرفته؛ این ۴۰ ابزار به‌خودی‌خود به سرورهای اجرایی تبدیل نشده‌اند.
- مهارت‌های FEZI Agent علاوه بر MCP در `agent-skills/library/fezi-scholar-telegram/` نیز به‌صورت فایل‌های مرجع `SKILL.md` وارد شده‌اند.
- مهارت‌های جدید MCP: `fezi_unified_readiness`، `fezi_knowledge_sources`، `fezi_knowledge_search`.
- ابزارهای مهم قبلی: `fezi_site_read`، `fezi_site_preview_replace` و `fezi_site_apply_replace` با تأیید مالک و checkpoint.
- صفحه مالک: `/fezi-agent/knowledge`، شامل وضعیت اتصال‌ها و جست‌وجوی کتابخانه.
- ربات‌ساز Telegram، Plugin Hub، چت مدل‌ها، FeziPay و سایر امکانات قبلی باقی مانده‌اند.

**توجه:** کد نصب‌شده به‌تنهایی نمی‌تواند پلاگین‌های خصوصی ChatGPT را در حساب کاربر فعال کند یا از طرف سرویس‌های خارجی توکن ایجاد کند. فهرست اسکیل‌های Scholar و ویدیو، اتصال زنده API Scholar یا مدل ویدیوساز نیست.

## ۲. مراحل نصب روی هاست Node.js 22

1. فایل `FEZI_STUDIO_ONE_SITE_MCP_SCHOLAR_BOTS_2026_11_09.zip` را استخراج کن. پوشه اصلی `FEZI_STUDIO/` است.
2. برنامه را به یک VPS یا هاست Node.js 22 که پردازش دائمی پشتیبانی می‌کند منتقل کن؛ ترجیحاً فایل‌های حساس و پروژه‌های کاربران روی Volume پایدار باشند.
3. فایل `.env.example` را به `.env` کپی کن. **مقادیر کلیدهای قدیمی ارسال‌شده در گفتگو را استفاده نکن؛ آن‌ها را باطل و تازه صادر کن.** مقدارهای `APP_PASSWORD` و `SESSION_SECRET` قوی و متفاوت باشند.
4. برای MCP یک رشته تصادفی ۳۲ کاراکتری یا بیشتر در `FEZI_AGENT_MCP_TOKEN` بگذار؛ این توکن باید فقط در Secret Manager سرور باشد. `PUBLIC_BASE_URL=https://your-domain.example` را با دامنه واقعی جایگزین کن و HTTPS را روی Reverse Proxy تنظیم کن.
5. روی VPS با Docker:

```bash
docker compose -f compose.final.yaml up -d --build
docker compose -f compose.final.yaml ps
```

یا در هاست Node.js که اجرای دائمی دارد:

```bash
npm run integration:doctor
npm test
npm start
```

این دستورات به ترتیب آمادگی سورس، تست و اجرای سرور را انجام می‌دهند. خروجی `integration:doctor` صرفاً آمادگی تنظیمات را نشان می‌دهد و به سرویس‌های خارجی متصل نمی‌شود. `npm test` برای محیط تولید صرفاً در فرایند CI اجرا شود.

## ۳. اتصال ChatGPT به MCP

- ابزارها از طریق `POST /mcp/fezi-website-controller` یا `POST /mcp/fezi-agent` در **همان سرور** ارائه می‌شوند؛ endpoint با Bearer Token خصوصی محافظت می‌شود.
- توجه: **Bearer اختصاصیِ فعلی لزوماً احراز هویت سازگار با کانکتور ChatGPT نیست**. برای افزودن آن به ChatGPT باید از OAuth یا gateway معتبرِ مورد پشتیبانی استفاده شود. هیچ توکنی را داخل پرامپت یا مخزن GitHub کپی نکن.
- ابتدا `initialize`، سپس `tools/list` و `tools/call` را با یک کلاینت مجاز تست کن و فقط بعد از آن اتصال حساب ChatGPT را آماده اعلام کن.
- ابزارهای `fezi_site_apply_replace` پس از پیش‌نمایش و با `confirm:true`، بررسی SHA و checkpoint اجرا می‌شوند. ذخیره فایل روی سرور **به معنی انتشار روی دامنه نیست**.
- پروژه‌های `sites-project://` داخل ChatGPT با رابط ویرایش همان Sites تغییر می‌کنند؛ داشتن MCP این سرور به‌تنهایی دسترسی مستقیم به فایل‌های آن پروژه‌ها نمی‌دهد.

## ۴. راه‌اندازی ربات مرکزی تلگرام

1. از BotFather برای ربات جدید توکن بگیر؛ مقدار در `.env` سرور: `TELEGRAM_FACTORY_BOT_TOKEN`.
2. مقدار `TELEGRAM_FACTORY_WEBHOOK_SECRET` را به یک مقدار تصادفی و غیرقابل حدس تبدیل کن. شناسه‌های مدیر تأییدشده را در `TELEGRAM_FACTORY_ADMIN_CHAT_IDS` قرار بده.
3. پس از فعال‌شدن HTTPS، ابتدا `npm run telegram:factory:setup` را بدون `--apply` برای dry-run اجرا کن؛ سپس در صورت صحیح‌بودن اطلاعات، `npm run telegram:factory:setup -- --apply` را بزن.
4. با `getWebhookInfo` و پیام آزمایشی در ربات، وصل‌شدن واقعی را تأیید کن. توکن، اسکریپت یا مجوز تلگرام، صرفاً با Publish شدن سایت ایجاد نمی‌شود.

## ۵. Scholar و دانش ساخت ربات

- در صفحه مدیریتی `/fezi-agent/knowledge` سندهای `Telegram_Knowledge_for_Custom_GPT_FA.md`، راهنمای مهارت ساخت ربات، شیوه پژوهش Scholar و راهنمای ویدیو ۵ ثانیه را می‌توان جست‌وجو کرد.
- همه فایل‌های منبع و آرشیوهای مرتبط زیر `references/fezi-scholar-telegram/` نگهداری شده‌اند؛ آن‌ها را نمی‌توان بدون تأیید منبع و ابزار مرتبط، کد اجرایی دانست.
- در آرشیو بازیابی‌شده Scholar **هیچ تصویر مستقلی وجود نداشت**. فایل لوگوی Rabbit-F در `public/fezi-agent/assets/` صرفاً به‌عنوان هویت برند قبلی استفاده شده است و به Scholar نسبت داده نمی‌شود. برای اضافه‌کردن تصاویر دقیق گفت‌وگوی Scholar، باید فایل‌های تصویری آن گفتگو قابل‌شناسایی/دسترسی باشند.

## ۶. موارد آماده و موارد نیازمند پیکربندی

| بخش | نتیجه نصب سورس | مرحله لازم برای آنلاین‌شدن خارجی |
|---|---|---|
| Node.js سایت و صفحات | مسیرها در برنامه ثبت هستند | DNS و TLS، تست دامنه واقعی |
| MCP کنترلر و Scholar/Telegram knowledge tools | برنامه با Node اجرا می‌کند | توکن جدید، HTTPS، gateway/OAuth و تست ChatGPT |
| ربات تلگرام | کد و منوها موجودند | BotFather، webhook، مدیران و ارسال آزمایشی |
| Plugin Hub | کاتالوگ سایت موجود است | نصب/اتصال مستقل پلاگین‌های ChatGPT |
| AI مدل‌های پولی و رایگان | انتخاب مدل و منطق موجود | کلید معتبر، سهمیه و تست استنتاج واقعی |
| Scholar scholarly retrieval | اسکیل و فایل دانش موجود است | API/کانکتور مقاله و بررسی DOI واقعی |
| ویدیوی پنج ثانیه‌ای | راهنمای اجرای مهارت موجود است | اتصال موتور تولید ویدیو و اثبات تحویل MP4 |
| FeziPay | بخش سایت و سفارش‌ها موجود است | تأیید واقعی درگاه/تراکنش، بررسی مالی و قانونی |
| GitHub/CD | فایل‌های CI موجودند | مجوز Contents: write و اتصال واقعی هاست |

## ۷. ایمنی

- کلیدها و توکن‌ها در GitHub، Telegram Knowledge، پرامپت، ZIP عمومی یا log قرار نگیرند.
- قبل از اعمال تغییرات سایت از نسخه قبلی checkpoint و پیش‌نمایش بگیر.
- در فایل‌های اصلی پروژه‌ای که از قبل ساخته شده تغییری ایجاد نکن مگر با اجازه؛ `fezi_site_apply_replace` صرفاً به پروژه مجاز محدود است.
- بعد از انتشار، هم `/health` و هم مسیرهای owner-only و MCP را با و بدون اعتبارنامه تست کن.

## ۸. آزمون انجام‌شده روی این نسخه

نتیجه دقیق `npm test` و تست HTTP در فایل مستقل `FEZI_RELEASE_TEST_REPORT_FA.md` همراه بسته آمده است. اجرای Docker واقعی روی این سیستم ممکن نبود، زیرا Docker در محیط آزمون نصب نبود. نصب روی VPS هنوز انجام نشده است.
