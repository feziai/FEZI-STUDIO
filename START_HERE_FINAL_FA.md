# FEZI Studio — نصب یک سایت واحد + کنترل ChatGPT + Scholar + Telegram

این نسخه تمامی فایل‌های سورس قبلی را حفظ کرده است. برای نصب کافی است **همین پوشه FEZI_STUDIO** را روی هاست Node.js 22 یا VPS قرار دهید؛ نیاز به نصب جداگانه Scholar یا Telegram Knowledge وجود ندارد.

1. فایل ZIP را استخراج کنید. `.env.example` را به `.env` کپی کنید و رمز/توکن تازه در Secret Manager سرور قرار دهید.
2. `npm run integration:doctor` را اجرا کنید.
3. `npm test` را اجرا کنید و از خطاهای احتمالی گزارش بگیرید.
4. با `docker compose -f compose.final.yaml up -d --build` یا سرویس Node.js دائمی، سایت را اجرا کنید.
5. دامنه HTTPS و DNS را تنظیم و مسیر `/health` را بررسی کنید.
6. با حساب مالک وارد `/fezi-agent/knowledge` شوید و وضعیت Scholar، Telegram، MCP و مدل‌ها را بررسی کنید.
7. برای ربات تلگرام، ابتدا BotFather و متغیرهای `TELEGRAM_FACTORY_*`، سپس `npm run telegram:factory:setup -- --apply` را روی هاست انجام دهید.
8. برای اتصال ChatGPT به MCP لازم است gateway/OAuth سازگار فراهم شود؛ صرفاً واردکردن Bearer Token داخلی در یک متن ChatGPT کافی نیست.
9. برای تغییر سایت از ChatGPT، مسیر `/mcp/fezi-website-controller` و ابزارهای خواندن/پیش‌نمایش/اعمال با تأیید استفاده می‌شود. اعمال فایل به‌معنی Deploy روی دامنه نیست.
10. بعد از تست واقعی Telegram Bot API، پژوهش Scholar، API مدل‌ها و انتشار، می‌توان وضعیت همان سرویس‌ها را از CONFIG_REQUIRED به تأییدشده تغییر داد.

جزئیات در `docs/FEZI_MCP_SCHOLAR_TELEGRAM_DEPLOY_FA.md`، تست‌ها در `FEZI_RELEASE_TEST_REPORT_FA.md` و اسناد منبع در `references/fezi-scholar-telegram/` قرار دارند.

**یادآوری امنیتی:** کلیدهای واقعی قبلی ارسال‌شده در گفتگو باید باطل و جایگزین شوند. سورس و فایل Knowledge برای نگهداری اسرار ساخته نشده‌اند.
