#!/usr/bin/env bash
# Use only on your own computer after `gh auth login`; never paste a PAT here.
set -euo pipefail
command -v git >/dev/null || { echo 'Install git'; exit 1; }
command -v gh >/dev/null || { echo 'Install GitHub CLI (gh)'; exit 1; }
command -v rsync >/dev/null || { echo 'Install rsync'; exit 1; }
gh auth status >/dev/null
HERE="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
REPO='feziai/FEZI-STUDIO'
BRANCH="fezi-arina-miniapp-$(date +%Y%m%d-%H%M%S)"
DEST="$(mktemp -d)"
trap 'rm -rf "$DEST"' EXIT

gh repo clone "$REPO" "$DEST/FEZI-STUDIO"
cd "$DEST/FEZI-STUDIO"
git switch -c "$BRANCH"
rsync -a --exclude='.git/' --exclude='.env' --exclude='data/' --exclude='private/' \
  --exclude='node_modules/' --exclude='secrets/' --exclude='*.sqlite' \
  --exclude='public/arina-live/assets/video/arina-three-minute-unedited.mp4' \
  "$HERE/" ./
git add -A
if git diff --cached --quiet; then echo 'No new changes';exit 0;fi
if git diff --cached --name-only | grep -Eq '(^|/)\.env$|(^|/)secrets/|(^|/)private/|(^|/)data/'; then
  echo 'Refusing to upload private paths';exit 1
fi
if git diff --cached --name-only | while IFS= read -r f; do [[ -f "$f" ]] && (( $(wc -c < "$f") > 100000000 )) && echo "$f"; done | grep .; then
  echo 'A file exceeds GitHub 100 MB hard limit';exit 1
fi
git commit -m 'FEZI Studio: Arina independent Telegram bot, live miniapp and channel entry'
git push --set-upstream origin "$BRANCH"
GH_HOST=github.com gh pr create -R "$REPO" --base main --head "$BRANCH" --title 'FEZI Studio — Arina Mini App and authorized channel link' --body 'Source-ready app; exclude the 113 MB video from Git. Deploy media separately. Secrets stay server-side.'
echo "Uploaded branch $BRANCH. Review PR before merging."
