# معماری پخش آنلاین ۲۴ ساعته آرینا

هدف: هر ۲۰ یا ۲۰۰ تماشاگر یک استریم یکسان ببینند، نه اینکه هر مرورگر جداگانه ویدیوی خودش را تولید کند.

ساختار پیشنهادی: FEZI Studio (Node.js + چت مشترک و صف درخواست‌ها) → GPU Worker (رندر کلیپ واقعی مجاز، تحویل فایل‌ها) → FFmpeg/OBS (ویدیوی پیوسته با codec یکسان) → SRS (RTMP/HLS/WebRTC) → یک پلیر مشترک در سایت. تا آماده شدن GPU می‌توان از کلیپ‌های واقعی از پیش تهیه‌شده استفاده کرد؛ سیستم نباید عکس‌های استوری‌برد را به‌جای ویدیوی واقعی جا بزند.

برای نمونه سرویس SRS با Docker روی VPS اجرا می‌شود:

```bash
docker compose -f compose.stream.example.yaml up -d
# stream only after licensed MP4 clips exist
./scripts/stream-arina-from-clips.sh /srv/arina/playlist.txt rtmp://127.0.0.1/live/arina
```

نمونه فرمت playlist.txt:

```text
file '/srv/arina/clips/idle.mp4'
file '/srv/arina/clips/typing.mp4'
file '/srv/arina/clips/dance.mp4'
```

برای آدرس واقعی HTTPS بهتر است SRS پشت TLS reverse proxy و احراز هویت ingest قرار بگیرد، و پورت RTMP فقط برای آدرس IP encoder باز باشد. HLS Latency معمولاً از WebRTC بیشتر است. سرویس ۲۴ ساعته هزینه برق/شبکه/سرور دارد. `docker compose` فقط پخشِ کلیپ‌های آماده را راه می‌اندازد؛ **تولید یک‌دقیقه‌ای AI، حرکت 3D و بازی زنده هنوز نیازمند نصب واقعی مدل و GPU است**.
