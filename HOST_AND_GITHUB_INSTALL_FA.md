# نسخه یکپارچه هاست و GitHub — FEZI Studio v1.01

این بسته سورس کامل مشترک cPanel، VPS، Docker و GitHub است؛ نسخه قدیمی را با آن جایگزین کنید و داده خصوصی را نگه دارید.
در cPanel: Node.js 22+، startup file برابر app.js و ریشه شامل package.json؛ npm install و Restart.
در VPS: npm install سپس npm start؛ یا PM2 فقط برای فرآیند مورد نیاز.
Docker از compose.yaml استفاده می‌کند؛ مدل Ollama باید جداگانه دانلود و بارگذاری شود.
متغیرهای اصلی: APP_PASSWORD، SESSION_SECRET، DATA_DIR خصوصی و پایدار، PUBLIC_BASE_URL با HTTPS، COOKIE_SECURE=true.
چت آرینا: ARINA_AI_ENABLED=true؛ برای Ollama مقدار ARINA_CHAT_PROVIDER=ollama و ARINA_MODEL=مدل نصب‌شده، OLLAMA_BASE_URL=آدرس سرویس. برای API مسیر خودکار و کلید معتبر لازم است.
پخش آرینا در /arina-live: کلیپ 7.383 ثانیه و سپس عکس ارسالی برای 5 ثانیه با حرکت ملایم قاب؛ حرکت صورت مولد تولید نشده است.
موسیقی مستقل بعد از اولین لمس؛ سایت باید روشن و مرورگر اجازه پخش داشته باشد.
GitHub: سورس را در ریشه مخزن روی شاخه development قرار دهید؛ secrets و داده خصوصی را commit نکنید. هیچ استقرار عمومی خودکاری اضافه نشده.
این بسته APK کامپایل‌شده نیست. منابع اندروید و آیکون جدید در android/gradle-source موجودند.
