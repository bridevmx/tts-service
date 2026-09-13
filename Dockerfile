# Production Dockerfile for Coolify and Easypanel 1-Click Git Deployment
FROM node:20-bookworm-slim

# Install Python3, pip, ffmpeg and system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    python3 \
    python3-pip \
    python3-venv \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Create python virtual environment for Piper TTS
RUN python3 -m venv /opt/venv
ENV PATH="/opt/venv/bin:$PATH"

# Install Piper TTS engine and Flask server dependencies
RUN pip install --no-cache-dir piper-tts flask

# Copy Piper engine server code
COPY piper-server/ /app/piper-server/

# Copy Node.js dependency definitions and install production packages
COPY package*.json ./
RUN npm ci --only=production

# Copy application source code and scripts
COPY . .

# Set executable permission for startup entrypoint
RUN chmod +x /app/start.sh

# Environment variables
ENV PORT=3000
ENV NODE_ENV=production
ENV PIPER_URL=http://127.0.0.1:5000/v1/audio/speech
ENV PIPER_CACHE_DIR=/data

# Create data volume for persisting downloaded Piper voice models
VOLUME ["/data"]

EXPOSE 3000

CMD ["/app/start.sh"]
