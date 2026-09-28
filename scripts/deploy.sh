#!/usr/bin/env bash
set -euo pipefail

# Symlink deploy: build into a versioned release dir, atomically repoint the
# `current` symlink at it, then `pm2 reload` so the Node server re-resolves the
# symlink and serves the new release.
#
# Why not rsync into a fixed dist/ anymore: that was for nginx, which reads
# files per request, so per-file atomicity was enough. The Node server loads
# its module graph once at boot, so overwriting files underneath a running
# process yields a half-old/half-new graph. Atomicity is now process-level:
# releases are immutable, and the swap is a symlink rename plus a reload.
#
# Zero downtime comes from pm2 cluster mode - the master holds the socket and
# retires an old worker only once its replacement reports ready.
#
# Rollback:
#   ln -sfn releases/<older> current.tmp && mv -Tf current.tmp current
#   pm2 reload gmjo-web

cd "$(dirname "$0")/.."

RELEASES_DIR="releases"
LOGS_DIR="logs"
CURRENT_LINK="current"
KEEP_RELEASES="${KEEP_RELEASES:-5}"
PM2="${PM2:-pm2}"
APP_NAME="${APP_NAME:-gmjo-web}"
HEALTH_URL="${HEALTH_URL:-http://127.0.0.1:4322/_health}"
HEALTH_RETRIES="${HEALTH_RETRIES:-30}"
PREFLIGHT_PORT="${PREFLIGHT_PORT:-4399}"
TIMESTAMP="$(date +%Y%m%d-%H%M%S)"
STAGING_DIR="$RELEASES_DIR/staging-$TIMESTAMP"
FINAL_DIR="$RELEASES_DIR/$TIMESTAMP"
LOG_FILE="$LOGS_DIR/build-$TIMESTAMP.log"

mkdir -p "$RELEASES_DIR" "$LOGS_DIR"

# Recorded before the swap so a failed release can be reverted.
PREV_RELEASE="$(readlink "$CURRENT_LINK" 2>/dev/null || true)"

# Atomic activation: create the new link under a temp name, then rename over
# the old one. `ln -sfn` alone is not atomic when the target already exists -
# it unlinks first, leaving a window where `current` does not resolve.
activate() {
  ln -sfn "$1" "$CURRENT_LINK.tmp"
  mv -Tf "$CURRENT_LINK.tmp" "$CURRENT_LINK"
}

# Poll /_health until it reports the release we expect. Asserting on the
# release name (not just a 200) is what distinguishes "the new build is live"
# from "the old workers are still happily serving the previous release".
wait_healthy() {
  local expected="$1" body
  for _ in $(seq 1 "$HEALTH_RETRIES"); do
    body="$(curl -fsS --max-time 3 "$HEALTH_URL" 2>/dev/null || true)"
    case "$body" in
      *"\"release\":\"$expected\""*) return 0 ;;
    esac
    sleep 1
  done
  return 1
}

# Boot the new release on a scratch port and make sure it actually serves
# before `current` is repointed at it. Without this, a release that fails to
# boot takes the site down entirely (pm2 reports the reload as successful, then
# both workers land in `errored`) and the site stays down until the health gate
# below times out. Validating first keeps a bad build completely invisible.
preflight() {
  local release="$1" pid ok=1

  BUILD_DIR="$release" PORT="$PREFLIGHT_PORT" HOST=127.0.0.1 \
    node scripts/server.mjs >>"$LOG_FILE" 2>&1 &
  pid=$!

  for _ in $(seq 1 20); do
    if curl -fsS --max-time 2 \
      "http://127.0.0.1:$PREFLIGHT_PORT/_health" >/dev/null 2>&1; then
      ok=0
      break
    fi
    # Stop waiting if the process already died.
    kill -0 "$pid" 2>/dev/null || break
    sleep 1
  done

  # A health response only proves the process booted; fetch a real page too.
  if [ "$ok" -eq 0 ]; then
    curl -fsS --max-time 10 -o /dev/null \
      "http://127.0.0.1:$PREFLIGHT_PORT/en" || ok=1
  fi

  kill "$pid" 2>/dev/null || true
  wait "$pid" 2>/dev/null || true
  return "$ok"
}

# `reload` is a rolling restart; `start` covers the very first deploy, when the
# app is not yet known to the pm2 daemon.
reload_app() {
  if "$PM2" describe "$APP_NAME" >/dev/null 2>&1; then
    "$PM2" reload "$APP_NAME" --update-env
  else
    echo "[deploy $TIMESTAMP] $APP_NAME not running - starting it"
    "$PM2" start ecosystem.config.cjs --only "$APP_NAME"
  fi
}

echo "[deploy $TIMESTAMP] installing dependencies"
# npm ci >"$LOG_FILE" 2>&1 || { echo "[deploy $TIMESTAMP] npm install failed. Log: $LOG_FILE"; exit 1; }

echo "[deploy $TIMESTAMP] building -> $STAGING_DIR"
if ! node scripts/build-static.mjs --out-dir "$STAGING_DIR" >"$LOG_FILE" 2>&1; then
  echo "[deploy $TIMESTAMP] BUILD FAILED. Log: $LOG_FILE"
  rm -rf "$STAGING_DIR"
  exit 1
fi

mv "$STAGING_DIR" "$FINAL_DIR"

echo "[deploy $TIMESTAMP] preflighting $FINAL_DIR on port $PREFLIGHT_PORT"
if ! preflight "$FINAL_DIR"; then
  echo "[deploy $TIMESTAMP] PREFLIGHT FAILED. Log: $LOG_FILE"
  echo "[deploy $TIMESTAMP] live release untouched; bad build kept at $FINAL_DIR"
  exit 1
fi

echo "[deploy $TIMESTAMP] activating $FINAL_DIR"
activate "$FINAL_DIR"

echo "[deploy $TIMESTAMP] reloading $APP_NAME"
reload_app

if ! wait_healthy "$TIMESTAMP"; then
  echo "[deploy $TIMESTAMP] HEALTHCHECK FAILED after $HEALTH_RETRIES attempts"
  if [ -n "$PREV_RELEASE" ] && [ -d "$PREV_RELEASE" ]; then
    echo "[deploy $TIMESTAMP] rolling back to $PREV_RELEASE"
    activate "$PREV_RELEASE"
    reload_app
    if wait_healthy "$(basename "$PREV_RELEASE")"; then
      echo "[deploy $TIMESTAMP] rollback OK - previous release is live"
    else
      echo "[deploy $TIMESTAMP] ROLLBACK ALSO UNHEALTHY - manual intervention needed"
    fi
  else
    echo "[deploy $TIMESTAMP] no previous release to roll back to"
  fi
  echo "[deploy $TIMESTAMP] failed release kept for inspection: $FINAL_DIR"
  exit 1
fi

echo "[deploy $TIMESTAMP] live: $(basename "$FINAL_DIR")"

# Garbage collect: keep the most recent KEEP_RELEASES timestamped dirs, but
# never the live one - deleting the target of `current` out from under the
# running process would break it on its next reload.
LIVE_RELEASE="$(basename "$(readlink "$CURRENT_LINK" 2>/dev/null || echo none)")"
KEEP_RELEASES_TAIL=$((KEEP_RELEASES + 1))
ls -1dt "$RELEASES_DIR"/[0-9]*/ 2>/dev/null \
  | tail -n "+$KEEP_RELEASES_TAIL" \
  | while read -r stale; do
      if [ "$(basename "$stale")" = "$LIVE_RELEASE" ]; then
        continue
      fi
      rm -rf "$stale"
    done

echo "[deploy $TIMESTAMP] done."