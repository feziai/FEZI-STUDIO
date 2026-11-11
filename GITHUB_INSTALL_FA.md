# راهنمای نصب GitHub FEZI Studio و ۲۶ صفحه پلاگین

نسخه مرجع: **۱۱ نوامبر ۲۰۲۶**  |  مخزن هدف: `feziai/FEZI-STUDIO`  |  Node.js 22

## بسته دقیقاً چه کاری انجام می‌دهد؟

- **یک مخزن GitHub** برای سورس کامل نسخه ایمنِ FEZI Studio دارد؛ ماژول‌های قبلی حذف نشده‌اند.
- در مسیر `_github_pages/` یک سایت استاتیک انگلیسی/فارسی ساخته شده است: صفحه اصلی + **۲۶ صفحه اختصاصی**، به شکل `/plugins/<slug>/`.
- `.github/workflows/deploy-fezi-plugin-pages.yml` صفحات را بعد از Push به شاخه `main` یا اجرای دستی workflow منتشر می‌کند.
- صفحه هر پلاگین نام، نسخه تأییدشده در Plugin Creator، کاربرد، وضعیت واقعی و لینک بازکردن در ChatGPT را دارد.
- صفحه `/plugins` در سایت Node.js نیز با همان ۲۶ پلاگین هماهنگ شده است.
- سورس خصوصی پلاگین‌های ChatGPT، کلیدها، کیف‌پول‌ها و دیتابیس‌های اجرایی در مخزن عمومی منتشر نشده‌اند.

> مهم: **GitHub Pages فقط محتوای استاتیک اجرا می‌کند.** هیچ پلاگین خصوصی ChatGPT با آپلود GitHub خودکار نصب/عمومی نمی‌شود؛ Telegram Bots، مدل‌ها، API، پرداخت و MCP برای اجرا به هاست دائمی، کلید معتبر و مجوز نیاز دارند. صفحات GitHub بعد از انتشار عمومی می‌شوند اما پلاگین ChatGPT همچنان خصوصی است.

## مرحله اول: آماده‌سازی و بررسی امنیت

1. در دستگاه یا محیطی که Git و Node.js 22 دارد، ZIP را **استخراج کن**. فایل ZIP را به عنوان یک فایل تنها در GitHub آپلود نکنی؛ GitHub محتویات ZIP را به شکل خودکار استخراج و سایت را فعال نمی‌کند.
2. **کلیدهایی را که در گفتگوهای قبلی ارسال شده‌اند باطل کن و کلید تازه بساز.** فایل‌های `.env`, `Dotenv.txt`, رمز، توکن و فایل دیتابیس در GitHub قرار نگیرند. پیکربندی واقعی فقط در هاست/Secret Manager باشد.
3. در ریشه سورس اجرا کن:

```bash
node --version
npm run pages:build
npm run pages:test
npm run github:preflight
npm test
```

4. برای GitHub Pages لازم نیست API خارجی یا پرداخت فعال باشد.

## مرحله دوم: Push به GitHub

مخزن هدف از قبل ساخته شده است: https://github.com/feziai/FEZI-STUDIO و در زمان بررسی، سورس کامل روی `main` موجود نبود.

روش پیشنهادی: با **GitHub CLI** وارد حساب خودت شو (`gh auth login` با مرورگر)، سپس:

```bash
bash scripts/submit-github-pr.sh --apply
```

اسکریپت مخزن را Clone می‌کند، فایل‌ها را **بدون حذف فایل‌های دیگر** کپی می‌کند، تغییرات را در شاخه جدید Commit/Push می‌کند و Pull Request می‌سازد. سپس Pull Request را مرور و Merge کن. هیچ توکنی داخل گفتگو وارد نکن.

اگر CLI یا دسترسی GitHub نداری، روی کامپیوتر Git clone کن و فایل‌های **استخراج‌شده** را به ریشه مخزن Copy/Commit/Push کن. برای Push به مخزن، `Contents: write` یا دسترسی مناسب لازم است. فایل رسانه‌ای بزرگ را با `git` منتقل کن، نه آپلود تک‌فایل ۲۵MB مرورگر.

## مرحله سوم: راه‌اندازی GitHub Pages

1. مخزن `feziai/FEZI-STUDIO` را باز کن.
2. `Settings → Pages → Build and deployment → Source` را روی **GitHub Actions** قرار بده.
3. از `Actions`، workflow **Publish FEZI Plugin Sites to GitHub Pages** را Run کن یا با Merge شدن PR اجازه بده روی `main` اجرا شود.
4. آدرس مورد انتظار پس از موفقیت انتشار:
   - مرکز: `https://feziai.github.io/FEZI-STUDIO/`
   - صفحه FEZI AI: `https://feziai.github.io/FEZI-STUDIO/plugins/fezi-ai/`
   - کنترلر: `https://feziai.github.io/FEZI-STUDIO/plugins/fezi-website-controller/`
   - بقیه ۲۴ صفحه در صفحه اصلی فهرست می‌شوند.
5. ابتدا گزارش `Actions` و سپس URLهای واقعی را باز کن. این لینک‌ها تا قبل از فعال‌سازی و موفقیت Workflow **صرفاً آدرس‌های پیش‌بینی‌شده** هستند.

