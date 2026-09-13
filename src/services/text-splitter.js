/**
 * Smart sentence splitter for TTS streaming.
 * Splits text into phonetic sentences/phrases without breaking words.
 *
 * @param {string} text - Raw input text to split.
 * @param {number} maxChars - Maximum recommended target length per sentence chunk.
 * @returns {string[]} Array of sentence chunks.
 */
export function splitTextIntoSentences(text, maxChars = 220) {
  if (!text || typeof text !== 'string') return [];

  // Normalize line breaks and spaces
  const cleanText = text.replace(/\r\n/g, '\n').trim();

  // Match sentences based on punctuation (. ? ! : \n)
  const rawSentences = cleanText.match(/[^.!?:\n]+[.!?:\n]+|[^.!?:\n]+$/g) || [cleanText];
  const result = [];
  let buffer = '';

  for (const sentence of rawSentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    // If single sentence fragment is longer than maxChars, break it down further by commas/semicolons
    if (trimmed.length > maxChars) {
      if (buffer) {
        result.push(buffer);
        buffer = '';
      }
      const subPhrases = trimmed.match(/[^,;\n]+[,;\n]+|[^,;\n]+$/g) || [trimmed];
      for (const phrase of subPhrases) {
        const subTrimmed = phrase.trim();
        if (!subTrimmed) continue;

        if ((buffer + ' ' + subTrimmed).trim().length <= maxChars) {
          buffer = (buffer + ' ' + subTrimmed).trim();
        } else {
          if (buffer) result.push(buffer);
          buffer = subTrimmed;
        }
      }
    } else {
      if ((buffer + ' ' + trimmed).trim().length <= maxChars) {
        buffer = (buffer + ' ' + trimmed).trim();
      } else {
        if (buffer) result.push(buffer);
        buffer = trimmed;
      }
    }
  }

  if (buffer) {
    result.push(buffer);
  }

  return result.length > 0 ? result : [cleanText];
}
