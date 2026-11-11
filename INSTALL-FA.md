# راه‌اندازی FEZI Studio روی هاست Node.js / cPanel

**نسخه 0.6**: این ZIP فایل‌های سورس، سرور MCP آزمایشی، راه‌انداز مدل‌های GGUF و برنامه وب را دارد. وزن مدل‌ها **داخل این ZIP نیست** و باید دانلود و در پوشه models قرار داده شود.

## اجرای پایه

1. یک زیردامنه مانند `studio.yourdomain.com` ایجاد کن.
2. محتوای ZIP را در پوشه غیرعمومی (خارج از `public_html`) استخراج کن.
3. در قسمت `Setup Node.js App` نسخه 22، حالت Production و Startup File برابر `app.js` را انتخاب کن (اگر پشتیبانی نشد، از `server.js` استفاده کن).
4. متغیرهای `APP_PASSWORD` (حداقل 10 کاراکتر) و `SESSION_SECRET` (مقدار تصادفی طولانی و متفاوت)، `HOST=127.0.0.1` و `COOKIE_SECURE=true` را در محیط برنامه ثبت کن.
5. برنامه را Restart کن. آدرس `/health` باید `ok:true` برگرداند.

## هوش مصنوعی بدون API Key

روی کامپیوتر یا سرور سازگار با اجرای native Node:

```bash
npm run host:check
npm install --no-save node-llama-cpp
npm run model:download -- coder-mini
```

برای مدل دوم و سوم:

```bash
npm run model:download -- persian-mini
npm run model:download -- coder-plus
```

اگر از کامپیوترت دانلود کردی، فایل‌های `.gguf` را با SFTP داخل پوشه خصوصی `models` روی هاست منتقل کن. سپس `LOCAL_AI_ENABLED=true` و `LOCAL_DEFAULT_MODEL=coder-mini` را تنظیم و برنامه را Restart کن. در محیط کار، گزینه `FEZI GGUF · داخلی بدون API Key` را انتخاب کن.

این کار **فقط روی هاستی که از کتابخانه native و منابع CPU/RAM لازم پشتیبانی کند** نتیجه می‌دهد. محدودیت هاست اشتراکی را قبل از دانلود بررسی کن. برای بسته‌بندی وزن مدل در یک آرشیو:

```bash
npm run bundle:host
```

یک فایل `FEZI-Studio-node-host-with-models.tar.gz` ساخته می‌شود که وزن مدل را نیز شامل است. این دستور بدون مدل واقعی خطا می‌دهد.

## پلاگین ChatGPT

کد MCP آزمایشی در `mcp.js` موجود است. برای تست خصوصی `MCP_DEV_TOKEN` طولانی تعریف کن و دستور `npm run mcp:check` را اجرا کن. **این توکن برای انتشار پلاگین کافی نیست**؛ اتصال عمومی به ChatGPT به یک سرور HTTPS امن با احراز هویت مناسب مانند OAuth و تأیید نصب در حساب ChatGPT نیاز دارد.

## LoRA

یک LoRA سازگار با همان مدل را در `models/adapters/adapter-name.gguf` قرار بده و `LOCAL_LORA_FILE=adapter-name.gguf` را تنظیم کن. LoRA به‌تنهایی مدل مستقل نیست و باید با وزن پایه سازگار باشد.
