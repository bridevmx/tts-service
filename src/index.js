import express from 'express';
import cors from 'cors';
import { spawn } from 'child_process';
import fs from 'fs';
import http from 'http';
import { config } from './config.js';
import healthRoutes from './routes/health.routes.js';
import voicesRoutes from './routes/voices.routes.js';
import ttsRoutes from './routes/tts.routes.js';

const app = express();

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
app.use(healthRoutes);
app.use('/v1', voicesRoutes);
app.use('/v1/tts', ttsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// Global error handler
app.use((err, req, res, _next) => {
  console.error('[Unhandled Error]:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

/**
 * Ensures internal Piper Python server is running on port 5000.
 * Automatically spawns python process if not already running,
 * regardless of whether container was started via start.sh, npm start, or node src/index.js.
 */
function ensurePiperServerRunning() {
  if (process.env.DISABLE_INTERNAL_PIPER === 'true' || process.env.DISABLE_INTERNAL_PIPER === '1') {
    console.log('[TTS API Gateway] Internal Piper launcher disabled by DISABLE_INTERNAL_PIPER flag.');
    return;
  }

  // Only attempt to start internal Piper server if target URL points to 127.0.0.1 or localhost
  if (!config.piperUrl.includes('127.0.0.1') && !config.piperUrl.includes('localhost')) {
    console.log(`[TTS API Gateway] External Piper URL configured (${config.piperUrl}), skipping internal launcher.`);
    return;
  }

  const checkReq = http.get('http://127.0.0.1:5000/health', (res) => {
    if (res.statusCode === 200) {
      console.log('[TTS API Gateway] Piper TTS engine is already running and healthy on 127.0.0.1:5000.');
    }
  });

  checkReq.on('error', () => {
    console.log('[TTS API Gateway] Starting internal Piper TTS Python server on 127.0.0.1:5000...');
    
    const candidates = [
      '/opt/venv/bin/python3',
      '/usr/bin/python3',
      '/usr/local/bin/python3',
      'python3',
      'python'
    ];
    let pythonBin = 'python3';
    for (const cand of candidates) {
      if (cand.startsWith('/') && fs.existsSync(cand)) {
        pythonBin = cand;
        break;
      }
    }

    const pyProcess = spawn(pythonBin, ['piper-server/server.py'], {
      env: {
        ...process.env,
        PYTHONUNBUFFERED: '1',
        PATH: `/opt/venv/bin:${process.env.PATH || ''}`
      },
      stdio: 'inherit'
    });

    pyProcess.on('error', (err) => {
      console.error('[TTS API Gateway Error] Failed to spawn Piper python process:', err.message);
    });

    pyProcess.on('exit', (code, signal) => {
      if (code !== 0 && signal !== 'SIGTERM') {
        console.warn(`[TTS API Gateway Warning] Piper Python process exited with code ${code} signal ${signal}`);
      }
    });
  });
}

app.listen(config.port, '0.0.0.0', () => {
  console.log(`[TTS API Gateway] Server running on port ${config.port} (${config.nodeEnv})`);
  console.log(`[TTS API Gateway] PocketBase Auth URL: ${config.pocketbaseUrl}/api/collections/${config.pocketbaseCollection}/auth-refresh`);
  console.log(`[TTS API Gateway] Piper TTS URL: ${config.piperUrl}`);
  
  ensurePiperServerRunning();
});
