# آماده‌سازی GitHub-first برای فضی استودیو

## معماری
تمام برنامه در **یک سایت Node.js** با چند مسیر داخلی می‌ماند: `/` (FEZI Agent)، `/studio`، `/model-playground` (Chat/Voice)، `/plugins`، `/plugins/telegram-builder`. ربات‌ها ممکن است یک یا چند پردازش worker یا webhook جدا داشته باشند، ولی در همان ریپازیتوری و تحت همان دامنهٔ اصلی قرار می‌گیرند.

## اولین کار: کلیدهای ارسال‌شده را عوض کن
فایل `Dotenv.txt` شامل اطلاعات حساس واقعی است. کلیدهای API، GitHub PAT، رمز MongoDB، Google OAuth client secret، توکن‌های BotFather و کلیدهای خدمات پیام/ایمیل باید ابطال و نسخه‌های تازه صادر شوند. **هرگز** این فایل یا `.env` پرشده را روی GitHub قرار نده.

## ریپازیتوری موجود
`https://github.com/feziai/FEZI-STUDIO` روی شاخه main فعلاً فقط README اولیه دارد؛ سورس واحد هنوز در آن نیست. اتصال GitHub هنگام ایجاد Branch به خطای 403 خورد. قبل از آپلود، در GitHub App نصب‌شده دسترسی **Contents: read/write** و دسترسی به همین ریپازیتوری را مجاز کن، یا سورس را خودت از دستگاهت آپلود کن.

## بارگذاری سورس
۱. سورس کامل تحویلی را استخراج کن و **محتویات پوشه FEZI_STUDIO/** را به ریشه مخزن FEZI-STUDIO منتقل کن (نه خود پوشه تو در تو).
۲. بررسی کن فایل `.gitignore` موجود است و فایل‌های `.env`, `Dotenv.txt`, `data/` و وزن‌های `.gguf` وارد stage نشده‌اند.
۳. با Git CLI در پوشه مخزن:

```bash
git init
git remote add origin https://github.com/feziai/FEZI-STUDIO.git
git fetch origin main
git checkout -b feat/fezi-one-site-api-first origin/main
# files must now be copied into this folder
npm test
git add .
git status --short
git commit -m "FEZI Studio unified Node site, free API routing and bot builder"
git push -u origin feat/fezi-one-site-api-first
```

۴. با مرور Pull Request، کد را در main ادغام کن. **به‌خصوص پیش از push فایل‌های محرمانه را بررسی کن.**

## پیکربندی اولیه Node
```bash
cp .env.example .env
# Fill .env only on the private server with newly-issued credentials
npm run integrations:doctor
npm test
npm start
```

برای چت رایگان: `OPENROUTER_MODEL=openrouter/free`, `FEZI_AGENT_FREE_ONLY=true`، و کلید تازه در `OPENROUTER_API_KEY`. Free routing دارای سهمیه و محدودیت است. `OLLAMA_CLOUD_ENABLED=false` مگر در صورت بررسی سهمیه/هزینه. مدل‌های API نیاز به GPU شخصی ندارند.

## ربات‌های تلگرام
ربات‌ساز: `/plugins/telegram-builder`. نقشه نقش‌ها: `config/telegram-bot-roles.example.json`. از توکن‌های **جدید** BotFather استفاده کن؛ هر bot نیازمند webhook HTTPS یا polling است. صرف وجود توکن در `.env` به معنای راه‌اندازی ربات نیست. وضعیت واقعی هر ربات باید با `getMe` و یک پیام تست سنجیده شود؛ این بسته هیچ درخواست عملی به Telegram نمی‌فرستد.

## صدا
در Playground کد **SpeechRecognition** مرورگر وجود دارد (وابسته به مرورگر و مجوز میکروفون). گزینه CPU کم‌حجم آفلاین: **whisper.cpp** مدل multilingual tiny حدود ۷۵ MiB؛ دانلود و سرویس STT لازم است. مرورگر برای TTS می‌تواند از `speechSynthesis` استفاده کند. Whisper.cpp در بسته دانلود یا نصب نشده است.

## استقرار
GitHub محل سورس است، نه پردازش دائمی Node. برای نصب هاست Node.js 22 به HTTPS، نگهداری دائمی process، writable data و در صورت نیاز پردازش worker احتیاج است. از `Dockerfile` اصلاح شده استفاده کن؛ ابتدا Build و Smoke test روی VPS انجام شود.
