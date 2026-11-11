# FEZI AGENT — ۱۵ مدل جدید + ۳ مدل قبلی

این یک کاتالوگ برای انتخاب *مدل اجراشده* است؛ هیچ وزن یا سخت‌افزاری به همراه سورس نصب نشده است. مجوزها باید هنگام توزیع مجدد حفظ شوند.

| ردیف | مسئولیت داخلی | شناسه فنی مدل | مجوز اعلام‌شده | موتور موردنیاز |
|---:|---|---|---|---|
| 1 | code_complex | [Qwen/Qwen2.5-Coder-7B-Instruct](https://huggingface.co/Qwen/Qwen2.5-Coder-7B-Instruct) | Apache-2.0 | Ollama قابل‌نصب |
| 2 | code_review | [Qwen/Qwen2.5-Coder-14B-Instruct](https://huggingface.co/Qwen/Qwen2.5-Coder-14B-Instruct) | Apache-2.0 | Ollama قابل‌نصب |
| 3 | translation | [Qwen/Qwen3-1.7B](https://huggingface.co/Qwen/Qwen3-1.7B) | Apache-2.0 | Ollama قابل‌نصب |
| 4 | planning | [Qwen/Qwen3-4B](https://huggingface.co/Qwen/Qwen3-4B) | Apache-2.0 | Ollama قابل‌نصب |
| 5 | general_advanced | [Qwen/Qwen3-8B](https://huggingface.co/Qwen/Qwen3-8B) | Apache-2.0 | Ollama قابل‌نصب |
| 6 | reasoning | [deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B](https://huggingface.co/deepseek-ai/DeepSeek-R1-Distill-Qwen-1.5B) | MIT | Ollama قابل‌نصب |
| 7 | document_summary | [ibm-granite/granite-3.3-2b-instruct](https://huggingface.co/ibm-granite/granite-3.3-2b-instruct) | Apache-2.0 | Ollama قابل‌نصب |
| 8 | summarization | [HuggingFaceTB/SmolLM3-3B](https://huggingface.co/HuggingFaceTB/SmolLM3-3B) | Apache-2.0 | Ollama قابل‌نصب |
| 9 | ocr | [PaddlePaddle/PaddleOCR-VL](https://huggingface.co/PaddlePaddle/PaddleOCR-VL) | Apache-2.0 | Worker خارجی |
| 10 | embedding | [BAAI/bge-m3](https://huggingface.co/BAAI/bge-m3) | MIT | Worker خارجی |
| 11 | rerank | [BAAI/bge-reranker-v2-m3](https://huggingface.co/BAAI/bge-reranker-v2-m3) | Apache-2.0 | Worker خارجی |
| 12 | speech_to_text | [openai/whisper-small](https://huggingface.co/openai/whisper-small) | Apache-2.0 | Worker خارجی |
| 13 | text_to_speech | [hexgrad/Kokoro-82M](https://huggingface.co/hexgrad/Kokoro-82M) | Apache-2.0 | Worker خارجی |
| 14 | image | [black-forest-labs/FLUX.1-schnell](https://huggingface.co/black-forest-labs/FLUX.1-schnell) | Apache-2.0 | Worker خارجی |
| 15 | video | [Wan-AI/Wan2.1-T2V-1.3B](https://huggingface.co/Wan-AI/Wan2.1-T2V-1.3B) | Apache-2.0 | Worker خارجی |

### سه مدل قبلی (جزء ۱۵ مدل جدید حساب نشده‌اند)

- [Qwen/Qwen2.5-Coder-0.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-Coder-0.5B-Instruct) — code_quick — Apache-2.0
- [Qwen/Qwen2.5-Coder-1.5B-Instruct](https://huggingface.co/Qwen/Qwen2.5-Coder-1.5B-Instruct) — code_edit — Apache-2.0
- [Qwen/Qwen3-0.6B](https://huggingface.co/Qwen/Qwen3-0.6B) — general — Apache-2.0

### توجه به مجوزها و منابع

مجوزهای Apache-2.0 و MIT در صفحات اصلی مدل‌ها بررسی شده‌اند، ولی وابستگی‌های هر زنجیره و خدمات سرویس‌دهی ممکن است شرایط مستقل داشته باشند. برای مثال مدل‌های تولید تصویر ممکن است encoder و tokenizer با شرایط جداگانه داشته باشند. این فهرست به معنای تأیید حقوقی همه زنجیره‌ها نیست.

### محدودیت توان سخت‌افزار

مدل‌های تصویر و ویدیو و حتی چند مدل متنی ۷B و ۱۴B معمولاً به RAM/GPU زیادی نیاز دارند. همه آن‌ها هم‌زمان روی یک هاست اشتراکی Node.js اجراشدنی نیستند. راهکار FEZI AGENT اجرای انتخابی و جداکردن backendهای سنگین از وب‌سایت است.
