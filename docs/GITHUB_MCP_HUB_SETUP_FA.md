# راه‌اندازی تمام پلاگین‌های FEZI در گیت‌هاب و هاست (۱۱ نوامبر ۲۰۲۶)

## وضعیت واقعی

- این بسته سورس یکپارچهٔ وب‌سایت Node.js، فهرست **۲۵ پلاگین خصوصی**، ۲۵ فایل manifest مخصوص GitHub و Gateway MCP را دارد.
- در این بسته تعدادی ZIP مربوط به *نسخه‌های صادرشدهٔ قبلی* پلاگین‌ها وجود دارد؛ **سورس کامل و آخرین نسخهٔ همهٔ ۲۵ پلاگین در فایل سایت موجود نبوده است**. پوشه‌های `plugin-hub/plugins/*` فقط اطلاعات و مسیر اتصال هستند، نه سورس اصلی هر پلاگین.
- GitHub خودِ پلاگین ChatGPT را نصب یا فعال نمی‌کند؛ GitHub کد، نسخه‌بندی، تست و گردش‌کار Deploy را میزبانی می‌کند.
- اجرا شدن ۲۴ساعتهٔ MCP نیازمند Node.js زنده روی هاست (یا استقرار جداگانهٔ MCP) است؛ GitHub Pages به‌تنهایی کافی نیست.
- تمام پلاگین‌های فعلی از ChatGPT خصوصی هستند. مخزن را **Private** بساز و کد خصوصی را عمومی نکن.

## دستورهای گیت‌هاب

1. در GitHub یک ریپازیتوری **Private** مانند `fezi-studio-plugin-hub` بساز (بدون README اولیه).
2. محتوای پوشهٔ `FEZI_STUDIO/` را در ریشهٔ ریپازیتوری بگذار؛ خود فایل ZIP را به‌عنوان سورس سایت آپلود نکن.
3. در کامپیوتر، در همین پوشه:
   ```bash
   git init
   git branch -M main
   git add .
   git commit -m "FEZI Studio with 25-plugin MCP Gateway"
   git remote add origin git@github.com:YOUR_USERNAME/fezi-studio-plugin-hub.git
   git push -u origin main
   ```
   یا با GitHub Desktop همین فایل‌ها را Push کن.
4. اکشن `FEZI Plugin Hub Tests` باید سبز شود.
5. روی هاست با Node.js 22 پروژه را Deploy کن. فایل `server.js` نقطه شروع است، و دامنه باید HTTPS داشته باشد.
6. در محیط خصوصی هاست، `FEZI_PLUGIN_HUB_TOKEN` را یک مقدار تصادفی ۳۲+ کاراکتری بگذار (نه در فایل GitHub).
7. اگر سرور MCP یک پلاگین را جدا اجرا کرده‌ای، نشانی HTTPS آن و نام متغیر توکن را در `FEZI_PLUGIN_UPSTREAMS_JSON` ثبت کن. هیچ سرور یا توکنی به صورت پیش‌فرض فعال نیست.
8. مثال تست اولیه (دامنه و توکن واقعی را در ترمینال شخصی خود قرار بده):
   ```bash
   curl -sS https://YOUR_DOMAIN/api/plugin-hub/status
   curl -sS https://YOUR_DOMAIN/mcp/hub/easygit \
     -H "Authorization: Bearer $FEZI_PLUGIN_HUB_TOKEN" \
     -H 'Content-Type: application/json' \
     -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
   ```
9. اتصال ChatGPT MCP را طبق سطح دسترسی و محدودیت‌های حساب/برنامهٔ خودت جداگانه انجام بده؛ نصب خصوصی خودکار یا عمومی‌سازی پلاگین‌ها در اثر Push انجام نمی‌شود.

## تنظیم نمونهٔ upstream

`FEZI_PLUGIN_UPSTREAMS_JSON` در Environment هاست:

```json
{
  "easygit": {
    "url": "https://your-secure-mcp-provider.example/mcp",
    "tokenEnv": "EASYGIT_MCP_TOKEN"
  }
}
```

`EASYGIT_MCP_TOKEN` را نیز در محیط خصوصی هاست ذخیره کن. به محض اینکه اتصال upstream درست باشد و پاسخ `tools/list` از آن دریافت شود، ابزارها با پیشوند `remote__` در Gateway ظاهر می‌شوند. تا آن زمان ابزارهای محلی فقط اطلاعات و راهنمای نصب ارائه می‌کنند. `get_plugin_connection_status` اثبات اجرای واقعی سرویس مقصد نیست.

## فعال‌سازی خودکار هنگام Push

workflow بررسی (`plugin-hub-ci.yml`) خودکار روی Push اجرا می‌شود. workflow پیشین `deploy-cpanel.yml` برای استقرار SSH در پروژه محفوظ مانده است؛ پیش از اجرای آن باید Secrets هاست مثل `CPANEL_HOST`, `CPANEL_USER`, `CPANEL_SSH_KEY`, `CPANEL_APP_DIR` و `CPANEL_KNOWN_HOSTS` را طبق همان workflow تنظیم کنی. به صورت پیش‌فرض هیچ انتشار خودکاری که بدون تنظیمات هاست یا تأیید دسترسی انجام شود فعال نشده است.

## هماهنگی سورس ChatGPT و GitHub

برای اینکه **همهٔ ۲۵ پلاگین واقعاً با سورس کامل‌شان** در GitHub باشند، باید نسخهٔ current هرکدام از Plugin Creator به‌صورت ZIP/TAR.GZ صادر و پس از بازبینی Secret و مجوز انتشار در پوشهٔ `private-plugin-exports/` قرار گیرد. بستهٔ فعلی تنها چهار خروجی قدیمی و یک بستهٔ اتصال Agent را در آن پوشه قرار داده است. مقایسهٔ نسخه در `plugin-hub/plugins/*/manifest.json` نوشته شده و نباید عنوان آخرین سورس به نسخه‌های قدیمی داده شود.

## وضعیت بعد از Push

۱) سورس و CI روی GitHub فعال می‌شوند، ۲) پس از Deploy سرور، مسیرهای MCP Hub آنلاین می‌شوند، ۳) تنها پس از اتصال Upstream واقعی هر پلاگین و تست اجرایی، عملیات اصلی پلاگین قابل استفاده خواهد بود، ۴) دسترسی ChatGPT همچنان جداگانه و مبتنی بر مجوز است.

## نکات امنیتی برای استفاده عمومی

نسخهٔ ابتدایی Gateway برای مالک/تیم محدود طراحی شده است و از Bearer token مشترک استفاده می‌کند. **همین توکن را به کاربران عمومی نده.** برای فروشگاه عمومی و چندکاربره باید OAuth/OIDC، مجوزهای تفکیک‌شدهٔ هر کاربر، rate-limit و ثبت لاگ ایمن به آن اضافه شود. استفاده از Gateway روی GitHub Pages یا تنها Push کد معادل اجرای سرویس نیست.

اگر هاست cPanel از پردازش دائمی Node.js، HTTPS و اجرای App پشتیبانی نکند، یک VPS یا سرویس اجرای Node.js متصل به همین ریپازیتوری لازم است.
