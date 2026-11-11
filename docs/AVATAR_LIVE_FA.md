# FEZI AGENT 0.77 — Live Avatar Lab

## امکاناتی که واقعاً اجرا می‌شوند

- صفحه `/avatar` در خود Node.js، بدون نصب کتابخانه اضافی.
- قالب `live_avatar` برای ساخت سایت مستقل و دریافت ZIP از استودیو.
- بارگذاری فایل PNG/JPG/WEBP در **مرورگر** (در حالت سبک فایل روی سرور آپلود نمی‌شود).
- پلک‌زدن و حرکت ظریف سر؛ کالیبره‌کردن محل دهان، چشم و شدت حرکت؛ ذخیره تنظیمات در مرورگر یا JSON.
- گفتار از `speechSynthesis` مرورگر (نیازمند صدای فارسی روی دستگاه برای گفتار فارسی قابل فهم).
- حرکت تقریبی دهان از خروجی گفتار مرورگر؛ سیگنال صوتی مستقیم speechSynthesis برای تحلیل Web Audio در دسترس نیست.
- برای فایل WAV/MP3 و میکروفون از Web Audio Analyser برای اندازه‌گیری دامنه واقعی صوت استفاده می‌شود، اما این **lip sync فونمی دقیق** نیست.
- گفت‌وگوی متنی با FEZI AGENT، بعد از ورود مدیر و اتصال واقعی مدل زبانی.
- گفت‌وگوی صوتی فقط در مرورگرهای دارای SpeechRecognition؛ این قابلیت ممکن است از سرویس خارجی مرورگر استفاده کند و کاملاً آفلاین نیست.

## مسیر کیفیت سینمایی

مناسب‌ترین گزینه‌های متن‌باز فعلی برای تست روی GPU مستقل:

1. SoulX-FlashHead Lite (https://github.com/Soul-AILab/SoulX-FlashHead) با امکان استریم، نیازمند کارت گرافیک.
2. MuseTalk 1.5 (https://github.com/TMElyralab/MuseTalk) برای هماهنگی لب روی تصویر/ویدیو با ورودی صوتی.
3. EchoMimicV3 (https://github.com/antgroup/echomimic_v3) برای تولید کلیپ سخنگو از تصویر و صدا.

مدل‌های بالا هنوز در FEZI AGENT دانلود/نصب نشده‌اند و **استریم فوتورئال آماده در این نسخه وجود ندارد**.

### قرارداد GPU Worker (API پیاده‌سازی‌شده و تست‌شده)

FEZI AGENT (بعد از ورود) به این متغیرهای خصوصی نیاز دارد:

```ini
AVATAR_WORKER_URL=http://127.0.0.1:8099
AVATAR_WORKER_TOKEN=replace-with-long-random-secret
```

`AVATAR_WORKER_URL` باید HTTPS باشد، مگر برای localhost. در پنل «کیفیت سینمایی» کاربر تصویر و صوت را با تأیید رضایت ارسال می‌کند. FEZI AGENT با یک POST به `<AVATAR_WORKER_URL>/render` اطلاعات را برای پردازش می‌فرستد:

```json
{"image_base64":"...","image_mime":"image/png","audio_base64":"...","audio_mime":"audio/wav","fps":25}
```

پاسخ Worker **باید** MP4 معتبر با `Content-Type: video/mp4` باشد. در صورت عدم اتصال یا خروجی نامعتبر، FEZI AGENT خطا اعلام می‌کند نه موفقیت ساختگی. API در این نسخه **Batch** است، نه WebRTC Streaming.

`workers/avatar-gpu-bridge.py` یک پل HTTP محافظت‌شده است که به **دستور ثابت رندر واقعی نصب‌شده روی سرور** متصل می‌شود. این فایل خودش مدل نیست. برای اتصال موتور GPU باید دستوری که روی سیستم خودت واقعاً با پارامترهای `{image}`، `{audio}`، `{output}` یک MP4 می‌سازد در `AVATAR_RENDER_COMMAND_JSON` تنظیم شود. نمونه صرفاً قراردادی:

```ini
AVATAR_RENDER_COMMAND_JSON=["python","/opt/avatar-model/render-adapter.py","--image","{image}","--audio","{audio}","--output","{output}"]
```

مسیر فرضی `/opt/avatar-model/render-adapter.py` هنوز جزو پروژه نیست و باید برای مدل انتخابی پیاده‌سازی شود. **از این دستور نمونه نمی‌توان نتیجه گرفت که SoulX/MuseTalk نصب شده‌اند.**

برای استفاده عمومی و مداوم: GPU Worker روی ماشین GPU، مدیریت صف و سهمیه منابع، HTTPS و احراز هویت، پشتیبان‌گیری، محدودیت نرخ و WebRTC برای استریم تعاملی لازم است. cPanel اشتراکی را فقط برای API و رابط اصلی در نظر بگیر.

## راه‌اندازی

```bash
export APP_PASSWORD='your-strong-password'
export SESSION_SECRET='another-very-long-random-secret'
node server.js
```

سپس `/avatar` را باز کن؛ یا در استودیو قالب «آواتار زنده و سخنگو» را ایجاد و ZIP پروژه را دریافت کن.

## تست‌ها

`node --test tests/avatar-5000.test.js tests/avatar-http.test.js tests/avatar-gpu-gateway.test.js` شامل **۵۰۰۰ حالت قطعی قابل‌بازتولید** در پنج خانواده (هرکدام ۱۰۰۰) و تست HTTP/Worker است. این‌ها تست کیفیت سینمایی GPU، آزمایش کاربر، یا اندازه‌گیری صدای واقعی فارسی نیستند. اجرای مدل روی RTX هنوز انجام نشده است.

## حقوق تصویر و صدا

فقط از تصاویر/صداهایی استفاده کن که مجاز به پردازش آن‌ها هستی، به‌خصوص هنگام ساخت کاراکترهای شبیه انسان واقعی. از این ابزار برای جعل گفتار یا هویت بدون رضایت استفاده نکن.
