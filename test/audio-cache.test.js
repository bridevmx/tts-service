import test from 'node:test';
import assert from 'node:assert/strict';
import { audioCache } from '../src/services/audio-cache.js';

test('audioCache - stores and retrieves audio buffer by key', () => {
  audioCache.clear();
  const text = "Hola mundo de prueba";
  const voice = "es_MX-ald-medium";
  const speed = 1.0;
  const format = "mp3";
  const mockBuffer = Buffer.from("audio-mock-bytes");

  assert.equal(audioCache.get(text, voice, speed, format), null);

  audioCache.set(text, voice, speed, format, mockBuffer);

  const cached = audioCache.get(text, voice, speed, format);
  assert.ok(Buffer.isBuffer(cached));
  assert.equal(cached.toString(), "audio-mock-bytes");

  const stats = audioCache.getStats();
  assert.equal(stats.hits, 1);
  assert.equal(stats.misses, 1);
  assert.equal(stats.size, 1);
});

test('audioCache - respects maxSize and evicts oldest items', () => {
  audioCache.clear();
  const smallCache = new (audioCache.constructor)(2);

  const buf = Buffer.from("test");
  smallCache.set("one", "v", 1, "mp3", buf);
  smallCache.set("two", "v", 1, "mp3", buf);
  smallCache.set("three", "v", 1, "mp3", buf);

  assert.equal(smallCache.get("one", "v", 1, "mp3"), null);
  assert.ok(smallCache.get("two", "v", 1, "mp3") !== null);
  assert.ok(smallCache.get("three", "v", 1, "mp3") !== null);
  assert.equal(smallCache.getStats().size, 2);
});
