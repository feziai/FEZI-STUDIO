# FEZI Studio v1.3 — نصب، مدل‌های 3D / بازی / ویدیو، پخش زنده و پلاگین ChatGPT

## مرزبندی واقعی «نصب» و «فهرست شدن»

- فایل لوگوی F خرگوشی کاربر **بدون تغییر** در `public/brand/fezi-rabbit-f.png` کپی شده و به برند صفحه اصلی، محیط کدنویسی، مرکز مدل و مرکز ابزار متصل است.
- ۸۱ ابزار به فهرست قابل جست‌وجوی `/toolbox` اضافه شده‌اند؛ این‌ها به معنی نصب بسته‌ها یا دریافت وزن مدل نیستند. `/api/toolbox/catalog` برای مطالعه، `/api/toolbox/doctor` فقط پس از ورود به مدیر برای بررسی وجود باینری‌ها در PATH.
- برای مدل‌های Ollama، اتصال واقعی چت در `/free-ai` همچنان فعال است **پس از نصب Ollama و pull مدل**. برای تصویر، انیمیشن و ویدیو، GPU Worker و workflow واقعی لازم است.
- ابزارهای GPL/AGPL، مدل‌های محدود به جغرافیا یا کاربرد و ابزارهای تجاری را بدون بررسی شرایط وارد بسته یا سرویس تجاری نکرده‌ایم. برای نمونه مجوز Hunyuan3D-2.0 اتحادیه اروپا/UK/کره جنوبی را استثنا می‌کند؛ در فهرست است اما فعال نیست.
- بعضی برنامه‌ها مانند bolt.diy از کد MIT استفاده می‌کنند اما وابستگی WebContainers مجوز تجاری جداگانه دارد.

## راهنمای اتصال

```bash
# Node.js 22 یا جدیدتر
cp .env.example .env
# set strong APP_PASSWORD and a different SESSION_SECRET
npm start
# open /showcase, /toolbox, /free-ai
npm run toolbox:doctor
npm run toolbox:install -- --tool=qwen3-8b       # dry run only
npm run toolbox:install -- --tool=qwen3-8b --apply # pulls from Ollama on an appropriate machine
npm run toolbox:install -- --tool=bolt-diy --apply # clones source, does not start the app
```

برای نصب هر مدل GPU روی سیستم متصل به GPU، از کد و مستندات رسمی صاحب مدل استفاده کنید، مجوز وزن دقیق و سخت‌افزار لازم را بررسی کنید و آن را جدا از Node/cPanel راه بیندازید. در این محیط محدود، Ollama/GPU وجود ندارد و وزن‌ها دانلود/نصب نشده‌اند.

## ChatGPT Plugin / MCP

بر اساس [راهنمای رسمی پلاگین](https://developers.openai.com/plugins/build/app-quickstart)، قابلیت‌ها را در MCP قابل فراخوانی می‌کنیم.

- endpoint خصوصی و **فقط خواندنی**: `POST https://YOUR-DOMAIN/mcp-plugin`
- متغیر محیطی: `FEZI_MCP_READ_TOKEN` با ۳۲ کاراکتر تصادفی یا بیشتر.
- ابزارها: `fezi_list_tools`, `fezi_list_models`, `fezi_toolbox_summary`, `fezi_host_status`.
- پاسخ JSON-RPC/Initialize/Tools/List/Tools/Call پیاده شده است و تست دارد.
- **این یک پیش‌نمایش خصوصی با Bearer Token است؛ OAuth 2.1، ثبت عمومی و UI رسمی پلاگین را ندارد.** برای عرضه عمومی لازم است از SDK رسمی MCP و OAuth مناسب و HTTPS استفاده شود. از اتصال عمومی با کلید مشترک خودداری کنید.
- توکن‌ها هرگز داخل GitHub یا فایل‌های public قرار نگیرند. سرور باید پشت HTTPS، rate limit و کنترل دسترسی باشد.
- از ابزارهای فعلی برای خواندن استفاده کنید؛ هیچ ابزار تخریبی، ارسال وجه، انتشار کد یا اجرای فرمان سیستم برای ChatGPT عمومی ارائه نمی‌شود.

## پخش دائمی

راه عملی: FEZI Node.js برای کنترل و چت، SRS یا Owncast (سرور رسانه جدا)، FFmpeg/OBS برای ارسال RTMP، HLS/WebRTC برای بازدیدکنندگان، و یک Worker GPU برای ساخت کلیپ ویدیویی. برای 1080p و جابه‌جایی پیوسته حالت‌های آرینا، باید کلیپ‌های واقعاً رندرشده، صف، ذخیره‌سازی، keyframeهای سازگار و پلیر مشترک همه کاربران داشته باشیم. کد موجود **ادعای تولید خودکار فیلم Full HD یا GPU زنده ندارد**. cPanel اشتراکی معمولاً برای transcoding 24/7 مناسب نیست.

## چرا رایگان بودن برنامه برابر با رایگان بودن سرویس نیست؟

منبع کد MIT/Apache/ GPL رایگان است ولی مدل‌های چندگیگابایتی، RAM/VRAM، برق، پهنای باند، سرور و استریم 24/7 مصرف منابع دارند. سرویس‌های پولی مثل Replit/Cursor/Runway به شکل اختیاری ثبت شده‌اند، اما روش دور زدن سقف یا پرداختشان پیاده نشده است.

## API URLs

- `GET /toolbox` — پنل دسته‌بندی‌شده آبی‌وسفید
- `GET /api/toolbox/catalog` — فهرست و لینک منابع
- `GET /api/toolbox/doctor` — نیازمند نشست مدیر، چک فایل اجرایی
- `GET /free-ai` — مدل‌های متن، تصویر و ویدیو
- `POST /api/free-ai/chat` — Ollama واقعی پس از نصب
- `POST /api/free-ai/jobs` — GPU worker واقعی پس از نصب، نه ویدیوی ساختگی
- `POST /mcp-plugin` — MCP read-only preview با bearer

لینک راهنماهای پروژه قدیمی در `docs/OPEN_MODELS_INSTALL_FA.md` و `docs/DEPLOY.md` باقی مانده‌اند.

## پروژه‌های آماده در محیط اصلی ساخت

در «ساخت پروژه جدید»، سه گزینه افزوده شده است: بازی Canvas قابل اجرا در مرورگر (بدون نیاز به کتابخانه خارجی)، پروژه Godot 4 با فایل‌های اصلی، و اسکریپت تولید GLB توسط Blender. برای اجرای Godot و Blender باید خود این دو ابزار روی رایانه جداگانه نصب شوند. این قالب‌ها **به معنی AI game engine از پیش نصب‌شده نیستند**.

جزئیات سرویس مستقل استریم ۲۴ ساعته، Docker SRS و FFmpeg: `docs/STREAMING_STACK_FA.md`. برای حالت یک‌استریم مشترک همه کاربران باید پلیر و صحنه را به یک سرور رسانه واقعی وصل کرد؛ این نسخه فایل تنظیمات و نمونه ارسال کلیپ را دارد، نه سرویس راه‌اندازی‌شده.
