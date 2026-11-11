# FEZI Website Controller — پچ کنترل سایت از ChatGPT

مبنا: `FEZI_STUDIO_NODE22_TELEGRAM_CHATGPT_REMOTE_FINAL_2026_11_08.zip`.

## فایل‌ها
- `core/fezi-site-editor.mjs`: کنترل متن فایل‌های پروژه با مرحله پیش‌نمایش، SHA-256 و نسخه پشتیبان.
- `core/fezi-agent-mcp.mjs`: معرفی سه ابزار `fezi_site_read`، `fezi_site_preview_replace` و `fezi_site_apply_replace`.
- `server.js`: نصب سرویس کنترل‌گر روی MCP موجود.
- `tests/fezi-site-editor.test.mjs`: آزمون‌های امنیت و عملکرد.

## نصب
1. از `server.js` و `core/fezi-agent-mcp.mjs` فعلی نسخه پشتیبان بگیر. اگر سورس از نسخه دیگری است، فایل‌ها را کورکورانه جایگزین نکن؛ تغییرات را با نسخه موجود ادغام کن.
2. محتویات این پچ را داخل ریشه پروژه FEZI Studio کپی کن و سپس `node --test tests/fezi-site-editor.test.mjs` و `npm test` را اجرا کن.
3. هاست Node.js 22، HTTPS و `FEZI_AGENT_MCP_TOKEN` تازه و ایمن لازم‌اند. MCP فعلی با Bearer token محافظت می‌شود؛ برای اتصال سازگار ChatGPT ممکن است سرور OAuth تأییدشده نیاز باشد.
4. ابزار `fezi_site_read` فقط متن پروژه تحت کنترل FEZI Studio را می‌خواند. `fezi_site_preview_replace` تغییر را بدون ذخیره آماده می‌کند و `fezi_site_apply_replace` با `confirm:true` و SHA-256 از پیش‌نمایش، بعد از ساخت checkpoint ذخیره می‌کند.
5. این پچ به `sites-project://` داخلی ChatGPT دسترسی مستقیم ندارد؛ برای آن پروژه‌ها از مسیر ویرایش مجاز ChatGPT Sites استفاده کن.

## محدودیت
- ذخیره فایل **به معنی انتشار روی دامنه نیست**.
- `checkpoint` فقط پشتیبان می‌سازد؛ موفقیت restore خودکار در این پچ ادعا نمی‌شود.
- پل ارتباطی OAuth و انتشار مستقیم GitHub باید جداگانه پیکربندی شوند؛ کلیدهای ارسالی در چت قدیمی را داخل پروژه قرار نده.
