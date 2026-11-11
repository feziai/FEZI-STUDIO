# FEZI Studio — نقشهٔ راه API-first و GitHub-first

## اولویت‌ها
۱. ابتدا مخزن `feziai/FEZI-STUDIO` را با سورس یکپارچه بارگذاری کن. مخزن فعلی فقط README کوتاه دارد. این بسته همه مسیرهای FEZI Agent، Playground، Plugin Hub، Telegram Builder و Studio را در یک پروژه Node.js نگه می‌دارد.
۲. قبل از بارگذاری، اسرار قبلی را ابطال و تعویض کن. فایل `Dotenv.txt` **به هیچ وجه** در مخزن، فایل ZIP عمومی، کد کلاینت یا خروجی لاگ قرار نگیرد.
۳. فقط مقادیر تازه را در محیط خصوصی سرور یا GitHub Secrets ذخیره کن؛ مقادیر داخل `.env.example` صرفاً نام متغیرها هستند.
۴. قابلیت‌های ربات تلگرام زیر یک دامنه کار می‌کنند، اما webhook هر BotFather token باید جدا تنظیم شود. از برنامه قدیمی «Telegram Plugin Builder» داخل `/plugins/telegram-builder` استفاده کن؛ به تنهایی اتصال ربات را راه‌اندازی نمی‌کند.
۵. مدل‌های API نیازمند GPU سرور ما نیستند. مدل‌های GPU-local مستقل‌اند و تا نصب وزن و Worker غیر فعال می‌مانند.

## Free-first API
`OPENROUTER_API_KEY` بعد از تعویض + `OPENROUTER_MODEL=openrouter/free` + `FEZI_AGENT_FREE_ONLY=true`.
نام‌های مدل دارای پسوند `:free` نیز مجازند. مدل‌های OpenRouter پولی حتی اگر یک شناسه اشتباه وارد شود در مسیر OpenRouter رد می‌شوند.
**محدودیت:** مدل‌های رایگان API سهمیه، ظرفیت و محدودیت دارند؛ تضمین ۲۴/۷ نیستند.
`OLLAMA_CLOUD_ENABLED=false` مگر صاحب پروژه بعد از بررسی سقف هزینه و سهمیه آن را آگاهانه روشن کند.
`MISTRAL_API_KEY`، `XAI_API_KEY`، `PERPLEXITY_API_KEY` به‌صورت پیش‌فرض هیچ درخواست خودکاری ندارند.

## Voice کم‌حجم
در حال حاضر Playground از Web Speech API مرورگر برای تبدیل گفتار به متن استفاده می‌کند. این API روی همه مرورگرها یا به‌شکل آفلاین در دسترس نیست. برای کار آفلاین سروری، whisper.cpp و مدل چندزبانه tiny با حدود ۷۵ MiB را می‌توان جدا نصب کرد و از CPU استفاده کرد؛ در این بسته وزن و Backend سرویس STT نصب نشده‌اند. خروجی صوتی مرورگر نیز می‌تواند از speechSynthesis استفاده کند.

## راه‌اندازی
- نصب Node.js >=22
- ساخت `.env` خصوصی با اطلاعات **تازه** براساس `.env.example`
- `npm run integrations:doctor`
- `npm test`
- `npm start`
- مسیرهای `/`، `/studio`، `/plugins`، `/plugins/telegram-builder` و `/model-playground` را بررسی کن.
- برای Docker از Dockerfile اصلاح‌شده استفاده کن؛ قبل از انتشار روی VPS، تست Build/Run واقعی ضروری است.

## وضعیت راست‌نمایی
`configured` یعنی متغیر محیطی پر شده؛ `ready` فقط با اتصال واقعی و تست پاسخ‌گویی سرویس تأیید می‌شود. ربات‌های Telegram تا ثبت webhook یا شروع polling فعال نیستند. GitHub Repo به‌تنهایی سرویس Node.js ۲۴ساعته نیست.
