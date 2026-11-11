# مدل‌های رایگان / FEZI Agent v1.01 (افزودنی)

- FEZI Studio و FEZI Agent برای کاربران رایگان هستند. فقط خدمات اختیاری آرینا و فروش API Key پولی‌اند.
- OpenRouter `:free` و `openrouter/free` مدل‌های رایگان نرخ‌محدود ارائه می‌دهند. HF برای حساب معمولی اعتبار بسیار محدود دارد؛ مدل عمومی معادل استنتاج رایگان نامحدود نیست.
- `FEZI_AGENT_FREE_ONLY=true` به‌صورت پیش‌فرض از فراخوانی مدل‌های دارای هزینه در FEZI Agent جلوگیری می‌کند. گزینه `FEZI_FREE_ROUTING_ENABLED=true` فقط با کلید OPENROUTER_API_KEY موجود در محیط سرور مسیر رایگان را فعال می‌کند.
- پیش‌فرض ۳ پیام روزانه برای هر کاربر و ۲۰ پیام روزانه کل کاربران است. در چند فرایند Node همزمان برای سهمیه سراسری به دیتابیس تراکنشی نیاز است.
- برای ویدیو، ۵ ثانیه فقط هدف پیشنهادی کاربر است و ممکن است هر مدل زمان یا API متفاوتی داشته باشد.
- برچسب 🍌 صرفاً فیلتر کاتالوگ ۱۸+ است و به معنی فعال‌شدن مدل یا رفع الزامات حقوقی/حریم خصوصی نیست.
- کاتالوگ‌های HF با فیلتر `inference_provider=all` کش می‌شوند؛ پیش از فعال‌سازی هر مدل قیمت API و شرایط مجوز را بررسی کنید.
- `Wan2.Video` به‌خاطر API رسمی اثبات‌نشده به‌صورت خودکار scrape یا proxy نشده است. برای تعبیه Hugging Face Spaces عمومی و دارای مجوز می‌توان از iframe رسمی استفاده کرد.
- ساخت اپ/اندروید فقط با FEZI Agent خودکار می‌ماند؛ انتخاب دستی در Playground ویژه چت، عکس، ویدیو و کدنویسی نمایشی است.
- درباره شرکت‌های ارائه‌دهنده لازم نیست در پاسخ روزمره جزئیات داخلی داوطلبانه ذکر شود، ولی در پاسخ به پرسش مستقیم، اسناد مجوز و حریم خصوصی باید حقیقت گفته شود.

## مسیرها
- `/model-playground` صفحه مستقل انتخاب مدل؛ در صفحه‌های Studio، Video Studio، Free AI و Landing نیز لینک می‌شود.
- `/api/fezi-playground/catalog?task=video&live=1` کاتالوگ curated به‌علاوه فهرست زنده مدل‌های ارائه‌شده.
- `/api/fezi-playground/free-chat-models` مدل‌های :free زنده OpenRouter.
- `/api/fezi-playground/chat` چت رایگان بعد از ورود، با سهمیه و محدودیت؛ انتخاب خودکار یا مدل :free شناسایی‌شده.

## منابع
- https://huggingface.co/docs/inference-providers/pricing
- https://huggingface.co/docs/inference-providers/hub-api
- https://huggingface.co/docs/inference-providers/tasks/text-to-video
- https://huggingface.co/docs/hub/spaces-embed
- https://openrouter.ai/collections/free-models
