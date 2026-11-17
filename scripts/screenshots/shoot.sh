#!/usr/bin/env bash
# Regenerates the README screenshots in docs/images from plugin/page/team-inbox.html.
# The page runs with a mocked window.claude and fictional demo data (see build.cjs); nothing touches claude.ai.
# Needs Node 18+ and Google Chrome or Chromium. Set CHROME to the browser binary if it is not found.
# Usage: npm run screenshots
set -euo pipefail

root="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)"
out="$root/docs/images"
work="$(mktemp -d)"
trap 'rm -rf "$work"' EXIT

chrome="${CHROME:-}"
if [ -z "$chrome" ]; then
  for c in "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" google-chrome chromium chromium-browser; do
    if command -v "$c" >/dev/null 2>&1 || [ -x "$c" ]; then chrome="$c"; break; fi
  done
fi
[ -n "$chrome" ] || { echo "Chrome not found. Set CHROME=/path/to/chrome." >&2; exit 1; }

node "$root/scripts/screenshots/build.cjs" "$root/plugin/page/team-inbox.html" "$work" >/dev/null
mkdir -p "$out"

# name  width,height  page
shots=(
  "hero-light 1280,520 demo.html?still=1&theme=light#for-me"
  "hero-dark  1280,520 demo.html?still=1&theme=dark#for-me"
  "ask        1280,1560 demo.html?still=1&theme=light#ask-UT4E6Z"
  "composer   1280,900 demo.html?compose=1&theme=light#waiting"
  "guide      1280,960 demo.html?still=1&theme=light#guide"
  "team       1280,672 demo.html?still=1&theme=light#team"
  "welcome    1280,980 demo.html?still=1&theme=light&join=1#for-me"
  "phones     1000,880 phones.html"
)
for s in "${shots[@]}"; do
  read -r name size page <<<"$s"
  "$chrome" --headless=new --disable-gpu --user-data-dir="$work/profile" --hide-scrollbars \
    --force-device-scale-factor=2 --virtual-time-budget=6000 --window-size="$size" \
    --screenshot="$out/$name.png" "file://$work/$page" >/dev/null 2>&1
  echo "docs/images/$name.png"
done
