#!/usr/bin/env bash
set -euo pipefail

# Atomic-swap deploy: build into a staging release dir, swap the dist symlink on
# success, keep the last N releases for rollback. nginx serves whatever the dist
# symlink currently points at, so a half-finished or failed build never reaches
# production.

cd "$(dirname "$0")/.."

RELEASES_DIR="releases"
LOGS_DIR="logs"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
STAGING_DIR="$RELEASES_DIR/staging-$TIMESTAMP"
FINAL_DIR="$RELEASES_DIR/$TIMESTAMP"
LOG_FILE="$LOGS_DIR/build-$TIMESTAMP.log"

mkdir -p "$RELEASES_DIR" "$LOGS_DIR"

echo "[deploy $TIMESTAMP] building -> $STAGING_DIR"
if ! node scripts/build-static.mjs --out-dir "$STAGING_DIR" >"$LOG_FILE" 2>&1; then
  echo "[deploy $TIMESTAMP] BUILD FAILED. Log: $LOG_FILE"
  rm -rf "$STAGING_DIR"
  exit 1
fi

mv "$STAGING_DIR" "$FINAL_DIR"

# Atomic swap: if dist is already a symlink, `ln -sfn` replaces it atomically.
# If it's a real directory (first deploy after a non-deploy `npm run build`),
# remove it first. Brief window of nonexistence in that bootstrap case only.
if [ -L dist ] || [ ! -e dist ]; then
  ln -sfn "$FINAL_DIR" dist
else
  rm -rf dist
  ln -sfn "$FINAL_DIR" dist
fi
echo "[deploy $TIMESTAMP] swapped: dist -> $FINAL_DIR"

# Garbage collect: keep the most recent KEEP_RELEASES
KEEP_RELEASES_TAIL=$((KEEP_RELEASES + 1))
ls -1dt "$RELEASES_DIR"/[0-9]*/ 2>/dev/null \
  | tail -n "+$KEEP_RELEASES_TAIL" \
  | xargs -r rm -rf

echo "[deploy $TIMESTAMP] done."
