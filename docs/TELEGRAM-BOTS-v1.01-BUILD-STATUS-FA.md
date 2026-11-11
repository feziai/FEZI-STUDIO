# FEZI Studio v1.01 — وضعیت واقعی سه ربات و GitHub

**مبنای کار:** پروژه قبلی FEZI Studio؛ انتشار سایت متوقف می‌ماند تا تأیید صریح مالک برسد.

## اجرا و امکانات کدنویسی‌شده

### FEZI Studio Bot
- `/start`, `/help`: راهنمای فارسی/انگلیسی؛ Mini App اصلی `/studio`.
- `/link CODE`: اتصال یک‌بارمصرف به حساب ثبت‌نام‌شده FEZI.
- `/account`, `/wallet`: فقط در گفت‌وگوی خصوصی، پس از احراز هویت، مانده تأییدشده آرینا.
- `/chat MESSAGE`: اتصال به چت FEZI از سرور محلی و کلید جداگانه داخلی؛ فقط کاربر ثبت‌نام‌شده.
- `/image PROMPT`: درخواست عکس با سهمیه ۳ خروجی موفق در روز؛ **نیازمند worker واقعی تصویر**؛ نبود worker هیچ خروجی جعلی تولید نمی‌کند و سهمیه کسر نمی‌شود.
- `/quota`: نمایش سهمیه.
- `/video`, `/app`, `/telegram`, `/website`: هدایت به بخش‌های سازنده در سایت، نه ادعای تولید مستقیم فایل در تلگرام.
- `/studio`, `/arina`, `/login`: باز کردن مسیر استودیو و ربات‌های مرتبط.
- `/share`: راهنمای اشتراک‌گذاری فقط آثار عمومی تأییدشده.
- `/motivate on`, `/motivate off`: پیام روزانه با رضایت؛ دوباره در یک روز تکرار نمی‌شود.
- حضور در گروه: پاسخ فقط به `/help`, `/chat`, `/ask`, `/studio`, `/arina`؛ هیچ پیام عادی گروه خوانده نمی‌شود. چت نیازمند حساب متصل است. دسترسی خصوصی حساب در گروه نمایش داده نمی‌شود.

### Arina Bot
- `/live`: Mini App آرینا `/arina-live`؛ نمایش آن به‌معنی فعال بودن RTMP واقعی نیست.
- `/chat MESSAGE`: پاسخ هوش مصنوعی از پل محافظت‌شده سایت (فقط حساب متصل و مدل فعال).
- `/album`, `/tip`, `/private`, `/account`, `/status`, `/fezi`: دسترسی به بخش‌های موجود با وضعیت صادقانه.
- کیف پول هدایا تنها پس از تأیید واقعی پردازشگر شارژ می‌شود.
- پخش تلویزیونی ۲۴ساعته/RTMP/آهنگ دارای مجوز به سرویس‌های خارجی نیاز دارد و فعلاً راه‌اندازی نشده است.

### Fast Login Bot
- `/start login_CODE`: تأیید درخواست مرورگر بر پایه درخواست یک‌بارمصرف و هویت واقعی تلگرام.
- تکمیل ورود تنها در همان مرورگری که `browserSecret` را نگه داشته امکان‌پذیر است.
- تنها کاربران ثبت‌نام‌شده و پیش‌تر متصل به ربات اصلی پذیرفته می‌شوند.

