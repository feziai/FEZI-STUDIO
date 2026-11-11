# Arina motion library — برنامه واقعی کلیپ‌های لازم

برای پخش بدون GPU سرور، ویدیوهای از پیش رندرشده و تأییدشده در کتابخانه MP4 قرار می‌گیرند. هیچ‌کدام به‌طور مصنوعی با اسلایدشو جایگزین MP4 نمی‌شوند.

- **Idle (۸ کلیپ):** idle-breathe, blink, look-monitor, read-message, look-camera, smile-soft, hand-rest, fix-headphones
- **Typing (۶):** typing-start, typing-loop, typing-fast, thinking, reread, typing-finish
- **Emotions (۱۲):** laugh-soft, laugh-big, surprise, eye-roll, sad, glare, angry-typing, frown, teary, cry, wipe-tears, calm
- **Dance (۱۰):** stand, prepare, slow-dance, happy-dance, arm-move, rhythm, short-spin, dance-end, sit-down, return-idle

قالب پیشنهادی: 1080p / 30fps / H264 / بدون تغییر لباس و جای دوربین / حلقه هماهنگ. رابط پخش نسخه ۱.۳ فایل واقعی را فقط پس از ثبت در `public/arina-live/assets/video-index.json` و وجود MP4 می‌پذیرد. بدون تولید ویدیو این manifest را به‌دروغ پر نکنید. برای انتقال طبیعی بین حالات کلیپ‌های transition نیز لازم است.
