# FEZI Studio v1.01 — Telegram Mini Apps (بدون توکن محرمانه)

این ارتقا **روی همان نسخه کامل v1.01** انجام شده و صفحه‌های اصلی سایت را حذف نکرده است.

## مسیرهای مشخص
- ربات FEZI Studio: `https://YOUR-HTTPS-DOMAIN/studio` — به صفحه اصلی AI Studio باز می‌شود، نه Landing.
- ربات Arina: `https://YOUR-HTTPS-DOMAIN/arina-live` — به همان صفحه لایو و چت آرینا در سایت باز می‌شود؛ اگر ویدیوی واقعی وجود ندارد، همان حالت مرجع/دمو نشان داده می‌شود.
- ربات ورود سریع: جداگانه طراحی می‌شود؛ Mini App بودن به معنای تأیید خودکار حساب نیست.

## تنظیم در هاست
در تنظیمات محرمانه cPanel / Node.js مقدارهای زیر را قرار دهید:

```
PUBLIC_BASE_URL=https://YOUR-HTTPS-DOMAIN
TELEGRAM_FEZI_BOT_TOKEN=<TOKEN FROM BOTFATHER>
TELEGRAM_ARINA_BOT_TOKEN=<TOKEN FROM BOTFATHER>
TELEGRAM_ARINA_BOT_USERNAME=<username without @>
TELEGRAM_MODE=public-polling
```

**هیچ توکنی در ChatGPT، فایل GitHub، یا فایل‌ ZIP عمومی قرار نده.**

پس از راه‌اندازی Node.js و HTTPS، هر کدام را جداگانه با اجرای خشک بررسی کن:
```
npm run telegram:miniapps:setup -- --bot=fezi
npm run telegram:miniapps:setup -- --bot=arina
```

سپس دکمه منوی ربات را با **اعمال واقعی** ثبت کن:
```
npm run telegram:miniapps:setup -- --bot=fezi --apply
npm run telegram:miniapps:setup -- --bot=arina --apply
```

برای دکمه بزرگ `Launch App` در پروفایل هر ربات، در @BotFather مسیر Main Mini App را تنظیم کن. گزینه Menu Button با آن متفاوت است. مستندات رسمی: https://core.telegram.org/bots/webapps

اجرای هر ربات نیازمند **یک پردازه دائم** یا webhook جداست:
- `TELEGRAM_MODE=public-polling npm run telegram:public` برای FEZI Studio Bot.
- `npm run telegram:arina` برای Arina Bot.

در هاست اشتراکی cPanel ممکن است اجرای پردازه‌های دائمی محدود باشد؛ اگر چنین است از سرویس اجرای worker یا webhook دارای HTTPS استفاده کن. دو worker نباید با یک Bot Token به طور همزمان `getUpdates` اجرا کنند.

### امنیت
`Telegram.WebApp.initDataUnsafe` قابل اعتماد نیست؛ کد `core/telegram-miniapps.js` امضای `initData` و انقضای آن را بررسی می‌کند. مسیر `/api/telegram/miniapp/verify` صرفاً هویت تلگرام را تأیید می‌کند و **به‌تنهایی نشست کاربر FEZI نمی‌سازد**. اتصال امن حساب / ورود سریع نیازمند مرحله جداگانه با تأیید کاربر و رمز یک‌بارمصرف است.

### وضعیت عملیاتی
تست‌های محلی برای URL، منو، اعتبارسنجی امضا و مسیرهای اصلی اجرا می‌شوند. `setChatMenuButton` و پخش زنده واقعی هنوز بدون توکن، دامنه HTTPS و سرویس استریم واقعی اجرا نشده‌اند. آدرس `/arina-live` تا وقتی ویدیو/AI واقعی متصل نیست، لایو واقعی ۲۴ساعته محسوب نمی‌شود.
