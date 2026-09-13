import test from 'node:test';
import assert from 'node:assert/strict';
import { splitTextIntoSentences } from '../src/services/text-splitter.js';

test('splitTextIntoSentences - splits long paragraphs by punctuation', () => {
  const input = "Hola. Este es un texto de prueba. ¿Funciona bien? Sí, parece que sí! Continuemos con más texto.";
  const sentences = splitTextIntoSentences(input, 20);

  assert.ok(Array.isArray(sentences));
  assert.ok(sentences.length >= 3);
  assert.equal(sentences[0], "Hola.");
  assert.equal(sentences[1], "Este es un texto de prueba.");
});

test('splitTextIntoSentences - handles short text without splitting unnecessarily', () => {
  const input = "Texto corto sin división.";
  const sentences = splitTextIntoSentences(input, 220);

  assert.deepEqual(sentences, ["Texto corto sin división."]);
});

test('splitTextIntoSentences - handles empty or invalid inputs safely', () => {
  assert.deepEqual(splitTextIntoSentences(''), []);
  assert.deepEqual(splitTextIntoSentences(null), []);
  assert.deepEqual(splitTextIntoSentences(undefined), []);
});
