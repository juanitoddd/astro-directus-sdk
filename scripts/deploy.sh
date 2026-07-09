#!/usr/bin/env bash
set -euo pipefail

# Rsync deploy: build into a versioned release dir, then rsync the new release
# into a fixed `dist/` directory. dist is always a real directory (never a
# symlink), so docker bind mounts on it stay valid across deploys.
#
# rsync --delete-after writes new/changed files first and only removes stale
# files after the sync finishes, so the served tree is never half-empty —
# per-file atomic. A request mid-rsync sees either the old file or the new
# file (or for a brief moment, both — duplicates aren't a problem in HTML).
#
# Previous releases are retained for rollback. Rollback:
#   rsync -a --delete-after releases/<older>/client/ dist/

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

# If dist was a symlink from a previous Option-A deploy, remove it so we can
# replace it with a real directory. After this one-time conversion, dist stays
# a directory and the docker bind mount on ./web/dist keeps the same inode.
if [ -L dist ]; then
  rm dist
fi
mkdir -p dist

rsync -a --delete-after "$FINAL_DIR/client/" dist/
echo "[deploy $TIMESTAMP] synced: dist/ <- $FINAL_DIR/client/"

# Garbage collect: keep the most recent KEEP_RELEASES timestamped dirs.
KEEP_RELEASES_TAIL=$((KEEP_RELEASES + 1))
ls -1dt "$RELEASES_DIR"/[0-9]*/ 2>/dev/null \
  | tail -n "+$KEEP_RELEASES_TAIL" \
  | xargs -r rm -rf

echo "[deploy $TIMESTAMP] done."