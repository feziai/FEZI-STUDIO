# FEZI Studio — گزارش جامع و نصب ورودهای سریع

نسخهٔ پایه: `Google OAuth Logos Runtime Fix 2026-11-07` (بدون بخش اضافه‌شدهٔ Persian Dark Horse).

## ۱. چه چیزی در این اصلاحیه واقعاً پیاده‌سازی شد؟

- Google OAuth با جریان Authorization Code + PKCE و `state`، `nonce` و اعتبارسنجی امضای JWT از JWKS رسمی گوگل؛ بدون پکیج npm اجباری برای ورود.
- GitHub OAuth با scope محدود `read:user user:email`، PKCE و بررسی ایمیل‌های تأییدشده از GitHub API.
- Facebook Login با جریان کد یک‌بارمصرف، `state` معتبر و دریافت شناسهٔ کاربر؛ ایمیل فیس‌بوک در کد به‌طور پیش‌فرض «تأییدشده» فرض نمی‌شود.
- Telegram Login با جریان رسمی OIDC (Authorization Code + PKCE)، اعتبارسنجی امضای ID Token با JWKS و بررسی `issuer`/`audience`/`nonce`/`exp`.
- صفحهٔ پروفایل: دکمه‌های بزرگ و ریسپانسیو با آیکون محلی Google، GitHub، Telegram، Facebook و نمایش صادقانهٔ محدودیت ChatGPT Login.
- `/api/auth/providers`: فهرست وضعیت پیکربندی OAuth بدون افشای رمزها، به‌همراه Redirect URI صحیح هر ارائه‌دهنده.
- `/auth/<provider>?link=1`: پس از ورود با حساب موجود، اتصال اختیاری هویت جدید؛ برای ایمیل همسان، *ادغام خودکارِ حساب‌ها ممنوع* است.
- `npm run auth:doctor`: گزارش فقط-خواندنی دربارهٔ تنظیمات و آدرس‌های Callback بدون چاپ Secrets.
- پرچم `Secure` برای کوکی نشست هنگام استفاده از `PUBLIC_BASE_URL=https://...`، حتی پشت Reverse Proxy.
- بخش ورود با ChatGPT به‌صورت غیرفعال/محدود نشان داده می‌شود، نه دکمهٔ جعلی.

**تنظیم‌شدن یک Client ID/Secret، معادل آزمایش موفق ورود واقعی در دامنهٔ عمومی نیست.**

## ۲. راه‌اندازی قدم‌به‌قدم گوگل (اولین اولویت)

