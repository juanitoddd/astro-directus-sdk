#!/usr/bin/env bash
set -euo pipefail

cd "$(dirname "$0")/.."

pm2 restart 0

echo "[restart $TIMESTAMP] done."