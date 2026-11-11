# فضی استودیو: مدل‌های سبک و ساخت ساده پلاگین ChatGPT

## نصب

این ZIP یک overlay روی سورس FEZI Studio است، نه سرویس منتشرشده. فایل‌ها را در ریشه اصلی سورس استخراج کنید؛ هدر اصلی تغییر نکرده است.

در یک VPS یا کامپیوتر مجهز به Node.js 22 و حافظه کافی:

```sh
npm run model:small:install -- smollm2-135m
npm install --no-save node-llama-cpp
LOCAL_AI_ENABLED=true npm start
```

- صفحه مدل‌ها: `/plugins/local-models`
- سازنده پلاگین ChatGPT: `/plugins/chatgpt-builder`
- سازنده پلاگین ربات تلگرام (بدون تغییر): `/plugins/telegram-builder`
- فهرست مدل‌های محلی: `/api/local/models`
- دانلود مدل فقط با اجازه مدیر و بدون کاربر خارجی انجام می‌شود. مدل نصب‌شده لزوماً قابل اجرا نیست؛ ابتدا تست واقعی inference بگیرید.

### انتخاب مدل‌ها

| مدل | حدود حجم | کاربرد | محدودیت |
|---|---:|---|---|
| SmolLM2 135M Instruct Q4_K_M | 105 MB | نوشتار کوتاه انگلیسی | فارسی و استدلال ضعیف |
| SmolLM2 360M Instruct Q4_K_M | 271 MB | پاسخ‌های سبک انگلیسی | فارسی محدود؛ همچنان به runtime نیاز دارد |

وزن‌ها در این ZIP نیستند؛ زمان نصب باید از Hugging Face روی سرور مقصد دانلود شوند. اگر سرور به Hugging Face دسترسی ندارد، ابتدا روی رایانه خود دانلود و با SFTP به پوشه `models/` منتقل کنید. هیچ فایلی روی سرورهای ChatGPT نصب نمی‌شود.

### تفاوت بسته پلاگین و نصب در ChatGPT

`/plugins/chatgpt-builder` یک ZIP حاوی plugin.json و SKILL.md تولید می‌کند و کاربر را به Plugin Creator رسمی هدایت می‌کند. ایجاد، اشتراک‌گذاری، انتشار عمومی و اتصال MCP در ChatGPT مستلزم مجوز حساب و مراحل رسمی هستند.

- راهنمای رسمی: https://developers.openai.com/plugins/build/plugins
- صفحه پلاگین‌ها: https://chatgpt.com/plugins
