#!/bin/bash
cd /home/z/my-project

# 1. Check if dev server is running
if ! pgrep -f "next dev" > /dev/null 2>&1; then
    echo "[RECOVER] Dev server dead. Restarting..."
    pkill -f "next dev" 2>/dev/null
    sleep 1
    > dev.log
    nohup bun run dev > dev.log 2>&1 &
    echo "[RECOVER] Restarted with PID $!"
    exit 0
fi

# 2. Check dev.log for compilation crashes (last 30 lines)
if [ -f dev.log ] && [ -s dev.log ]; then
    CRASH=$(tail -30 dev.log 2>/dev/null | grep -ci "unhandled\|segmentation\|heap out of memory\|FATAL" || true)
    if [ "$CRASH" -gt 0 ]; then
        echo "[RECOVER] Crash detected in dev.log. Restarting..."
        pkill -f "next dev" 2>/dev/null
        sleep 2
        > dev.log
        nohup bun run dev > dev.log 2>&1 &
        echo "[RECOVER] Restarted after crash, PID $!"
    fi
    
    # 3. Trim log if too big
    LINES=$(wc -l < dev.log 2>/dev/null || echo 0)
    if [ "$LINES" -gt 500 ]; then
        tail -200 dev.log > dev.log.tmp && mv dev.log.tmp dev.log
        echo "[RECOVER] Trimmed dev.log from $LINES to 200 lines"
    fi
fi
