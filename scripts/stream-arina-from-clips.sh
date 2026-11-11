#!/usr/bin/env bash
# External VPS/streaming machine only. Requires actual pre-rendered and licensed clips.
# Each video is transcoded to a uniform 1080p30 H264 stream. Does not generate images/video.
set -euo pipefail
if [[ $# -ne 2 ]]; then
  echo 'Usage: ./scripts/stream-arina-from-clips.sh /path/to/playlist.txt rtmp://HOST/live/arina' >&2
  exit 2
fi
playlist="$1";endpoint="$2"
if [[ ! -f "$playlist" ]]; then echo 'Playlist file does not exist' >&2;exit 2;fi
if [[ ! "$endpoint" =~ ^rtmps?:// ]]; then echo 'RTMP or RTMPS destination required' >&2;exit 2;fi
if ! command -v ffmpeg >/dev/null;then echo 'FFmpeg required' >&2;exit 2;fi
# Run this only for pre-generated media the operator has the right to broadcast.
exec ffmpeg -hide_banner -nostdin -re -stream_loop -1 -f concat -safe 0 -i "$playlist" \
 -map 0:v:0 -map 0:a:0? -vf 'scale=1920:1080:force_original_aspect_ratio=decrease,pad=1920:1080:(ow-iw)/2:(oh-ih)/2,fps=30,format=yuv420p' \
 -c:v libx264 -preset veryfast -b:v 4500k -maxrate 5500k -bufsize 11000k -g 60 -keyint_min 60 \
 -c:a aac -b:a 160k -ar 48000 -ac 2 -f flv "$endpoint"
