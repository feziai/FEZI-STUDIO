# پرامپت نهایی تکمیل FEZI Studio

تو مهندس اصلی پروژه «فضی استودیو / FEZI Studio» هستی. بر اساس سورس فعلی پروژه، بدون حذف صفحات، لوگوی رسمی خرگوش-F، داده‌ها، اسکیل‌ها، Plugin Hub، FEZI Agent، ربات‌های تلگرام یا بخش‌های قبلی، پروژه را به صورت یک وب‌سایت Node.js 22 و دارای یک دامنه اصلی تکمیل کن.

**اولویت اول FEZI Agent:** ساخت و ویرایش و نصب و دیپلوی وب‌سایت و وب‌اپ، بررسی باگ و کدنویسی با تست واقعی، بکاپ و Rollback. سایر قابلیت‌ها مکمل هستند.

**مدیریت ربات‌ها:** Telegram Plugin Builder با خروجی Native Node.js، grammY، Telegraf و aiogram؛ ساخت منو و پاسخ‌ها؛ فهرست ربات‌های فقط با اجازه صاحبشان عمومی؛ ربات مرکزی با فرمان‌های /start، /newbot، /mybots، /plugins، /models، /help. خلق Bot Token تنها از BotFather و با درخواست کاربر امکان‌پذیر است. تمامی Bot Tokenها را فقط در سرور و به صورت رمزنگاری‌شده نگهداری کن؛ هیچ توکنی در چت تلگرام و سورس عمومی نباشد.

**مدل‌ها:** به شکل free-first از OpenRouter مدل‌های :free و openrouter/free استفاده کن؛ هیچ مدل پولی را بی‌اجازه مصرف نکن. متادیتا و نسخه‌های HF و پروژه‌های GitHub را از API رسمی با صفحه‌بندی و احترام به rate limit کشف و هر ۲۴ ساعت همگام کن. برچسب‌های discovered، metadata_verified، downloaded، worker_connected، inference_test_passed و deployed را دقیق از هم جدا کن.

**هوش مصنوعی و صدا:** چت فارسی/انگلیسی با روتر API پیش‌فرض؛ ورودی صوتی Browser Voice به عنوان مسیر کم‌هزینه (بر اساس قابلیت مرورگر) و امکان Whisper.cpp tiny CPU به عنوان افزونه اختیاری. APIهای همه ارائه‌دهندگان را server-side با سهمیه، timeout، fallback و هزینه شفاف متصل کن. هیچ کلید افشاشدهٔ قبلی استفاده نشود.

**اسکیل و MCP:** اسکیل‌های بررسی‌شده متعلق به پلاگین‌های FEZI Studio، Premium، Super Plugin، GitFez و Pusher را به کتابخانه FEZI Agent وارد کن و متادیتا، سازگاری، مجوز و آزمون واقعی ثبت کن. MCP خصوصی FEZI Agent با احراز هویت مستقل و tools/list و tools/call بساز. Shell تنها در محیط ایزوله یا با allowlist، ورود مدیر، گزارش عملیات و جلوگیری از اجرای کد بیگانه فعال شود. برای فعالیت‌هایی مانند GitHub write/deploy/حذف و انتقال پول، تأییدهای مناسب لازم است.

**اتوماسیون:** زمان‌بند هر ۲۴ ساعت جستجوی نسخه‌های جدید، تست رجیستری، بررسی لایسنس و امنیت، گزارش روزانه، ایجاد پیشنهاد تغییر و PR. دانلود یا اجرای کد ناشناس، merge مخرب، پرداخت و تغییر امنیت سرور بدون اجازه انجام نشود. برای کدهای تست‌شده در staging و سطح Medium، release workflow با rollback وجود داشته باشد.

**فریم‌ورک‌های اختیاری:** Transformers برای CPU/GPU worker، smolagents برای ایجنت، LangChain برای RAG، LiteLLM برای gateway، Flowise برای visual workflows و Open WebUI پس از بررسی لایسنس. n8n صرفاً مطابق Sustainable Use License و مجوز تجاری لازم؛ قابلیت مشتریان عمومی را بدون مجوز n8n بازفروش نکن.

**یکپارچگی محصول:** یک پروژه، یک دامنه و مسیرهای /plugins، /plugins/telegram-builder، /plugins/telegram-manager، /plugins/free-models، /fezi-agent/tools. هدر قبلی سایت و لوگوی اصلی PNG را تغییر نده. ریسپانسیو، فارسی RTL و انگلیسی LTR؛ accessibility، auth، SEO و حفظ داده‌های پروژه انجام شود.

**تست و خروجی:** npm test، HTTP smoke، بررسی ZIPهای اجرایی، تست Telegram mock، تست انتشار staging/rollback، بررسی امنیت و CI. هر قابلیت را واقع‌بینانه به VERIFIED، CONFIG_REQUIRED یا PLANNED دسته‌بندی کن. بدون داشتن مجوز یا توکن تازه هرگز ادعای انتشار، فعال شدن ربات، نصب مدل یا GPU نکن. خروجی باید فایل‌های قابل نصب، راهنمای فارسی، env example بدون secrets و گزارش دقیق موفق/ناموفق باشد.
