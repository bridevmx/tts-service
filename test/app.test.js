import test from 'node:test';
import assert from 'node:assert/strict';
import express from 'express';
import healthRoutes from '../src/routes/health.routes.js';
import voicesRoutes from '../src/routes/voices.routes.js';
import ttsRoutes from '../src/routes/tts.routes.js';

function createTestApp() {
  const app = express();
  app.use(express.json());
  app.use(healthRoutes);
  app.use('/v1', voicesRoutes);
  app.use('/v1/tts', ttsRoutes);
  return app;
}

test('GET /health returns healthy status', async () => {
  const app = createTestApp();
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`);
    assert.equal(res.status, 200);
    const data = await res.json();
    assert.equal(data.status, 'healthy');
    assert.equal(data.service, 'tts-api');
    assert.ok(data.timestamp);
  } finally {
    server.close();
  }
});

test('GET /v1/voices without auth token returns 401', async () => {
  const app = createTestApp();
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/v1/voices`);
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.ok(data.error);
  } finally {
    server.close();
  }
});

test('POST /v1/tts/stream without auth token returns 401', async () => {
  const app = createTestApp();
  const server = app.listen(0);
  const port = server.address().port;

  try {
    const res = await fetch(`http://127.0.0.1:${port}/v1/tts/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: 'Prueba de voz' })
    });
    assert.equal(res.status, 401);
    const data = await res.json();
    assert.ok(data.error);
  } finally {
    server.close();
  }
});
