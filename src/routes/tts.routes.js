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

  const sentences = splitTextIntoSentences(text, 220);
  console.log(`[TTS Route Debug] Stream request started. Text length: ${text.length}, Sentences count: ${sentences.length}, Voice: ${voice}`);

  const startTime = Date.now();
  let chunkIndex = 0;
  let headersSent = false;

  try {
    for (const sentence of sentences) {
      if (res.writableEnded || req.destroyed) {
        console.warn(`[TTS Route Debug] Client disconnected early at sentence #${chunkIndex + 1}`);
        break;
      }

      chunkIndex++;
      const chunkStart = Date.now();
      try {
        const audioBuffer = await synthesizeSentence({
          text: sentence,
          voice,
          speed,
          format: requestedFormat
        });

        const chunkDuration = Date.now() - chunkStart;
        console.log(`[TTS Route Debug] Sentence #${chunkIndex}/${sentences.length} synthesized in ${chunkDuration} ms (${audioBuffer.length} bytes)`);

        if (!headersSent && !res.headersSent) {
          res.writeHead(200, {
            'Content-Type': mimeType,
            'Transfer-Encoding': 'chunked',
            'Cache-Control': 'no-cache, no-store, must-revalidate',
            'Connection': 'keep-alive',
            'X-Accel-Buffering': 'no' // Disables proxy buffering in Nginx / Traefik
          });
          headersSent = true;
        }

        if (!res.writableEnded && !req.destroyed) {
          res.write(audioBuffer);
        }
      } catch (err) {
        console.error(`[TTS Route Debug] Chunk #${chunkIndex} failed: "${sentence.slice(0, 30)}..." - Error: ${err.message}`);
        // If sentence #1 fails and no headers were sent, throw to trigger 502 error response
        if (!headersSent) {
          throw err;
        }
      }
    }

    if (!headersSent && !res.headersSent) {
      return res.status(502).json({ error: 'No se pudo generar ningún fragmento de audio.' });
    }
  } catch (error) {
    console.error('[TTS Route Debug] Streaming Loop Error:', error.message);
    if (!headersSent && !res.headersSent) {
      return res.status(502).json({ error: `Falló la síntesis de audio: ${error.message}` });
    }
  } finally {
    const totalDuration = Date.now() - startTime;
    console.log(`[TTS Route Debug] Streaming request finished in ${totalDuration} ms (${chunkIndex} chunks processed, headersSent=${headersSent})`);
    if (headersSent && !res.writableEnded) {
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
  console.log(`[TTS Route Debug] Block synthesize request started. Sentences count: ${sentences.length}`);

  try {
    const buffers = [];
    for (const sentence of sentences) {
      const audioBuffer = await synthesizeSentence({
        text: sentence,
        voice,
        speed,
        format: requestedFormat
      });
      buffers.push(audioBuffer);
    }

    const fullAudio = Buffer.concat(buffers);
    console.log(`[TTS Route Debug] Block synthesize completed. Total bytes: ${fullAudio.length}`);

    res.writeHead(200, {
      'Content-Type': mimeType,
      'Content-Length': fullAudio.length,
      'Content-Disposition': `attachment; filename="audio.${ext}"`
    });

    res.end(fullAudio);
  } catch (error) {
    console.error('[TTS Route Debug] Synthesize Error:', error.message);
    if (!res.headersSent) {
      res.status(502).json({ error: `Error al sintetizar el audio completo: ${error.message}` });
    }
  }
});

export default router;
