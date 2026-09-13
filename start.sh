#!/bin/sh

# Ensure PATH includes venv and python unbuffered logs
export PATH="/opt/venv/bin:$PATH"
export PYTHONUNBUFFERED=1

# Resolve Python binary path
if [ -f "/opt/venv/bin/python3" ]; then
  PYTHON_BIN="/opt/venv/bin/python3"
elif command -v python3 >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python3)"
elif command -v python >/dev/null 2>&1; then
  PYTHON_BIN="$(command -v python)"
else
  PYTHON_BIN=""
fi

echo "[Entrypoint] Starting TTS Service Microservice..."
echo "[Entrypoint] Python Runtime Binary: ${PYTHON_BIN:-'NOT FOUND'}"

# Pre-create model directory if volume mounted
mkdir -p "${PIPER_CACHE_DIR:-/data}/voices"

# Start internal Piper engine unless explicitly disabled
if [ -n "$PYTHON_BIN" ] && [ "$DISABLE_INTERNAL_PIPER" != "true" ] && [ "$DISABLE_INTERNAL_PIPER" != "1" ]; then
  echo "[Entrypoint] Starting internal Piper TTS Engine using $PYTHON_BIN on 127.0.0.1:5000..."
  "$PYTHON_BIN" piper-server/server.py &
  PIPER_PID=$!
  echo "[Entrypoint] Piper TTS background process PID: $PIPER_PID"
  
  sleep 2
else
  echo "[Entrypoint Warning] Python binary not found or internal piper launcher disabled."
fi

echo "[Entrypoint] Starting Express API Gateway on port ${PORT:-3000}..."
exec node src/index.js
