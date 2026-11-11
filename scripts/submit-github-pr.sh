#!/usr/bin/env bash
set -euo pipefail
REPOSITORY="feziai/FEZI-STUDIO"
SOURCE_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
if [[ "${1:-}" != "--apply" ]]; then
  echo "FEZI Studio GitHub Publisher — DRY RUN ONLY"
  echo "Repository: ${REPOSITORY}"
  echo "Source folder: ${SOURCE_DIR}"
  echo "To submit a real PR: first run gh auth login, then execute bash scripts/submit-github-pr.sh --apply"
  echo "Never paste GitHub tokens or other keys into chat or embed them into the repository."
  exit 0
fi
for cmd in gh git rsync node; do command -v "$cmd" >/dev/null || { echo "Missing tool: $cmd"; exit 2; }; done
gh auth status >/dev/null
node "$SOURCE_DIR/scripts/github-public-safety-check.mjs"
node --test "$SOURCE_DIR/tests/github-pages-catalog.test.mjs"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT
gh repo clone "$REPOSITORY" "$TMP/repo" -- --depth 1
rsync -a --exclude '.git' --exclude '.env' --exclude 'Dotenv.txt' --exclude 'node_modules/' --exclude 'data/' --exclude 'private/' --exclude 'secrets/' --exclude 'private-plugin-exports/' "$SOURCE_DIR/" "$TMP/repo/"
cd "$TMP/repo"
BRANCH="fezi-plugin-pages-$(date -u +%Y%m%d%H%M%S)"
git checkout -b "$BRANCH"
git add -A
git diff --cached --check
if git diff --cached --name-only | grep -Eq '(^|/)(\.env|Dotenv\.txt|data/|secrets/|private-plugin-exports/)|\.(key|pem|p12|sqlite)$'; then
  echo 'Sensitive path found in staged changes; refusing to push.'; exit 3
fi
if git diff --cached --quiet; then echo 'No changes to submit.'; exit 0; fi
git commit -m "FEZI Studio: 26 plugin GitHub Pages and Node.js source"
git push --set-upstream origin "$BRANCH"
gh pr create --repo "$REPOSITORY" --base main --head "$BRANCH" --title "FEZI Studio: publish 26 plugin pages and verified Node.js release" --body "Adds verified metadata for 26 private ChatGPT plugins, static GitHub Pages, CI, and deployment guide. Does not make private plugins public or start backends."
echo "PR created. Review it, then merge to trigger Pages deployment."
