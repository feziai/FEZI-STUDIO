# اتصال ویرایشگرهای رایگان دسکتاپ به FEZI AGENT

نسخه 0.77 — توسعه GitHub/Telegram/Desktop

## امکانات آماده و تست‌پذیر

- ده ابزار تحت مجوز متن‌باز در کاتالوگ سرور ثبت شده‌اند.
- پس از ورود مدیر، `GET /api/desktop/tools` مشخصات ابزارها را ارائه می‌کند. این ابزارها در پاسخ‌های معمول چت نمایش داده نمی‌شوند.
- پس از ایجاد پروژه، `GET /api/desktop/export?id=<project-id>` فایل ZIP قابل بازکردن در VSCodium، Zed، Theia، Lapce، Pulsar، Neovim و Helix می‌دهد. راهنمای AGENTS.md و تنظیمات `.vscode` هم داخل خروجی قرار می‌گیرند.
- در **کامپیوتر شخصی** `node scripts/desktop-launch.mjs --list` ابزارهای موجود در PATH را شناسایی می‌کند؛ سپس `node scripts/desktop-launch.mjs --tool vscodium --project /absolute/path` ویرایشگر را با پروژه انتخاب‌شده اجرا می‌کند.
- اجرای OpenCode و Aider نیازمند پرچم `--confirm-agent` است تا کاربر از امکان تغییر فایل و هزینه مدل مطلع باشد.
- برای code-server فایل `compose.editor.yaml` یک سرویس مجزا با رمز مستقل فراهم می‌کند. در هاست اشتراکی cPanel معمولاً Docker پشتیبانی نمی‌شود.

## روش راه‌اندازی روی سرور دارای Docker

```bash
# در فایل .env مقدارهای APP_PASSWORD، SESSION_SECRET و FEZI_EDITOR_PASSWORD را تنظیم کنید.
docker compose -f compose.editor.yaml up -d --build
```

FEZI AGENT روی `127.0.0.1:3000` و code-server روی `127.0.0.1:8443` به سیستم میزبان محدود می‌شوند. برای دسترسی دور، تونل SSH یا Reverse Proxy احرازهویت‌شده HTTPS لازم است. **کدها و فایل‌های داده روی volume مشترک قرار می‌گیرند؛ این یک محیط تک‌مدیره است، نه sandbox چندکاربره.**

## وضعیت ادغام

این بسته خود ادیتورها را نصب یا جایگزین نمی‌کند. اتصال‌های واقعی عبارت‌اند از خروجی workspace، لانچر محلی و نمونه سرویس code-server. اتصال live-edit با API رسمی همه ابزارهای دسکتاپ، همگام‌سازی لحظه‌ای و اجرای Agentهای دیگر در این نسخه آماده نیستند.

## مخازن رسمی

VSCodium: https://github.com/VSCodium/vscodium (MIT)

Theia IDE: https://github.com/eclipse-theia/theia-ide (MIT)

code-server: https://github.com/coder/code-server (MIT)

Zed: https://github.com/zed-industries/zed (GPL-3.0-or-later / Apache-2.0)

Lapce: https://github.com/lapce/lapce (Apache-2.0)

Neovim: https://github.com/neovim/neovim (Apache-2.0 + Vim parts)

Helix: https://github.com/helix-editor/helix (MPL-2.0)

Pulsar: https://github.com/pulsar-edit/pulsar (MIT)

OpenCode: https://github.com/anomalyco/opencode (MIT)

Aider: https://github.com/Aider-AI/aider (Apache-2.0)

مجوز و شرایط افزونه‌ها/مدل‌های متصل جداگانه است. در رابط عمومی همچنان تنها FEZI AGENT معرفی می‌شود.
