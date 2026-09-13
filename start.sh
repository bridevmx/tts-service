#!/bin/sh
set -e

echo "[Entrypoint] Starting TTS Service Microservice..."

# Pre-create model directory if volume mounted
mkdir -p "${PIPER_CACHE_DIR:-/data}/voices"

# Start internal Piper engine if PIPER_URL targets local instance or if PIPER_INTERNAL=1
if echo "${PIPER_URL:-http://127.0.0.1:5000}" | grep -qE "127\.0\.0\.1|localhost"; then
  echo "[Entrypoint] Starting internal Piper TTS Engine on 127.0.0.1:5000..."
  python3 /app/piper-server/server.py &
  PIPER_PID=$!
  echo "[Entrypoint] Piper TTS background process PID: $PIPER_PID"
  
  # Give piper server a moment to bind port
  sleep 1
fi

echo "[Entrypoint] Starting Express API Gateway on port ${PORT:-3000}..."
exec node src/index.js
