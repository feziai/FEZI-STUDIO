# FEZI Studio v1.01 — راه‌اندازی سه ربات و GitHub

## وضعیت خروجی
این یک بسته کامل source است، نه سایت منتشرشده. کدهای اتصال حساب، ۳ worker ربات، مینی‌اپ‌ها، پرامپت‌ها، آرینا، کاتالوگ مدل‌ها، صفحات و تست‌های قبلی حفظ شده‌اند. در محیط توسعه، HTTP و تست‌های بدون کلید اجرا شده‌اند. هیچ توکن BotFather، GPU، تأیید پرداخت یا استریم ۲۴ساعته واقعی در این بسته فعال نیست.

## کلیدهای لازم — در چت نفرست
برای اجرا، روی هاست HTTPS این متغیرها در **Environment / Secrets** لازم‌اند:

| نوع | Environment Variable | ضروری؟ |
|---|---|---|
| دامنه واقعی HTTPS | `PUBLIC_BASE_URL` | بله |
| رمز مدیر سایت | `APP_PASSWORD` | بله |
| امضای Session وب | `SESSION_SECRET` | بله، تصادفی و طولانی |
| ربات FEZI Studio | `TELEGRAM_FEZI_BOT_TOKEN`, `TELEGRAM_FEZI_BOT_USERNAME` | بله |
| ربات آرینا | `TELEGRAM_ARINA_BOT_TOKEN`, `TELEGRAM_ARINA_BOT_USERNAME` | بله |
| ربات ورود سریع | `TELEGRAM_LOGIN_BOT_TOKEN`, `TELEGRAM_LOGIN_BOT_USERNAME` | بله |
| ارتباط امن سرور و ربات‌ها | `TELEGRAM_INTERNAL_TOKEN` | بله، مقدار تصادفی ۳۲ کاراکتری یا بیشتر، جدا از Bot Token |
| موتور چت واقعی | `AI_BASE_URL`, `AI_API_KEY`, `DEFAULT_MODEL` **یا** یک Ollama/worker محلی فعال | برای پاسخ AI بله |
| OpenRouter | `OPENROUTER_API_KEY` در صورت استفاده از آداپتر مربوطه | اختیاری |
| Hugging Face | `HF_TOKEN` با دسترسی Inference Providers | اختیاری |
| GitHub API از داخل سایت | `GITHUB_TOKEN` با مجوز محدود Contents | اختیاری؛ برای Push خود سایت |
| تصویر/ویدیوساز | `FEZI_GPU_WORKER_URL`, `FEZI_GPU_WORKER_TOKEN` | درصورت نیاز به GPU |
| ایمیل تأیید | `RESEND_API_KEY`، دامنه فرستنده تأییدشده | برای تأیید واقعی ایمیل |
| پرداخت | وبهوک پرداخت تأییدشده و `ARINA_PAYMENT_WEBHOOK_SECRET` | برای پرداخت واقعی |
| لایو یوتیوب/اینستاگرام | کلید RTMP/stream و سرور encoder مجاز | برای استریم خارجی |

**کلید GitHub برای نصب سه ربات الزامی نیست.** اتصال GitHub فعلی دسترسی خواندن دارد، اما در این محیط نوشتن به FEZI-STUDIO با خطای 403 رد شد. برای رفع، در تنظیمات GitHub App مجوز Repository Contents: Read & Write و دسترسی به مخزن FEZI-STUDIO را بررسی و تأیید کن. کلیدها را داخل مکالمه یا مخزن عمومی قرار نده.

## اجرای سایت و ربات‌ها
1. فایل ZIP را Extract کن. داخل ریشه باید `server.js`, `package.json`, `core/`, `public/`, `scripts/` وجود داشته باشد.
2. هاست Node.js 22+ با آدرس HTTPS تنظیم کن؛ `APP_PASSWORD`, `SESSION_SECRET`, `PUBLIC_BASE_URL` را تنظیم کن.
3. سرور را با `npm start` اجرا کن. `https://YOUR-DOMAIN/health` و `https://YOUR-DOMAIN/telegram-connect` باید پاسخ دهند.
4. سه ربات مجزا در @BotFather بساز؛ Token و Username هر کدام را در محیط محرمانه هاست قرار بده.
5. برای تشخیص موارد ناقص: `npm run telegram:bridge:doctor`.
6. دکمه Mini App ربات FEZI: `npm run telegram:miniapps:setup -- --bot=fezi --apply`؛ در @BotFather Main Mini App = `https://YOUR-DOMAIN/studio`.
7. دکمه Mini App ربات آرینا: `npm run telegram:miniapps:setup -- --bot=arina --apply`؛ در @BotFather Main Mini App = `https://YOUR-DOMAIN/arina-live`.
8. worker شماره ۱: `TELEGRAM_MODE=public-polling npm run telegram:public`؛ worker شماره ۲: `npm run telegram:arina`؛ worker شماره ۳: `npm run telegram:login`.
9. هر worker باید پردازه دائمی مستقل داشته باشد. هاست cPanel اشتراکی ممکن است چنین اجازه‌ای ندهد. در آن حالت worker را روی سرور جدا اجرا کن و درگاه داخلی FEZI را با اتصال احراز هویت‌شده محدود کن؛ فعلاً کلاینت داخلی فقط به `127.0.0.1` وصل می‌شود.

