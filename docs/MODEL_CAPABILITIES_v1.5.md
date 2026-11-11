# Model capability evidence — November 2026

Derived catalog sources:
- User upload `nsfw-open-source-50.md` (50 indexed model/tool entries; license hints require per-repo verification).
- User upload `open-source-ai-lists.md` (model families, 49 GitHub projects, 40 coding agents and related open tools; list writer explicitly warns some information may be outdated).
- Existing v1.4 catalog `config/open-models.json`.
- Additional official model variant profiles below.

Verified examples (specific versions only):

| Variant | Input image count | Duration (seconds) | Notes | Official source |
|---|---:|---|---|---|
| HunyuanVideo original T2V | 0 | 5 (~129 frames at ~24 fps) | HunyuanVideo-I2V is separate | https://github.com/Tencent-Hunyuan/HunyuanVideo |
| HunyuanVideo I2V | 1 | 5 (~129 frames) | Requires specific I2V checkpoint | https://github.com/Tencent-Hunyuan/HunyuanVideo-I2V |
| CogVideoX 5B I2V | 1 | 6 | I2V variant, not every CogVideoX checkpoint | https://github.com/THUDM/CogVideo |
| LTX-Video original multi-conditioning | Multiple, upper limit not verified | workflow-specific | Multi-keyframe; do not fabricate image max | https://github.com/Lightricks/LTX-Video |
| LTX-2.5 Fast hosted API | 1 (+ optional last frame) | 6,8,10,12,14,16,18,20 (720p/1080p at 24/25 FPS) | Hosted **paid** product; do not equate with free self-hosted weights; 4K and high FPS max 10 sec | https://docs.ltx.io/models/ltx-2-5 |

The rest remain `capabilities.verified=false` and `imageInputs:null`,`durationOptionsSec:null` in `config/studio-models-v15.json`. Null is deliberate: capability and conditions depend on specific checkpoint and deployment. The UI must not blindly infer model supports 4 images or 10 seconds from family name.

Avatar workflow candidates included in the catalog: SadTalker, LivePortrait, MuseTalk, EchoMimic, Open-LLM-VTuber. They are **not installed**. Verify source, training rights, service terms and GPU needs before activation. For low-GPU Arina live, rely on pre-rendered clips; these libraries generally require inference for initial clip generation.
