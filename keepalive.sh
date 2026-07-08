#!/bin/bash
# keepalive.sh — Auto-restart Next.js dev server on OOM/crash
# Monitors port 3000 instead of PID (handles OOM-killed child processes)

PROJECT_DIR="/home/z/my-project"
LOG_FILE="$PROJECT_DIR/dev.log"
MAX_RESTARTS=200
RESTART_COUNT=0
RESTART_COOLDOWN=6
COMPILE_WAIT=60  # max seconds to wait for first compilation

cleanup() {
  echo "[$(date)] keepalive.sh shutting down" >> "$LOG_FILE"
  fuser -k 3000/tcp 2>/dev/null
  pkill -9 -f 'next-server\|next dev' 2>/dev/null
  exit 0
}
trap cleanup SIGTERM SIGINT

cd "$PROJECT_DIR" || exit 1

while [ $RESTART_COUNT -lt $MAX_RESTARTS ]; do
  # Kill any leftover processes
  fuser -k 3000/tcp 2>/dev/null
  pkill -9 -f 'next-server\|next dev' 2>/dev/null
  sleep 2

  # Clear stale Turbopack cache to prevent ChunkLoadError
  rm -rf .next/cache 2>/dev/null

  RESTART_COUNT=$((RESTART_COUNT + 1))
  echo "" >> "$LOG_FILE"
  echo "[$(date)] keepalive.sh: starting server (restart #$RESTART_COUNT)" >> "$LOG_FILE"

  # Start server — redirect directly to log file
  NODE_OPTIONS="--max-old-space-size=768" \
    node ./node_modules/next/dist/bin/next dev -p 3000 >> "$LOG_FILE" 2>&1 &
  SERVER_PID=$!

  # Monitor port 3000 instead of PID
  ELAPSED=0
  while [ $ELAPSED -lt $COMPILE_WAIT ]; do
    sleep 5
    ELAPSED=$((ELAPSED + 5))
    # Check if port is still listening
    if ! ss -tlnp 2>/dev/null | grep -q ':3000 '; then
      echo "[$(date)] keepalive.sh: port 3000 gone after ${ELAPSED}s (OOM/crash)" >> "$LOG_FILE"
      break
    fi
  done

  # Clean up
  kill $SERVER_PID 2>/dev/null
  wait $SERVER_PID 2>/dev/null

  sleep $RESTART_COOLDOWN
done

echo "[$(date)] keepalive.sh: max restarts ($MAX_RESTARTS) reached" >> "$LOG_FILE"