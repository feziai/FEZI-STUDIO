# وضعیت انتشار به‌روزشدهٔ FEZI Studio — ۱۱ نوامبر ۲۰۲۶

شاخهٔ Pull Request اکنون آرشیو مرجع `FEZI_STUDIO_GITHUB_26_PLUGINS_FULL_2026_11_11.zip` را با SHA-256 تأییدشده در گزارش ورودی و فایل‌های استخراج‌شدهٔ آن در خود دارد. سورس Node.js 22+، داده‌های سایت، کاتالوگ عمومی، و صفحات استاتیک ۲۶ پلاگین در این نسخه هستند.

## بررسی محلی این نسخه
- ZIP اصلی: ۲۱۵٬۹۸۲٬۳۹۵ بایت؛ سلامت ZIP تأیید شد.
- `npm install --ignore-scripts --package-lock=false`: موفق. `npm ci` در این بسته قابل اجرا نیست چون `package-lock.json` ندارد.
- `npm run pages:build`: ۲۶ صفحهٔ پلاگین تولید شد.
- `npm run pages:test`: ۶ از ۶ تست موفق.
- `npm run github:preflight`: ۹۲۳ فایل متنی بررسی شد؛ الگوی اعتبارنامه پیدا نشد.
- `npm test`: ۵٬۶۸۱ از ۵٬۶۸۱ تست موفق.

## انتشار و فعال‌سازی
- Pull Request عمومی شمارهٔ ۱: https://github.com/feziai/FEZI-STUDIO/pull/1
- سورس در شاخهٔ جداگانه قرار دارد؛ هنوز در `main` ادغام نشده است.
- GitHub Pages تا ادغام PR، انتخاب GitHub Actions در Settings → Pages و موفقیت Workflow منتشرشده تأیید نمی‌شود.
- ۲۶ پلاگین ChatGPT خصوصی باقی می‌مانند. Telegram، MCP، AI runtime، پرداخت FeziPay و هاست به Secretها، سرویس‌های واقعی و تست جداگانه نیاز دارند.
- سورس خصوصی پلاگین‌ها در مخزن عمومی نیست و در مخزن Private جداگانه نگهداری می‌شود.

## مجوزها
مجوز Boost Software License از مخزن مقصد حفظ می‌شود. مجوز MIT داخل آرشیو سورس با نام `LICENSE-FEZI-STUDIO-MIT` نگهداری می‌شود تا مجوز اولیهٔ مخزن مقصد جایگزین نشود. پیش از Merge، مالک باید دامنهٔ مجوز هر بخش و دارایی‌های رسانه‌ای را بازبینی کند.
