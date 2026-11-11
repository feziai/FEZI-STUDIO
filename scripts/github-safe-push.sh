#!/usr/bin/env bash
# Safe, no-force upload of FEZI source into EXISTING github.com/feziai/FEZI-STUDIO.
# Run locally on an owner-authenticated machine with git and gh CLI installed.
set -euo pipefail
if [[ ${1:-} != --confirm ]]; then
  echo 'Dry run. To upload FEZI source to the existing repo, run: bash scripts/github-safe-push.sh --confirm'
  echo 'Requires: gh auth login (as feziai), git, network access, write permission to FEZI-STUDIO.'
  exit 0
fi
command -v git >/dev/null && command -v gh >/dev/null && command -v tar >/dev/null || { echo 'Missing git, gh, or tar';exit 1; }
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$root"
for f in server.js package.json .gitignore .github/workflows/ci.yml core/studio-v15.js scripts/telegram-login-bot.mjs; do test -f "$f" || { echo "Missing $f";exit 1; };done
[ ! -f .env ] || { echo 'Refusing to package local .env; move it to secrets before uploading';exit 1; }
who="$(gh api user --jq .login)"
[ "${who,,}" = 'feziai' ] || { echo "Authenticated as $who, not feziai; stop";exit 1; }
gh auth setup-git >/dev/null
umask 077
work="$(mktemp -d)";trap 'rm -rf "$work"' EXIT
repo='https://github.com/feziai/FEZI-STUDIO.git'
git clone --quiet "$repo" "$work/repo"
# Preserve files from the existing repo and never force-push or delete remote files.
# PRIVATE gallery and user files must NEVER be committed to this public repository.
( cd "$root" && tar --exclude='./.git' --exclude='./node_modules' --exclude='./data' --exclude='./private' --exclude='./.env' --exclude='./.env.*' --exclude='./models/*.gguf' --exclude='./models/adapters/*.gguf' --exclude='./*.zip' -cf - . ) | ( cd "$work/repo" && tar -xf - )
cp "$root/.env.example" "$work/repo/.env.example"
cd "$work/repo"
git add -A
if git diff --cached --name-only | grep -E '(^|/)(data|private|node_modules)/|(^|/)\.env($|\.)|\.(gguf|pem|key|p12|keystore)$'; then
 echo 'Private or model files were staged; refusing upload';exit 1
fi
if git diff --cached --quiet; then echo 'No changes to upload';exit 0;fi
printf 'Staged files: '; git diff --cached --name-only | wc -l
read -r -p 'Type YES to push FEZI v1.01 source to public repository: ' answer
[ "$answer" = YES ] || { echo 'Cancelled';exit 1; }
git -c user.name='FEZI Studio Release' -c user.email='feziai@users.noreply.github.com' commit -qm 'FEZI Studio v1.01: Telegram bots, account bridge and secure login'
git push origin HEAD:main
echo 'Committed to https://github.com/feziai/FEZI-STUDIO'
