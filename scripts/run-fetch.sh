#!/bin/bash
# Wrapper invoked by launchd — runs the ingestion job and appends to a log file.
# launchd doesn't source your shell profile, so PATH is set explicitly here.

set -euo pipefail

PROJECT_DIR="/Users/rounakchadha/budget tracker"
LOG_FILE="$PROJECT_DIR/scripts/fetch.log"
NODE_BIN_DIR="/usr/local/bin"

export PATH="$NODE_BIN_DIR:$PATH"

cd "$PROJECT_DIR"

{
  echo "--- $(date -u +"%Y-%m-%dT%H:%M:%SZ") ---"
  npx tsx src/scripts/fetch-transactions.ts
  echo ""
} >> "$LOG_FILE" 2>&1
