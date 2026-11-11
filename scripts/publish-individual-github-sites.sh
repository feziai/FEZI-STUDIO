#!/usr/bin/env bash
set -euo pipefail
OWNER="${FEZI_GITHUB_OWNER:-feziai}"
SOURCE="$(cd "$(dirname "${BASH_SOURCE[0]}")/../exports/individual-plugin-sites" && pwd)"
COUNT=$(find "$SOURCE" -mindepth 1 -maxdepth 1 -type d | wc -l)
[[ "$COUNT" == "26" ]] || { echo "Expected 26 standalone sites; found $COUNT"; exit 2; }
if [[ "${1:-}" != "--apply" || "${2:-}" != "--ack-create-public-repos" ]]; then
  echo "DRY RUN: Would create 26 separate PUBLIC GitHub repos, one per private plugin profile, under $OWNER."
  echo "Each repo would be named fezi-<plugin-slug> and contain only its static profile website."
  echo "Nothing created. To proceed voluntarily run:"
  echo "  bash scripts/publish-individual-github-sites.sh --apply --ack-create-public-repos"
  echo "You must first install gh and git, and run gh auth login in your own environment."
  exit 0
fi
for cmd in gh git; do command -v "$cmd" >/dev/null || { echo "Missing $cmd"; exit 3; }; done
gh auth status >/dev/null
TMP="$(mktemp -d)";trap 'rm -rf "$TMP"' EXIT
for site in "$SOURCE"/*; do
  [[ -d "$site" ]] || continue
  slug="$(basename "$site")";repo="$OWNER/fezi-$slug"
  if gh repo view "$repo" >/dev/null 2>&1; then echo "SKIP EXISTING: $repo (will not overwrite)";continue;fi
  mkdir -p "$TMP/$slug";cp -a "$site/." "$TMP/$slug/"
  git -C "$TMP/$slug" init -b main >/dev/null
  git -C "$TMP/$slug" add -A
  git -C "$TMP/$slug" -c user.name="FEZI Studio" -c user.email="actions@users.noreply.github.com" commit -m "Publish public plugin profile (backend not included)" >/dev/null
  gh repo create "$repo" --public --source "$TMP/$slug" --remote origin --push
  if gh api -X POST "repos/$repo/pages" -f build_type=workflow >/dev/null 2>&1; then
    echo "CREATED: $repo; Pages workflow is configured. Verify Actions + Settings → Pages."
  else
    echo "CREATED: $repo; enable Pages via Settings → Pages → GitHub Actions manually."
  fi
done
