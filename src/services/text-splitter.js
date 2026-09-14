/**
 * Splits a text fragment that exceeds target limit by space boundaries (words)
 * without cutting words in half.
 *
 * @param {string} str - Input text fragment.
 * @param {number} limit - Maximum character limit.
 * @returns {string[]} Word-aligned text chunks.
 */
function splitByWordBoundaries(str, limit) {
  const chunks = [];
  let remaining = str.trim();

  while (remaining.length > limit) {
    let cutIndex = remaining.lastIndexOf(' ', limit);
    if (cutIndex <= 0) {
      cutIndex = limit; // Fallback for single continuous token exceeding limit
    }
    const head = remaining.slice(0, cutIndex).trim();
    if (head) chunks.push(head);
    remaining = remaining.slice(cutIndex).trim();
  }

  if (remaining) {
    chunks.push(remaining);
  }

  return chunks;
}

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
  if (!cleanText) return [];

  // Match sentences based on punctuation (. ? ! : \n)
  const rawSentences = cleanText.match(/[^.!?:\n]+[.!?:\n]+|[^.!?:\n]+$/g) || [cleanText];
  const units = [];

  for (const sentence of rawSentences) {
    const trimmed = sentence.trim();
    if (!trimmed) continue;

    if (trimmed.length <= maxChars) {
      units.push(trimmed);
    } else {
      // Split by commas/semicolons
      const subPhrases = trimmed.match(/[^,;\n]+[,;\n]+|[^,;\n]+$/g) || [trimmed];
      for (const phrase of subPhrases) {
        const subTrimmed = phrase.trim();
        if (!subTrimmed) continue;

        if (subTrimmed.length <= maxChars) {
          units.push(subTrimmed);
        } else {
          // Fallback: split by space boundaries so words are never cut in half
          const wordUnits = splitByWordBoundaries(subTrimmed, maxChars);
          units.push(...wordUnits);
        }
      }
    }
  }

  // Combine small consecutive units into buffer up to maxChars
  const result = [];
  let buffer = '';

  for (const unit of units) {
    if (!buffer) {
      buffer = unit;
    } else if ((buffer + ' ' + unit).length <= maxChars) {
      buffer += ' ' + unit;
    } else {
      result.push(buffer);
      buffer = unit;
    }
  }

  if (buffer) {
    result.push(buffer);
  }

  return result.length > 0 ? result : [cleanText];
}
