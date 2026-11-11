# گزارش آزمون نسخه گالری و کیف پول آرینا

- سورس: FEZI Agent v0.77 + FEZI Studio gallery/wallet
- تاریخ: 2026-11-01
- `node --test tests/*.test.js`: **۵٬۴۱۹ تست موفق، صفر شکست** (تمام آزمون‌های پروژه + افزونه گالری).
- مسیرهای `/showcase`, `/arina-live`, `/arina-gallery`, `/arina-wallet`, `/arina-private`, `/api/arina/gallery`, `/api/arina/commerce`, `/arina-gallery/thumb/arina-04.webp`, `/arina-gallery/full/arina-01.webp`, `/arina-gallery/qr/btc.png`: HTTP **200**.
- محافظت premium `/arina-gallery/media/arina-04.webp` بدون اعتبار: **402**؛ تصویر عمومی `/arina-gallery/media/arina-01.webp`: **200**.
- ثبت لایک در API: موفق. درخواست صدور فاکتور با پرداخت غیرفعال: پاسخ `configuration_required` و بدون اعتباردهی.
- وبهوک امضاشده: امضای جعلی رد شد؛ حالت تأییدنشده رد شد؛ پردازش دوباره همان تراکنش بدون شارژ دوباره انجام شد.
- آزمون مرورگر headless با HTTP روی localhost توسط سیاست محیط آزمایشی `ERR_BLOCKED_BY_ADMINISTRATOR` متوقف شد؛ **اسکرین‌شات مرورگری تأیید نشده است**.
- `GitHub` امکان خواندن مخزن `feziai/FEZI-STUDIO` داشت ولی مجوز نوشتن API به خطای `403 Resource not accessible by integration` خورد؛ **آپلود به مخزن یا سایت اصلی انجام نشده**.
- بخش‌های انجام‌نشده: پردازنده on-chain عملیاتی برای ۲۲ شبکه، هویت کاربر، رندر فوتورئال GPU، تماس تصویری واقعی، بینایی AI در تماس.