## اتصال حساب و ورود
- کاربر در FEZI ثبت‌نام می‌کند، به `/telegram-connect` می‌رود و کد یک‌بارمصرف می‌گیرد.
- در FEZI Studio Bot دستور `/link CODE` را ارسال می‌کند.
- هنگام ورود جدید، صفحه `/telegram-connect` یک درخواست جدا ایجاد می‌کند و کاربر Login Bot را با `Start` تأیید می‌کند؛ سپس به همان مرورگر بازمی‌گردد تا ورود کامل شود.
- امضای داده‌های Mini App هم در سرور بررسی می‌شود. **نام کاربری تلگرام یا Start به تنهایی هیچ دسترسی به حساب نمی‌دهد.**
- ربات با `/account` فقط پروفایل متصل و اعتبار واقعی تأییدشده آرینا را به صاحب آن حساب نشان می‌دهد.
- لینک‌های اشتراک پست عمومی از API `/api/telegram/share-options` به نام سازنده ساخته می‌شوند. آثار خصوصی یا ردشده قابل اشتراک خودکار نیستند.

## پرداخت و Gift
نمایش اعتبار آرینا برای حساب لاگین‌شده از شناسه همان حساب استفاده می‌کند. اعتبار فقط پس از تأیید واقعی پرداخت به حساب می‌رود. «هدیه در تلگرام» و خرید محتوای دیجیتال داخل ربات باید از راهکار پرداخت منطبق با مقررات تلگرام (معمولاً Stars) پیروی کنند؛ صرف داشتن آدرس ارز دیجیتال برای پرداخت درون‌برنامه‌ای کافی نیست.

## انتشار GitHub
مخزن مقصد: `https://github.com/feziai/FEZI-STUDIO` (عمومی). فایل‌های خصوصی `private/`, داده‌های کاربر `data/`, توکن‌ها و مدل‌های حجیم نباید به GitHub منتقل شوند.

پس از احراز هویت با GitHub CLI در دستگاهی که اینترنت دارد:
```
gh auth login
bash scripts/github-safe-push.sh --confirm
```
این اسکریپت مخزن را Clone می‌کند، فایل‌های مجاز را با حفظ فایل‌های قبلی اضافه می‌کند، تغییرات را نشان می‌دهد و **فقط با تأیید صریح YES** Push می‌کند. Force-push انجام نمی‌دهد. ZIP را به‌طور مستقیم در GitHub.com هم می‌توان آپلود کرد، اما ابتدا باید Extract شود؛ با آپلود ZIP تنها، GitHub Actions نمی‌تواند پروژه Node.js داخل آن را اجرا کند.

Workflow فعلی `.github/workflows/ci.yml` تست Node.js را اجرا می‌کند. برای دیپلوی SSH cPanel از `.github/workflows/deploy-cpanel.yml` و Secrets `CPANEL_HOST`, `CPANEL_USER`, `CPANEL_SSH_KEY`, `CPANEL_APP_DIR`, `CPANEL_KNOWN_HOSTS` استفاده می‌شود. تا قبل از تست و پشتیبان‌گیری روی سایت فعال، دیپلوی را دستی نگه دار.

## توسعه بعدی
یک API بیرونی معتبر برای چت (مثل OpenRouter/Hugging Face)؛ GPU worker تصویر/ویدیو؛ سرویس ایمیل؛ پرداخت تأییدشده؛ worker استریم. هیچ کدام فقط با قرار دادن کلید در فایل، «فعال و تست‌شده» محسوب نمی‌شوند.
