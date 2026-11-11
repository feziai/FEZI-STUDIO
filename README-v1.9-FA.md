# FEZI STUDIO v1.9 — GeneratePrompt.net Owner Sync

این بسته شامل هسته کامل v1.8، لندینگ، آرینا، FEZI AGENT، ابزارها، Prompt Library و همه تست‌های قبلی است. برای ورود تمام پرامپت‌های GeneratePrompt.net، راهنمای `README-GeneratePrompt-OWNER-SYNC-FA.md` را ببینید.

مهم: نسخه آماده شامل ۹۱ پرامپت اصلی قبلی است؛ انتقال تمام آرشیو GeneratePrompt.net **در این محیط انجام نشده** و اجرای importer با خروجی JSON مالک یا هاست اینترنت‌دار لازم است.

- بخش پرامپت‌ها: `/prompts`
- ورود آرشیو JSON: `/admin/prompts` (بعد از احراز هویت مالک)
- CLI: `npm run prompts:generateprompt -- --export /secure/generateprompt-export.json --owner-confirmed --commit`
- crawl عمومی: `npm run prompts:generateprompt -- --crawl --owner-confirmed --commit --limit 300`
- QA: `QA-v1.9-GENERATEPROMPT-FA.md`
- نتیجه `npm test` در محیط ساخت: ۵٬۴۶۷ تست موفق.

تسک‌های آموزشی مطابق اولویت کاربر هنوز آغاز نشده‌اند.
