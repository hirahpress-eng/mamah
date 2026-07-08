#!/bin/bash
# keepalive.sh — Auto-restart Next.js dev server on OOM/crash
# Designed for K8s environment with limited memory (~4GB)

PROJECT_DIR="/home/z/my-project"
LOG_FILE="$PROJECT_DIR/dev.log"
MAX_RESTARTS=100
RESTART_COUNT=0
RESTART_COOLDOWN=8  # seconds between restarts

cleanup() {
  echo "[$(date)] keepalive.sh shutting down" >> "$LOG_FILE"
  fuser -k 3000/tcp 2>/dev/null
  pkill -9 -f 'next' 2>/dev/null
  exit 0
}
trap cleanup SIGTERM SIGINT

cd "$PROJECT_DIR" || exit 1

while [ $RESTART_COUNT -lt $MAX_RESTARTS ]; do
  # Kill any leftover processes
  fuser -k 3000/tcp 2>/dev/null
  pkill -9 -f 'next' 2>/dev/null
  sleep 2

  # Clear stale Turbopack cache to prevent ChunkLoadError
  rm -rf .next/cache 2>/dev/null

  RESTART_COUNT=$((RESTART_COUNT + 1))
  echo "" >> "$LOG_FILE"
  echo "[$(date)] keepalive.sh: starting server (restart #$RESTART_COUNT)" >> "$LOG_FILE"

  # Start server — use tee for reliable log capture in K8s
  NODE_OPTIONS="--max-old-space-size=768" \
    node ./node_modules/next/dist/bin/next dev -p 3000 2>&1 | tee -a "$LOG_FILE" &
  SERVER_PID=$!

  # Wait for server to die
  wait $SERVER_PID 2>/dev/null
  EXIT_CODE=$?

  echo "[$(date)] keepalive.sh: server exited (code=$EXIT_CODE)" >> "$LOG_FILE"

  # Rate-limit restarts
  sleep $RESTART_COOLDOWN
done

echo "[$(date)] keepalive.sh: max restarts ($MAX_RESTARTS) reached" >> "$LOG_FILE"