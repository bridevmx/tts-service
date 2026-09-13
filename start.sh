#!/bin/sh
set -e

# Ensure Python virtual environment binaries and unbuffered output
export PATH="/opt/venv/bin:$PATH"
export PYTHONUNBUFFERED=1

PYTHON_BIN="/opt/venv/bin/python3"
if [ ! -f "$PYTHON_BIN" ]; then
  PYTHON_BIN="python3"
fi

echo "[Entrypoint] Starting TTS Service Microservice..."

# Pre-create model directory if volume mounted
mkdir -p "${PIPER_CACHE_DIR:-/data}/voices"

# Start internal Piper engine unless explicitly disabled
if [ "$DISABLE_INTERNAL_PIPER" != "true" ] && [ "$DISABLE_INTERNAL_PIPER" != "1" ]; then
  echo "[Entrypoint] Starting internal Piper TTS Engine using $PYTHON_BIN on 127.0.0.1:5000..."
  $PYTHON_BIN /app/piper-server/server.py &
  PIPER_PID=$!
  echo "[Entrypoint] Piper TTS background process PID: $PIPER_PID"
  
  # Give piper server a moment to bind port
  sleep 2
fi

echo "[Entrypoint] Starting Express API Gateway on port ${PORT:-3000}..."
exec node src/index.js
