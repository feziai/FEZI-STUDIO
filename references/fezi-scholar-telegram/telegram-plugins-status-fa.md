# FEZI — تمام پلاگین‌های ساخته‌شده و کارهای تکمیل‌نشده

**تاریخ بررسی:** ۹ نوامبر ۲۰۲۶  
**منبع فهرست:** Plugin Creator، پلاگین‌های خصوصی حساب کاربر.  
**منبع آموزش:** فایل ارسالی `Telegram_Knowledge_for_Custom_GPT_FA.md` (۱۳۲ سطر، نسخه ۱.۰ فارسی).

## خلاصه
- ۱۵ پلاگین خصوصی قابل شناسایی در حساب؛ این عدد شامل فهرست پروژه‌های بیرون Plugin Creator یا نصب‌شده در workspace دیگر نیست.
- به‌روزرسانی دانش تلگرام برای ۱۴ پلاگین ثبت شد؛ GitFez/Host Manager به‌دلیل خطای سرویس در نسخه قبلی باقی ماند.
- فایل دانش در Telegram Bot Maker از قبل وجود داشت؛ اسکیل راهنمای مشترک به آن اضافه شد.
- «کامل نبودن» در این گزارش به معنی **نیازِ محتمل به اجرای نهایی/اتصال خارجی یا نبود تأیید end-to-end** است، نه اثبات خرابی. نسخه ثبت‌شده/داشتن اسکیل، مجوز دسترسی یا اجرای واقعی محسوب نمی‌شود.

## فهرست پلاگین‌ها

| پروژه | نسخه پس از این کار | دانش تلگرام | مهم‌ترین بخش نیازمند تکمیل یا راستی‌آزمایی |
|---|---|---|---|
| [FEZI Automation](https://chatgpt.com/plugins/plugins_6af11f2ec0e48191845816afe7260920) | `1.1.1` | Updated | n8n workflows are authored; running them needs a connected n8n instance and service authorization |
| [Website Builder Pro](https://chatgpt.com/plugins/plugins_6af11167471c81919bafaa4c613e1747) | `1.2.2` | Updated | Live deployment to GitHub/hosting still needs real connected write permissions |
| [FEZI Agent Builder](https://chatgpt.com/plugins/plugins_6af010f67fac8191a27194c5258fd239) | `0.1.3` | Updated | Five-million skill target is a roadmap, not installed skills; live app deployment depends on connectors |
| [FEZI Telegram Bot Maker](https://chatgpt.com/plugins/plugins_6af005cefac8819186b101bfdd77ed74) | `0.5.3` | Updated, source already present | Knowledge is present; actual Telegram bot operation needs BotFather token in backend, HTTPS/worker, and bot permissions |
| [Skill Creator](https://chatgpt.com/plugins/plugins_6af002aa904c8191bcdbd2a0f7f7f83f) | `1.0.3` | Updated | Automated updates to other plugins require ownership and usable Plugin Creator tools |
| [Plugin Finder](https://chatgpt.com/plugins/plugin_asdk_app_sites_7f59c2f312a081919eb5a0c4b8a78eae) | `1.0.12` | Updated | Live plugin discovery/build/installation depends on deployed backend and authenticated integrations |
| [Arina Live](https://chatgpt.com/plugins/plugins_6aeea11809e88191a73963704e2ba340) | `0.1.5` | Updated | Live streaming, voice/avatar automation and payouts need connected providers |
| [Uncensored GPT](https://chatgpt.com/plugins/plugins_6aee79b01fd081918e1e4898a67a4253) | `0.4.10` | Updated | Actual independent model inference requires a running Ollama/ComfyUI or other provider |
| [FEZI Studio Premium](https://chatgpt.com/plugins/plugins_6aee769dcc7881919cd7829f1166dfcf) | `1.1.8` | Updated, verified | Remote GitHub/host/VPN/video execution needs authorized runtime; update verified by readback |
| [Super Plugin](https://chatgpt.com/plugins/plugins_6aee704a03fc8191b211748176057f35) | `0.3.17` | Updated | Real deployment and integration require connected tools |
| [FEZI Studio](https://chatgpt.com/plugins/plugins_6aee66d7da5c8191878e86e2a54dbc49) | `0.3.15` | Updated | External publishing, AI inference and remote writes require real integrations |
| [FeziPay](https://chatgpt.com/plugins/plugins_6aee634490288191b707850d23b96c03) | `0.8.11` | Updated | Live payment processing is unverified; requires payment backend, compliance and gateway integration |
| [GitFez / Host Manager](https://chatgpt.com/plugins/plugins_6aee5e023dc4819188cd987094cf5441) | `0.3.11` | Update failed | Telegram knowledge update not published due to repeat connector RPC INTERNAL failures; remote GitHub/hosting permissions also unverified |
| [Fezi Git Pusher](https://chatgpt.com/plugins/plugins_6aee597b2af081918f3dcb35530cf384) | `0.6.12` | Updated | GitHub Push requires a real repository and authenticated Contents write permission |
| [HostGPT AI](https://chatgpt.com/plugins/plugin_asdk_app_sites_269e439e2fb48191b548441254a54a00) | `1.0.11` | Updated | Site-backed private plugin; GitHub write/deployment actions not verified |

## منبع دانش و شیوه استفاده
1. محتوای مرجع بدون تغییر معنایی در `references/Telegram_Knowledge_for_Custom_GPT_FA.md` ذخیره می‌شود (مگر Telegram Bot Maker که نسخه عین فایل از قبل وجود داشت).
2. اسکیل `fezi-telegram-knowledge-router` این سند را می‌خواند و می‌تواند برای آموزش، طراحی Bot API، راه‌اندازی HTTPS webhook، Mini App و مسیر GPT → واسط → Telegram Bot API استفاده شود.
3. هیچ پلاگینی تنها با این اسکیل به کانال‌ها، گروه‌ها یا حساب شخصی تلگرام دسترسی نمی‌گیرد؛ عملیات واقعی به ابزار متصل و مجوز صاحب حساب نیاز دارد.
4. برای ویژگی‌های متغیر تلگرام به منابع رسمی ذکرشده در خود سند مراجعه شود.

## گام‌های تکمیل پیشنهادی
- GitFez/Host Manager: پس از رفع خطای سرویس Plugin Creator، بسته به‌روزرسانی آماده‌شده را دوباره روی آخرین release اعمال و نتیجه را بررسی کنید.
- Telegram Bot Maker و FEZI Automation: اتصال امن BotFather token در سرور و استقرار worker/webhook، سپس تست با چت آزمایشی.
- Fezi Git Pusher و HostGPT: نصب/تأیید اتصال GitHub با مجوز محدود `Contents: Read and write` در repository مشخص و ثبت SHA کامیت تست.
- بقیه: تست کامل با ابزار واقعی متناسب با کارکردشان و مستندسازی وضعیت‌های `READY / REQUIRES_AUTH / PLANNED / VERIFIED`.

> **محدودیت بررسی:** این گزارش از متادیتای پلاگین، توضیحات نسخه‌ها و نتایج به‌روزرسانی ساخته شده؛ تست سرویس‌های بیرونی مثل پرداخت، استریم و پیام واقعی تلگرام اجرا نشده است.
