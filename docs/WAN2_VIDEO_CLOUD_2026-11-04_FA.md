# FEZI Studio v1.01 — تولید ویدیو با روش Wan2.Video، بدون GPU سنگین

## خروجی پیاده‌سازی‌شده
در همان صفحه `/video-studio` یک فرم دوم به نام **FEZI Cloud Video** اضافه شده است. این فرم از Hugging Face Inference Providers برای مدل Wan 2.2 به صورت رسمی استفاده می‌کند. صفحه قدیمی و Worker قدیمی دست‌نخورده باقی مانده‌اند.

### تفاوت کلیدی
`wan2.video` خودش می‌گوید از صف‌های عمومی Hugging Face Gradio Spaces استفاده می‌کند و دارای محدودیت ظرفیت است. این سایت **API رسمی با دسترسی مجاز به ظرفیت عمومی‌اش** برای FEZI ارائه نکرده است؛ بنابراین صف رایگان آن را با درخواست‌سازی غیرمجاز، کوکی، API خصوصی یا scraping بازسازی نکردیم. مدل Wan 2.2 را به شکل مجاز از API Hugging Face دریافت می‌کنیم. استفاده از حساب HF ممکن است هزینه داشته باشد، حتی اگر مدل وزن باز داشته باشد.

منابع رسمی:
- https://wan2.video/free-ai-video-generator
- https://huggingface.co/docs/inference-providers/tasks/text-to-video
- https://huggingface.co/docs/huggingface.js/en/inference/classes/InferenceClient

## آماده‌سازی هاست Node.js

- Node.js نسخه 22 یا جدیدتر.
- `npm install` برای دریافت بسته اختیاری `@huggingface/inference` نسخه `4.13.32`.
- دامنه HTTPS واقعی برای `PUBLIC_BASE_URL`.
- `DATA_DIR` خصوصی و **پایدار** با دسترسی نوشتن؛ ذخیره‌سازی ویدیو به فضای هاست نیاز دارد.
- توکن `HF_TOKEN` با مجوز Inference Providers و اعتبار کافی در Secret محیط.
- فقط یک فرآیند برای صف ویدیوی ابری در این معماری؛ سرور چندفرآیندی به قفل مشترک و صف پایدار نیاز دارد.

## سوئیچ‌های امنیتی (پیش‌فرض خاموش)

```env
HF_TOKEN=your_new_private_token
FEZI_HF_VIDEO_ENABLED=false
FEZI_HF_VIDEO_COST_APPROVED=false
FEZI_HF_VIDEO_ALLOWED_MODELS=wan22
FEZI_HF_VIDEO_GLOBAL_DAILY_LIMIT=2
FEZI_HF_VIDEO_USER_DAILY_LIMIT=1
```

وقتی سرویس واقعی، تعرفه، اعتبار و خطر هزینه را بررسی کردی و تست کردی، هر دو سوئیچ اول را به `true` تغییر بده. تا پیش از آن **درخواست تولید خارجی انجام نمی‌شود**. سقف‌های بالا تعداد درخواست‌اند و سقف واقعی دلار را ضمانت نمی‌کنند.

## API جدید

- `GET /api/fezi-cloud-video/status` — وضعیت غیرمحرمانه و گزینه‌های مجاز
- `POST /api/fezi-cloud-video/jobs` — ثبت درخواست با حساب FEZI، مدل تأییدشده و متن
- `GET /api/fezi-cloud-video/jobs/{id}` — پیگیری وضعیت فقط توسط صاحب حساب
- `GET /api/fezi-cloud-video/result/{id}` — دریافت MP4 خصوصی فقط برای صاحب حساب

زمان ویدیو حدود ۵ ثانیه در فرم فعلی پیشنهاد می‌شود؛ طول دقیق به مدل و ارائه‌دهنده بستگی دارد. مدل‌های LTX و Hunyuan در کاتالوگ نمایش داده می‌شوند ولی **فعال و تضمین‌شده نیستند** و فقط پس از آزمایش واقعی در allowlist قرار می‌گیرند.

## محدودیت‌ها

1. تولید واقعی با کلید حساب شما هنوز آزمایش نشده تا هزینه‌ای از حساب کسر نشود.
2. `HF_TOKEN` در کلاینت، ZIP عمومی یا GitHub قرار نمی‌گیرد.
3. اگر Node.js حین پردازش متوقف شود، کار نیمه‌تمام interrupted خواهد شد؛ دوباره خودکار ارسال نمی‌شود تا هزینه تکراری ایجاد نشود.
4. نه صف عمومی Gradio و نه تبلیغ «رایگان» یک وب‌سایت، به معنی اجازه فروش API یا استفاده پشت پرده نیست.
5. پخش ۲۴ساعته آرینا از این مسیر حل نمی‌شود؛ برای آن RTMP/HLS و سرویس استریم مستقل نیاز است.
