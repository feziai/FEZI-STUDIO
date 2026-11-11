---
name: fezi-five-second-video
description: Route an explicitly requested five-second AI video from an authorized connected provider, with status and MP4 delivery via MCP Apps when available.
---
# FEZI Five-Second Video | ویدیوی پنج‌ثانیه‌ای

Use when a user requests a short video, a text-to-video clip, or animation of an authorized image. This is a skill/instruction, NOT a generator or entitlement.

1. Ask only for genuinely missing requirements: a prompt or uploaded reference, and a desired duration if it is not 5 seconds. Default to 5 seconds, aspect ratio 9:16 for shorts or 16:9 when context indicates landscape. Respect supplied parameters.
2. Discover available **connected video-creation tools** in this host. Inspect the actual tool schema for explicit durationSeconds=5 support (e.g. connected VideoGen `generate_video_clip` supports 1–30 seconds). Other providers may accept fixed durations, require editing, or lack a five-second mode. Never invent models, costs, free tiers or API endpoints.
3. Check that the account is authorized and has suitable quota; obtain user approval if a paid call or side effect requires it. Do not request secret keys in chat. If provider is unavailable, offer a ready-to-use prompt or a backend integration scaffold and say the video is not generated.
4. Submit one job using the provider's documented tool, requested prompt and duration=5 where supported. Record provider job ID, creation time, intended duration, desired aspect ratio and user ID on the authorized backend only. Don't claim completion on pending response.
5. Check the real job result through the provider's status tool with bounded retries and clear failure states; verify the final media type, accessible URL, metadata and duration. Deliver the actual MP4 or tool-provided download link, not a hypothetical URL. If duration is off, disclose the difference and offer an explicitly authorized trim workflow.
6. If an MCP Apps UI resource has been deployed, render an accessible video card (preview/player, progress, retry, download, error) via a resource `ui://...`, registered tool metadata `_meta.ui.resourceUri`, and the `ui/*` host bridge. Separate data tools from render tools. Do not claim an HTML preview embedded in a ZIP is a live ChatGPT app.
7. Log user consent and status; avoid storing private source imagery in a public bucket, and never expose tokens in UI or workflow JSON.

**Tests:** valid five-second request; missing prompt; provider not connected; insufficient credits; job still running; failed job; output longer/shorter than five seconds; expired download URL; duplicate job submission.

**Provider-specific known tool reference (discover each session, not guaranteed in every plugin):** VideoGen `generate_video_clip` can accept `durationSeconds: 5`, `prompt`, `aspectRatio`, `imageFileIds`, and `startFrameFileId`. It returns a job ID that needs status polling. A different ChatGPT host may lack it. An MCP UI alone does not generate video.

See `references/FEZI_SHARED_VIDEO_SCHOLAR_REGISTRY.json` for integration contracts and source URLs.