## GitHub — مهم
- مخزن موجود: `feziai/FEZI-STUDIO`، شاخه اصلی `main`.
- GitHub نام `Fezi-Studio` و `FEZI-STUDIO` را برای یک مالک دو مخزن متمایز نمی‌داند؛ هر دو به همین نام می‌رسند.
- تلاش مستقیم با GitHub connector برای ساخت فایل و شاخه، خطای **403 Resource not accessible by integration** داد.
- محیط ساخت نیز DNS به github.com و api.github.com ندارد؛ بنابراین از **GitHub PAT ارسال‌شده استفاده نشده** و هیچ Commit واقعی آپلود نشده است.
- در این بسته، اسکریپت `scripts/github-stage-bots-v101.sh` فقط روی یک سیستم دارای اتصال و مجوز، شاخه `development/v1.01-telegram-bots` را می‌سازد/به‌روزرسانی می‌کند؛ روی `main` تغییری نمی‌دهد و سایت را Deploy نمی‌کند.
- ساخت مخزن ثانویه برای اپ مستقل با نام پیشنهادی `FEZI-STUDIO-APP` انجام نشده و نیازمند اتصال GitHub دارای مجوز است.
- عکس جدید لوگو هنوز به گفتگو پیوست نشده؛ لوگوی اصلی موجود در `public/brand/fezi-rabbit-f.png` حفظ شده است. Social Preview مخزن و آواتار ربات‌ها مستلزم اقدام در GitHub Settings و BotFather است.

## کلیدهای تکمیلی مورد نیاز
- `PUBLIC_BASE_URL`: دامنه قطعی HTTPS
- `APP_PASSWORD`, `SESSION_SECRET`, `DATA_DIR`: مدیر و ذخیره پایدار
- `TELEGRAM_FEZI_BOT_TOKEN`, `TELEGRAM_FEZI_BOT_USERNAME`
- `TELEGRAM_ARINA_BOT_TOKEN`, `TELEGRAM_ARINA_BOT_USERNAME`
- `TELEGRAM_LOGIN_BOT_TOKEN`, `TELEGRAM_LOGIN_BOT_USERNAME`
- `TELEGRAM_INTERNAL_TOKEN`: راز مجزای حداقل ۳۲ کاراکتر برای پل اتصال
- `OPENROUTER_API_KEY` / `HF_TOKEN`: ارائه‌دهنده اختیاری چت؛ صرف داشتن کلید اجرای مدل را تأیید نمی‌کند
- `FEZI_TELEGRAM_IMAGE_WORKER_URL`, `FEZI_TELEGRAM_IMAGE_WORKER_TOKEN`: سرویس واقعی تولید عکس؛ endpoint دقیق `/generate-image`، پاسخ JSON با `imageUrl` معتبر HTTPS یا `fileId` تلگرام
- SMTP یا Resend و دامنه فرستنده: تأیید ایمیل کاربران
- Telegram Stars: صورت‌حساب دیجیتال در Mini App/ربات، همراه با وبهوک و تست واقعی و سیاست پلتفرم
- سرویس HLS/RTMP، GPU worker، موسیقی دارای مجوز و کلید پلتفرم: استریم واقعی آرینا
- دسترسی GitHub contents:write و اتصال شبکه/هاست برای ارسال کد

## امنیت
- تمام Bot Token و API Key فایل‌های گفتگو در معرض دسترسی محیط چت قرار گرفته‌اند و **باید پیش از استفاده عمومی تعویض شوند**.
- هیچ توکن محرمانه‌ای در ZIP یا Git قرار ندارد؛ از فایل ارسالی به‌صورت خودکار داخل سورس کپی نشده است.
- استفاده از کد متن‌باز و داشتن API به‌معنای رایگان‌بودن اجرای مدل نیست.
- ربات‌ها فقط پس از تنظیم سرویس و دسترسی دائمی پردازه می‌توانند ۲۴ساعته کار کنند؛ هاست cPanel اشتراکی ممکن است مانع باشد.

## اجرا (بعد از تعویض کلیدها و تعیین دامنه)
```
npm test
npm run telegram:bridge:doctor
npm run telegram:miniapps:setup -- --bot=fezi --apply
npm run telegram:miniapps:setup -- --bot=arina --apply
TELEGRAM_MODE=public-polling npm run telegram:public
npm run telegram:arina
npm run telegram:login
```
هر کدام از ۳ فرمان آخر باید **در پردازه دائمی مستقل** اجرا شود. بدون سرویس دائمی ۲۴ساعته فعال نخواهد بود. اجرای محلی تست‌ها با اجرای اینترنتی ربات متفاوت است.
