import { Router } from 'express';
import { requirePocketbaseAuth } from '../middleware/pb-auth.js';
import { splitTextIntoSentences } from '../services/text-splitter.js';
import { synthesizeSentence } from '../services/piper.service.js';
import { config } from '../config.js';

const router = Router();

/**
 * Ultra-low latency streaming TTS endpoint.
 * Splits text into sentences and streams audio chunks as soon as they are ready.
 */
router.post('/stream', requirePocketbaseAuth, async (req, res) => {
  const { text, voice = config.defaultVoice, speed = 1.0, format = 'mp3' } = req.body || {};

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'El campo "text" es obligatorio.' });
  }

  if (text.length > 10000) {
    return res.status(400).json({ error: 'El campo "text" no debe exceder los 10,000 caracteres.' });
  }

  const requestedFormat = (format || 'mp3').toLowerCase();
  const mimeType = requestedFormat === 'wav' ? 'audio/wav' : 'audio/mpeg';

  res.writeHead(200, {
    'Content-Type': mimeType,
    'Transfer-Encoding': 'chunked',
    'Cache-Control': 'no-cache, no-store, must-revalidate',
    'Connection': 'keep-alive',
    'X-Accel-Buffering': 'no' // Disables proxy buffering in Nginx / Traefik
  });

  const sentences = splitTextIntoSentences(text, 220);

  try {
    for (const sentence of sentences) {
      if (res.writableEnded || req.destroyed) {
        break;
      }

      try {
        const audioBuffer = await synthesizeSentence({
          text: sentence,
          voice,
          speed,
          format: requestedFormat
        });

        if (!res.writableEnded && !req.destroyed) {
          res.write(audioBuffer);
        }
      } catch (err) {
        console.error(`[Streaming Chunk Error] Failed sentence: "${sentence.slice(0, 30)}..." - ${err.message}`);
      }
    }
  } catch (error) {
    console.error('[Streaming Loop Error]:', error.message);
  } finally {
    if (!res.writableEnded) {
      res.end();
    }
  }
});

/**
 * Block synthesis endpoint.
 * Synthesizes full text and returns binary file attachment.
 */
router.post('/synthesize', requirePocketbaseAuth, async (req, res) => {
  const { text, voice = config.defaultVoice, speed = 1.0, format = 'mp3' } = req.body || {};

  if (!text || typeof text !== 'string') {
    return res.status(400).json({ error: 'El campo "text" es obligatorio.' });
  }

  if (text.length > 10000) {
    return res.status(400).json({ error: 'El campo "text" no debe exceder los 10,000 caracteres.' });
  }

  const requestedFormat = (format || 'mp3').toLowerCase();
  const ext = requestedFormat === 'wav' ? 'wav' : 'mp3';
  const mimeType = requestedFormat === 'wav' ? 'audio/wav' : 'audio/mpeg';

  const sentences = splitTextIntoSentences(text, 220);

  try {
    const buffers = [];
    for (const sentence of sentences) {
      const chunkBuffer = await synthesizeSentence({
        text: sentence,
        voice,
        speed,
        format: requestedFormat
      });
      buffers.push(chunkBuffer);
    }

    const fullAudio = Buffer.concat(buffers);

    res.writeHead(200, {
      'Content-Type': mimeType,
      'Content-Length': fullAudio.length,
      'Content-Disposition': `attachment; filename="audio.${ext}"`
    });

    res.end(fullAudio);
  } catch (error) {
    console.error('[Synthesize Error]:', error.message);
    if (!res.headersSent) {
      res.status(502).json({ error: 'Error al sintetizar el audio completo.' });
    }
  }
});

export default router;
