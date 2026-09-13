import { config } from '../config.js';

/**
 * Synthesizes a single text sentence into audio buffer using Piper engine.
 *
 * @param {Object} params
 * @param {string} params.text - Sentence text to synthesize.
 * @param {string} [params.voice] - Voice ID.
 * @param {number} [params.speed] - Speech speed multiplier.
 * @param {string} [params.format] - Audio format ('mp3' or 'wav').
 * @returns {Promise<Buffer>} Audio binary buffer.
 */
export async function synthesizeSentence({ text, voice = config.defaultVoice, speed = 1.0, format = 'mp3' }) {
  const payload = {
    input: text,
    model: voice,
    voice: voice,
    speed: parseFloat(speed) || 1.0,
    response_format: format
  };

  const response = await fetch(config.piperUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorBody = await response.text().catch(() => '');
    throw new Error(`Piper synthesis failed with status ${response.status}: ${errorBody}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  return Buffer.from(arrayBuffer);
}