1. یک دامنهٔ HTTPS واقعی برای FEZI Studio نهایی کن. مثال صرفاً نمونه است: `https://studio.example.com`.
2. به [Google Cloud Console / Auth / Clients](https://console.cloud.google.com/auth/clients) برو و پروژه انتخاب یا ایجاد کن.
3. در صفحهٔ Branding و Audience، نام FEZI Studio، ایمیل پشتیبانی، دامنه و کاربران آزمایشی را طبق الزامات گوگل تنظیم کن.
4. Create OAuth Client → **Web application**. در Authorized JavaScript origins، `https://YOUR-DOMAIN` و در Authorized redirect URIs، دقیقاً `https://YOUR-DOMAIN/auth/google/callback` را ثبت کن.
5. روی **هاست خصوصی FEZI Studio** این مقادیر را در Environment/Secrets وارد کن (نه در GitHub، ZIP، HTML یا چت):

```dotenv
PUBLIC_BASE_URL=https://YOUR-REAL-DOMAIN
COOKIE_SECURE=true
SESSION_SECRET=GENERATE_A_NEW_LONG_RANDOM_SECRET_ON_SERVER
GOOGLE_CLIENT_ID=YOUR_NEW_GOOGLE_WEB_CLIENT_ID
GOOGLE_CLIENT_SECRET=YOUR_NEW_GOOGLE_WEB_CLIENT_SECRET
```

6. پس از راه‌اندازی Node.js 22، `npm run auth:doctor` و `GET /api/auth/providers` را بررسی کن.
7. از یک مرورگر واقعی روی دامنهٔ HTTPS، دکمهٔ Google را بزن؛ ورود، خروج، برگشت به سایت و مسدودشدن `state` غلط را امتحان کن.
8. کلیدهای Google قبلی که در گفت‌وگوها/فایل‌های غیرامن آمده‌اند باید تعویض شوند. حتی اگر Client ID عمومی باشد، Client Secret را عمومی نکن.

## ۳. GitHub Login

در [GitHub Developer Settings / OAuth Apps](https://github.com/settings/developers) یک OAuth App بساز:

- Application name: `FEZI Studio`
- Homepage URL: `https://YOUR-DOMAIN`
- Authorization callback URL: `https://YOUR-DOMAIN/auth/github/callback`
- دو متغیر خصوصی سرور: `GITHUB_OAUTH_CLIENT_ID` و `GITHUB_OAUTH_CLIENT_SECRET`

**ورود کاربران با GitHub، دسترسی Push به مخزن‌های آنان نیست.** Push نیازمند نصب GitHub App یا مجوز جداگانهٔ واضح است؛ این ورود فقط پروفایل را تأیید می‌کند.

## ۴. Telegram Login

از [@BotFather](https://t.me/BotFather)، برای ربات ورود FEZI Studio بخش **Login Widget / OIDC** را باز کن؛ Origin و Redirect مجاز را تعریف کن:

- Allowed Origin: `https://YOUR-DOMAIN`
- Redirect URI: `https://YOUR-DOMAIN/auth/telegram/callback`
- دو متغیر خصوصی سرور: `TELEGRAM_OIDC_CLIENT_ID` و `TELEGRAM_OIDC_CLIENT_SECRET`

توکن `TELEGRAM_BOT_TOKEN` یا توکن ربات آرینا **جایگزین Client Secret جریان جدید OIDC نیست**. برای ورود سایت یک ربات مستقل با نام و لوگوی FEZI Studio بهتر است.

## ۵. Facebook Login

در [Meta Developers](https://developers.facebook.com/apps/) یک App مناسب وب‌سایت بساز، Facebook Login را تنظیم کن و این URI را در **Valid OAuth Redirect URIs** قرار بده:

`https://YOUR-DOMAIN/auth/facebook/callback`

متغیرهای خصوصی: `FACEBOOK_APP_ID` و `FACEBOOK_APP_SECRET`. پیش از ارائه به عموم، App Mode، تنظیمات OAuth، Data Use و بازبینی دسترسی‌های لازم را در حساب Meta بررسی کن.

## ۶. Sign in with ChatGPT

طبق مستندات رسمی OpenAI، این نوع ورود وجود دارد ولی اکنون صرفاً برای شرکای منتخب در دسترس است و هر وب‌سایت نمی‌تواند با یک API Key یا کلید معمولی Google آن را فعال کند. در FEZI Studio دکمهٔ آن صادقانه غیرفعال است. برای درخواست همکاری رسمی باید از فرم علاقه‌مندی معرفی‌شده در مستندات OpenAI استفاده شود. نباید از توکن ChatGPT یا دسترسی غیرمجاز برای شبیه‌سازی Login استفاده کرد.

## ۷. گزینه‌های ورود دیگر

پس از اجرای چهار مورد بالا، **Microsoft Entra ID / Microsoft personal account** گزینهٔ مناسب بعدی برای ورود است (OpenID Connect استاندارد، Client ID/Secret و Redirect). **Apple** به‌ویژه برای کاربران iPhone مفید است اما تنظیمات Developer Team و Service ID پیچیده‌تر دارد. هر دو پیش از افزودن، به تصمیم محصولی و تأیید مالک نیاز دارند.

## ۸. وضعیت همهٔ بخش‌های FEZI Studio

| بخش | در سورس موجود | وضعیت اجرا روی هاست عمومی / کمبود |
| --- | --- | --- |
| Landing, Hub, Playground | بله | تست مسیر HTTP محلی انجام شد؛ کارکرد همهٔ تعاملات در مرورگر واقعی نیازمند تست E2E است |
| حساب کاربری و جلسات | بله | ذخیرهٔ محلی JSON، مناسب نمونه اولیه؛ برای چند سرور و بازیابی نیازمند پایگاه داده و Backup |
| ورود سریع چهارگانه | کد و UI تکمیل شد | **هیچ اتصال OAuth واقعی روی دامنهٔ نهایی هنوز تأیید نشده**؛ نیازمند متغیرهای سرور و تست زنده |
| ChatGPT Login | گزینهٔ غیرفعال و توضیح محدودیت | دسترسی رسمی شریک OpenAI لازم است |
| لوگوهای مدل‌ها و سرویس‌ها | آیکون‌های محلی موجود | لوگوهای دسته‌بندی FEZI لزوماً فایل رسمی برند مدل‌ها نیستند؛ صحت نمایش در موبایل باید تست شود |
| FEZI Agent / چت | API و مسیریابی دارد | نصب Ollama و مدلِ روی همان سرور یا API فعال را هنوز تأیید نکرده‌ایم |
| Cline / OpenHands / Code Editors | کاتالوگ و مسیرهای معرفی | هر ابزار مستقل باید در محیط ایزوله و دارای مجوز اجرا شود؛ اسم در کاتالوگ به معنی نصب نیست |
| Image / Video Studio | رابط و مسیر Worker | تولید واقعی به GPU/API، مجوز مدل و سلامت Worker وابسته است |
| Arina Live | UI، واکنش و کتابخانهٔ ویدیو | پخش ۲۴ساعته مستلزم سرور همیشه‌روشن و Health Monitor، نه صرفاً باز بودن صفحه |
| رادیوی مشترک و ژتون | منطق سروری و آزمون واحد | HTTP/HTTPS استریم‌های زنده، مرورگر موبایل و چند نمونهٔ سرور نیازمند تست عملی است |
| ربات آرینا و دیگر ربات‌ها | سورس و اسکریپت Polling/Webhook | استقرار Process دائمی، توکن‌های تازه، Webhook و بررسی Logs هنوز نیاز است |
| انتشار پست خودکار کانال | بخشی از مسیرها و برنامه‌ریزی | مجوز مدیر کانال و اتصال زمان‌بندی نیاز است؛ انتشار به کانال غیرمجاز فعال نمی‌شود |
| API Keys و مدل‌های پولی | کاتالوگ و مسیر کنترل | بررسی اعتبار سمت سرور، حساب هزینه و تسویه باید جدا تست شود |
| خرید و کیف پول رمزارز | صفحه و پیش‌نمایش آدرس‌ها | **تأیید پرداخت و شارژ خودکار واقعی فعال نیست**؛ کاربر نباید برای اعتبار فرضی پول بفرستد |
| ChatGPT plugin | نسخهٔ خصوصی مهارت‌محور ساخته شد | ابزار زندهٔ MCP متصل نشده؛ انتشار عمومی نیازمند دامنهٔ HTTPS، بررسی و تأیید OpenAI |
| GitHub و استقرار | ZIP سورس و Workflow | Push به مخزن در این مرحله انجام نشده؛ GitHub Pages قادر به اجرای ربات/Node.js نیست |
| امنیت و دسترسی‌ها | ساختار اولیه، کوکی امضاشده، CSRF و محدودسازی | Secrets قبلاً در متون به اشتراک گذاشته شده‌اند؛ باید Rotate شوند؛ ممیزی امنیتی مستقل پیش از تولید ضروری است |

## ۹. چه چیزهایی نمی‌توان داخل ZIP تضمین کرد؟

- مدل‌های Ollama یا GPU با حجم گیگابایتی، چون مدل‌های مورد نظر و سخت‌افزار هاست مشخص نشده‌اند و دانلود آنلاین ممکن نبود.
- سرویس‌های خارجی مثل Google/GitHub/Telegram/Facebook و رادیو که همیشه در اختیار صاحبان خودشان هستند.
- یک سرویس ۲۴ساعته تنها با آپلود ZIP: باید سرور Node.js 22 و Supervisor / Process Manager، TLS، ذخیره‌سازی پایدار و پرداخت هزینهٔ زیرساخت وجود داشته باشد.
- `optionalDependencies` مانند Hugging Face ممکن است پس از نصب Node به دانلود نیاز داشته باشند. مسیر اصلی ورود و وب‌سایت در این اصلاحیه با Node.js 22 بدون وابستگی npm اجباری طراحی شده است.

## ۱۰. تست‌های انجام‌شده و نشده

- تست واحد مجموعهٔ سورس پس از تغییرات (شامل سناریوهای OAuth، JWT جعلی امضاشده برای تست، وضعیت مدل و منوها) موفق؛ نتیجهٔ نهایی در `RELEASE_MANIFEST.json` می‌آید.
- درخواست HTTP محلی برای `/`, `/profile`, `/api/auth/providers`, `/purchase`, `/arina-live`, `/model-playground` و آیکون‌ها پاسخ مناسب گرفت.
- **تست واقعیِ ورود با حساب Google یا شبکه‌های اجتماعی، پرداخت، مدل Ollama روی هاست، موسیقی ۲۴ساعته و Push به GitHub انجام نشده است**؛ بدون دامنه و دسترسی‌های سرور نمی‌توان آن‌ها را صادقانه موفق اعلام کرد.

## ۱۱. ترتیب اطلاعات موردنیاز از مالک — یکی‌یکی

**گام اول: فقط دامنهٔ نهایی و HTTPS سایت FEZI Studio**. پس از مشخص‌شدن دامنه، URIهای دقیق Google، GitHub، Telegram و Facebook آماده می‌شوند.

**گام دوم: Google Web Client ID (شناسهٔ عمومی)**. Client Secret را **فقط در تنظیمات خصوصی هاست** وارد کن؛ نیازی نیست آن را در گفتگو ارسال کنی.

**گام سوم: GitHub OAuth App Client ID**، سپس Client Secret در هاست.

**گام چهارم: Telegram OIDC Client ID و نام ربات Login**، Client Secret در هاست.

**گام پنجم: Facebook App ID**، App Secret در هاست.

**گام ششم: آدرس HTTPS سرور MCP و وضعیت دسترسی مالک**، سپس اتصال خصوصی پلاگین ChatGPT به سرویس زنده.

بعد از این مراحل، تست واقعی مشترک همهٔ بخش‌ها انجام شود. هیچ کلید قبلاً منتشرشده‌ای را دوباره استفاده نکن.
