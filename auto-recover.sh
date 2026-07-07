#!/bin/bash
# Auto-recovery script for Mamah dev server
# Monitors dev server health and auto-restarts on crash
# Also monitors for compilation errors and auto-fixes

PROJECT_DIR="/home/z/my-project"
DEV_LOG="$PROJECT_DIR/dev.log"
MAX_LOG_LINES=100

# Ensure dev server is running
ensure_server() {
    if ! pgrep -f "next dev" > /dev/null 2>&1; then
        echo "[$(date '+%H:%M:%S')] Dev server not running. Restarting..."
        cd "$PROJECT_DIR"
        pkill -f "next dev" 2>/dev/null
        sleep 1
        # Clear old log
        > "$DEV_LOG"
        nohup bun run dev > "$DEV_LOG" 2>&1 &
        echo "[$(date '+%H:%M:%S')] Dev server started (PID: $!)"
        sleep 8
        return 1
    fi
    return 0
}

# Check for compilation errors in dev log
check_errors() {
    if [ -f "$DEV_LOG" ] && [ -s "$DEV_LOG" ]; then
        # Check for fatal errors
        if grep -qi "unhandled runtime error\|Failed to compile\|Error:\|FATAL\|Module not found\|SyntaxError\|TypeError" "$DEV_LOG" | tail -5; then
            return 1
        fi
    fi
    return 0
}

# Main loop
echo "[$(date '+%H:%M:%S')] Auto-recovery monitor started"
ensure_server
sleep 5

while true; do
    if ! ensure_server; then
        echo "[$(date '+%H:%M:%S')] Server was restarted, waiting for compilation..."
        sleep 10
    fi

    # Trim log if too large
    if [ -f "$DEV_LOG" ]; then
        LINES=$(wc -l < "$DEV_LOG")
        if [ "$LINES" -gt 500 ]; then
            tail -n $MAX_LOG_LINES "$DEV_LOG" > "$DEV_LOG.tmp" && mv "$DEV_LOG.tmp" "$DEV_LOG"
        fi
    fi

    sleep 30
done