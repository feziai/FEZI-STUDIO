#!/usr/bin/env bash
# Upload only to a development branch; DO NOT deploy the website.
# Run on a trusted machine with network access and a GitHub account permitted to write.
set -euo pipefail
if [[ "${1:-}" != '--confirm' ]]; then
  echo 'FEZI Studio v1.01: staging only, no production publishing.'
  echo 'To upload with GitHub CLI authentication: bash scripts/github-stage-bots-v101.sh --confirm'
  exit 0
fi
command -v gh >/dev/null || { echo 'GitHub CLI (gh) not installed';exit 1; }
command -v git >/dev/null || { echo 'Git not installed';exit 1; }
repo='feziai/FEZI-STUDIO'
branch='development/v1.01-telegram-bots'
root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
[ -f "$root/server.js" ] && [ -f "$root/scripts/telegram-login-bot.mjs" ] && [ -f "$root/core/telegram-image-worker-v101.js" ] || { echo 'Incomplete FEZI source';exit 1; }
[ ! -f "$root/.env" ] && [ ! -f "$root/Dotenv.txt" ] || { echo 'Secret file detected. Refusing to package.';exit 1; }
owner="$(gh api user --jq .login)"
[[ "${owner,,}" == 'feziai' ]] || { echo 'Authenticate as repository owner feziai, or use an explicitly permitted collaborator account';exit 1; }
gh auth setup-git >/dev/null
umask 077
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT
git clone --quiet "https://github.com/${repo}.git" "$work/repo"
cd "$work/repo"
if git ls-remote --exit-code --heads origin "$branch" >/dev/null;then git checkout -q --track "origin/$branch";else git checkout -qb "$branch";fi
# Never remove pre-existing files from the repo. Never upload data/private, secrets or cached model weights.
( cd "$root" && tar --exclude='./.git' --exclude='./node_modules' --exclude='./data' --exclude='./private' --exclude='./secrets' --exclude='./.env' --exclude='./.env.*' --exclude='./Dotenv.txt' --exclude='./models/*.gguf' --exclude='./models/*.gguf.download' --exclude='./*.zip' -cf - . ) | tar -xf -
cp "$root/.env.example" .env.example
git add -A
# Fail closed on sensitive filenames.
if git diff --cached --name-only | grep -Ev '^\.env\.example$' | grep -Ei '(^|/)(private|secrets|data|node_modules)/|(^|/)(\.env($|\.)|Dotenv\.txt$)|\.(pem|p12|p8|key|keystore|gguf|sqlite|sqlite3)$';then
  echo 'Sensitive path was staged; aborting';exit 1
fi
if git grep --cached -q -E '(github_pat_[A-Za-z0-9_]{10,}|sk-or-v1-[a-z0-9]{32,}|hf_[A-Za-z0-9]{25,}|[0-9]{8,12}:AA[A-Za-z0-9_-]{30,})' -- .;then
  echo 'Potential hardcoded credential detected; refusing push';exit 1
fi
if git diff --cached --quiet;then echo 'No changes to stage';exit 0;fi
echo "Changed files: $(git diff --cached --name-only | wc -l)"
echo 'Destination: development/v1.01-telegram-bots (NOT main, NO deployment)'
read -r -p 'Type YES to commit and push the development branch: ' answer
[[ "$answer" == YES ]] || { echo 'Cancelled';exit 1; }
git -c user.name='FEZI Studio' -c user.email='feziai@users.noreply.github.com' commit -qm 'FEZI Studio v1.01: Telegram bot integration staging (not deployed)'
git push origin "HEAD:refs/heads/${branch}"
echo "Staged at https://github.com/${repo}/tree/${branch}"