**۲۶ صفحه مستقل داخل یک سایت GitHub Pages** ساخته می‌شوند؛ به معنای ساخته‌شدن ۲۶ مخزن مستقل و ۲۶ دامنه جدا نیست. برای هر پلاگین یک آدرس اختصاصی وجود دارد. این روش تنها با یک مخزن و یک Workflow مدیریت می‌شود.

## مرحله چهارم: فعال‌سازی واقعی همه سرویس‌ها

1. سایت FEZI Studio را روی VPS یا هاست دائمی **Node.js 22** اجرا کن، با HTTPS و داده‌های پایدار؛ DNS را به هاست وصل کن.
2. فایل `.env.example` را فقط روی **سرور** به `.env` تبدیل و مقادیر واقعی جدید را تنظیم کن. `APP_PASSWORD`, `SESSION_SECRET`, `FEZI_AGENT_MCP_TOKEN`, `PUBLIC_BASE_URL` و کلیدهای موردنیاز را به طور امن وارد کن.
3. روی VPS دارای Docker:

```bash
docker compose -f compose.final.yaml up -d --build
docker compose -f compose.final.yaml ps
```

4. در سایت آنلاین مسیرهای `/health`, `/plugins`, `/api/plugins/public`, `/fezi-agent/knowledge` را بررسی کن. مسیرهای خصوصی بدون ورود باید خطای دسترسی بدهند.
5. Telegram: از BotFather توکن تازه، شناسه مدیر و HTTPS webhook بگیر؛ سپس `npm run telegram:factory:setup` (dry-run) و `npm run telegram:factory:setup -- --apply` را روی هاست اجرا کن؛ `getWebhookInfo` و پیام واقعی را تست کن.
6. MCP: مسیر `/mcp/fezi-website-controller` را با کلاینت مجاز تست کن و سپس با روش احراز هویت سازگار با ChatGPT وصل کن؛ Bearer خام فعلی لزوماً برای Plugin connection کافی نیست.
7. مدل‌های AI: کلید تازه OpenRouter و دیگر ارائه‌دهندگان را در سرور اضافه کن؛ ابتدا مدل رایگان و پاسخ واقعی را آزمایش کن. مدل پولی را بدون بودجه/تأیید روشن نکن.
8. FeziPay: فقط پس از اتصال و تأیید واقعی درگاه، webhook، idempotency، وضعیت سفارش و بررسی مالی/قانونی، قابلیت کسر و شارژ واقعی را عملیاتی اعلام کن.
9. Plugin Creator: هر پلاگین خصوصی نیازمند اتصال/نصب جداگانه در ChatGPT است؛ GitHub Pages آن را منتشر یا عمومی نمی‌کند.

## نگهداری و نسخه‌های بعدی

- فهرست متادیتای آخرین پلاگین‌ها در `public/plugins/registry.json` است؛ این یک snapshot تأییدشده در ۱۱ نوامبر ۲۰۲۶ است و **sync زنده با حساب ChatGPT نیست**.
- برای تولید مجدد صفحات بعد از تغییر نسخه: `npm run pages:build`، سپس Commit و Merge؛ workflow صفحات را بروزرسانی می‌کند.
- `catalog/current-plugin-versions.json` و `_github_pages/catalog.json` برای مصرف فهرست/نمایش است؛ آن‌ها ابزار اجرایی MCP نیستند.
- مجوز استفاده از دارایی‌های رسانه‌ای موجود در سورس را پیش از انتشار عمومی بررسی کن.
- GitHub Pages برای سایت Node.js یا API Hosting کافی نیست؛ دامنه اصلی سایت می‌تواند جدا از صفحات GitHub روی هاست اجرا شود.

## وضعیت‌های واقعی این خروجی

| مؤلفه | وضعیت |
|---|---|
| ۲۶ صفحه HTML و GitHub Actions | READY_TO_PUBLISH (تولید و تست محلی) |
| سورس Node.js 22 | SOURCE_READY (تست محلی) |
| GitHub main branch | NOT_PUSHED_FROM_THIS_RELEASE |
| GitHub Pages URL | NOT_VERIFIED_ONLINE |
| ChatGPT plugins (۲۶ مورد) | REGISTERED_PRIVATE (هرکدام نیازمند اتصال جداگانه) |
| Telegram, MCP, AI runtime | CONFIG_REQUIRED / NOT_VERIFIED |
| FeziPay real funds | CONFIG_REQUIRED / NOT_VERIFIED |

## امنیت

مخزن `feziai/FEZI-STUDIO` عمومی است. از محتواهای حساس و مجوز دارایی‌ها مطمئن شو. **اسکریپت Push به‌طور پیش‌فرض اجرا نمی‌شود**؛ اجرای آن اقدام آگاهانه مدیر است.

## اختیاری: برای هر پلاگین یک مخزن و سایت مستقل

علاوه بر ۲۶ صفحه داخل یک GitHub Pages، ۲۶ قالب سایت مستقل در `exports/individual-plugin-sites/` وجود دارد. می‌توانی **پس از مجوز صریح انتشار عمومی** از `scripts/publish-individual-github-sites.sh` برای ایجاد مخزن‌های جدا استفاده کنی. اسکریپت بدون `--apply --ack-create-public-repos` فقط طرح را نمایش می‌دهد و چیزی نمی‌سازد. جزئیات در `exports/individual-plugin-sites/README_ALL_FA.md`. این قالب‌ها هیچ کد اجراییِ API یا اطلاعات خصوصی ندارند.
