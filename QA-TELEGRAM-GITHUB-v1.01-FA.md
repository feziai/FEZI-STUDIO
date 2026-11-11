# FEZI Studio v1.01 — Telegram & GitHub deployment QA

**تاریخ:** 2026-11-04

## کد اضافه شده/اصلاح شده
- سه ربات مستقل: `scripts/telegram-public.mjs` (قبلی + پیوند حساب)، `scripts/telegram-arina-miniapp.mjs` (چت واقعی و حساب)، `scripts/telegram-login-bot.mjs` (جدید).
- امنیت و اتصال: `core/telegram-account-bridge-v101.js`, `core/telegram-bot-bridge-client.js`, `core/studio-v15.js`, `server.js`.
- رابط: `public/telegram-connect.html`, `public/telegram-connect.js` و لینک از صفحه استودیو.
- فروشگاه و آرینا: شناسه حساب ثبت‌نام‌شده برای اعتبار تأییدشده آرینا؛ هیچ اعتبار ساختگی شارژ نمی‌شود.
- اشتراک‌گذاری: API `/api/telegram/share-options` فقط برای مطالبی که کاربر منتشر کرده و مدیر تأیید کرده است.
- انتشار: `scripts/github-safe-push.sh`, `.gitignore`, `ecosystem.config.cjs`, `.env.example`, این مستند.

## تست‌های انجام‌شده
- `node --test tests/*.test.js`: **5484 passed / 5484 executed**, 0 failed.
- تست خاص مسیر کامل از مرورگر به ربات (در محیط HTTP محلی با حساب آزمایشی): ثبت‌نام؛ ساخت کد؛ تأیید با Secret داخلی؛ اتصال هویت عددی تلگرام؛ دریافت چالش login؛ رد کردن درخواست تأییدنشده؛ رد رمز مرورگر غلط؛ ورود موفق؛ ایجاد Cookie نشست؛ مشاهده پروفایل؛ رد استفاده دوباره از کد؛ اشتراک‌گذاری فقط مطلب عمومی.
- `node --check` برای فایل‌های اصلی تغییرکرده: موفق.
- `bash -n scripts/github-safe-push.sh`: موفق.
- `scripts/github-safe-push.sh` در حالت بدون `--confirm`: صرفاً راهنما نمایش می‌دهد و چیزی Push نمی‌کند.
- `scripts/telegram-bridge-doctor.mjs` بدون Secret: به‌درستی موارد لازم را «NEEDS SETUP» اعلام کرد.

## GitHub write failure
- مخزن: `feziai/FEZI-STUDIO`، عمومی؛ `get_repo` با حساب feziai سطح `push/admin` را گزارش داد.
- تلاش ثبت `docs/FEZI_V101_TELEGRAM_DEPLOYMENT.md` از طریق GitHub connector: **403 Resource not accessible by integration**.
- تلاش GitHub `create_blob` نیز **403**. پس **هیچ فایل جدیدی در GitHub Push نشده است**.
- از طرف دیگر، Git CLI محیط ساخت به github.com دسترسی DNS نداشت. نتیجه: لازم است GitHub App در مخزن مجوز Repository Contents: Read & Write داشته باشد، یا اسکریپت Push را روی سیستم خود مالک اجرا کند.
- Workflow cPanel آماده اما چون اصل سورس هنوز در GitHub نیست و Secrets تنظیم نشده‌اند اجرا/تأیید نشده است.

## موارد اتصال واقعی باقی‌مانده
1. BotFather: سه Bot Token و username واقعی؛ حداقل یک دامنه HTTPS معتبر.
2. سرویس AI برای چت؛ در صورت نبود، پاسخ ساختگی برگردانده نمی‌شود.
3. پردازه‌های ماندگار سه bot، یا بازطراحی webhook برای محیط میزبانی؛ shared cPanel ممکن است محدودیت Worker داشته باشد.
4. اعتبارسنجی واقعی مدل GPU برای ساخت عکس/ویدیو، provider ایمیل، processor امن پرداخت، Telegram Stars برای کالاهای دیجیتال، RTMP برای استریم خارجی.
5. GitHub Contents: Read/Write و آپلود واقعی سورس؛ اتصال SSH به هاست برای انتشار عملی.
6. انتشار واقعی روی Android/Telegram Mini App و UI test با BotFather بعد از اتصال.

**هیچ webhook، پرداخت رمزارز، GPU، استریم، Login واقعی BotFather یا GitHub Push بدون وجود کلید/مجوز ادعای موفقیت ندارد.**
