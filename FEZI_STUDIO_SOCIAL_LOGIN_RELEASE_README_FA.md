# FEZI Studio — انتشار 7 Nov 2026 (Social Login & ChatGPT Plugin)

این ZIP شامل **سورس اصلاح‌شده** FEZI Studio است، نه یک سرور آمادهٔ 24ساعته. کلید محرمانه یا توکن تولید واقعی عمداً در آن وجود ندارد.

- صفحهٔ `/profile`: Google, GitHub, Telegram OIDC, Facebook و توضیح محدودیت ChatGPT Login
- آیکون‌های داخلی `/auth-icons/*.svg` و کد مستقل بررسی وضعیت `/api/auth/providers`
- Google/GitHub/Telegram OIDC با CSRF state و PKCE؛ Facebook با state امن؛ هر چهار سرویس نیازمند اطلاعات OAuth و HTTPS واقعی
- برای اجرای نسخهٔ وب Node.js 22+ لازم است؛ جریان OAuth با Node.js داخلی طراحی شده و برای آن بستهٔ npm اجباری نیاز نیست
- دستور بررسی تنظیمات: `npm run auth:doctor` (محرمانه‌ها چاپ نمی‌شوند)
- راهنمای کامل: `FEZI_STUDIO_SOCIAL_LOGIN_AND_FULL_AUDIT_FA.md`
- افزونهٔ خصوصی ChatGPT: https://chatgpt.com/plugins/plugins_6aee66d7da5c8191878e86e2a54dbc49 (Skills-only؛ اتصال MCP به هاست هنوز انجام نشده)

## برای راه‌اندازی واقعی

1. دامنهٔ FEZI Studio با HTTPS و هاست Node.js فعال تهیه کن.
2. SESSION_SECRET و APP_PASSWORD قوی و تازه، PUBLIC_BASE_URL و COOKIE_SECURE=true را فقط در Secrets هاست ثبت کن.
3. OAuth App هر ارائه‌دهنده را با Callback دقیق ثبت و Client ID/Secret را به Secrets هاست اضافه کن.
4. اگر برنامه فقط روی GitHub Pages است، بک‌اند را روی سرور مستقل Node.js اجرا کن؛ GitHub Pages ربات تلگرام یا مدل محلی را اجرا نمی‌کند.
5. فرآیند ربات‌ها، مدل محلی، اینترنت استریم رادیو و تسویهٔ پرداخت باید جداگانه در هاست واقعی تست شوند.
6. قبل از انتشار، توکن‌هایی را که در چت یا فایل‌های قدیمی آشکار شده‌اند Rotate کن.

هیچ حساب Google/Facebook/GitHub/Telegram واقعی در محیط ساخت آزمایش نشده و هیچ پرداخت واقعی/استقرار GitHub در این نسخه انجام نشده است.
