import { config } from '../config.js';

/**
 * Synthesizes a single text sentence into audio buffer using internal TTS engine.
 *
 * @param {Object} params
 * @param {string} params.text - Sentence text to synthesize.
 * @param {string} [params.voice] - Voice ID.
 * @param {string} [params.model] - Model engine ('piper', 'kokoro', 'melotts', 'tts-1', 'tts-1-hd').
 * @param {string} [params.version] - Model version ('v1', 'latest').
 * @param {number} [params.speed] - Speech speed multiplier.
 * @param {string} [params.format] - Audio format ('mp3' or 'wav').
 * @returns {Promise<Buffer>} Audio binary buffer.
 */
export async function synthesizeSentence({
  text,
  voice = config.defaultVoice,
  model = 'piper',
  version = 'v1',
  speed = 1.0,
  format = 'mp3'
}) {
  const payload = {
    input: text,
    model: model || 'piper',
    version: version || 'v1',
    voice: voice,
    speed: parseFloat(speed) || 1.0,
    response_format: format
  };

  const startTime = Date.now();
  console.log(`[TTS Service Debug] Sending request to TTS engine (${config.piperUrl}) - Model: ${model}, Version: ${version}, Voice: ${voice}, Format: ${format}, Text length: ${text.length}`);

  try {
    const response = await fetch(config.piperUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(30000) // 30 second timeout for model download / rendering
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      console.error(`[Piper Service Debug] HTTP ${response.status} from Piper engine: ${errorBody}`);
      throw new Error(`Piper synthesis failed with status ${response.status}: ${errorBody}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    const duration = Date.now() - startTime;
    console.log(`[Piper Service Debug] Received ${arrayBuffer.byteLength} bytes from Piper in ${duration} ms`);
    return Buffer.from(arrayBuffer);
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      console.error(`[Piper Service Debug] Timeout (30s) waiting for Piper engine at ${config.piperUrl}`);
      throw new Error(`Tiempo de espera agotado (30s) en el motor Piper (${config.piperUrl})`);
    }

    const causeCode = err.cause?.code || err.cause?.message || err.code || '';
    const detailMsg = causeCode ? ` (${causeCode})` : '';
    console.error(`[Piper Service Debug] Synthesis error calling ${config.piperUrl}: ${err.message}${detailMsg}`, err.cause || '');
    throw new Error(`No se pudo conectar al motor Piper en ${config.piperUrl}${detailMsg}. El servicio Python se está iniciando o falló al arrancar.`);
  }
}
