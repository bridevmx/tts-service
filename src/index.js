import express from 'express';
import cors from 'cors';
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

app.listen(config.port, '0.0.0.0', () => {
  console.log(`[TTS API Gateway] Server running on port ${config.port} (${config.nodeEnv})`);
  console.log(`[TTS API Gateway] PocketBase Auth URL: ${config.pocketbaseUrl}/api/collections/${config.pocketbaseCollection}/auth-refresh`);
  console.log(`[TTS API Gateway] Piper TTS URL: ${config.piperUrl}`);
});
