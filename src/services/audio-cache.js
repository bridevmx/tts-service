import crypto from 'crypto';

class AudioCacheService {
  constructor(maxSize = 500) {
    this.maxSize = maxSize;
    this.cache = new Map();
    this.hits = 0;
    this.misses = 0;
  }

  /**
   * Generates a unique SHA-256 hash key for a sentence synthesis request.
   */
  generateKey(text, voice = 'es_MX-ald-medium', speed = 1.0, format = 'mp3') {
    const raw = `${text.trim()}|${voice}|${speed}|${format.toLowerCase()}`;
    return crypto.createHash('sha256').update(raw).digest('hex');
  }

  /**
   * Retrieves audio buffer from cache if present.
   */
  get(text, voice, speed, format) {
    const key = this.generateKey(text, voice, speed, format);
    if (this.cache.has(key)) {
      this.hits++;
      const item = this.cache.get(key);
      // Refresh item position in LRU order
      this.cache.delete(key);
      this.cache.set(key, item);
      return item.buffer;
    }
    this.misses++;
    return null;
  }

  /**
   * Stores audio buffer in cache. Evicts oldest item if maxSize reached.
   */
  set(text, voice, speed, format, buffer) {
    if (!buffer || !Buffer.isBuffer(buffer)) return;
    const key = this.generateKey(text, voice, speed, format);

    if (this.cache.has(key)) {
      this.cache.delete(key);
    } else if (this.cache.size >= this.maxSize) {
      // Evict oldest item (first key inserted)
      const oldestKey = this.cache.keys().next().value;
      this.cache.delete(oldestKey);
    }

    this.cache.set(key, {
      buffer,
      createdAt: Date.now()
    });
  }

  /**
   * Returns cache metrics.
   */
  getStats() {
    const total = this.hits + this.misses;
    const hitRate = total > 0 ? ((this.hits / total) * 100).toFixed(1) + '%' : '0%';
    return {
      size: this.cache.size,
      maxSize: this.maxSize,
      hits: this.hits,
      misses: this.misses,
      hitRate
    };
  }

  /**
   * Clears all cached items.
   */
  clear() {
    this.cache.clear();
    this.hits = 0;
    this.misses = 0;
  }
}

export const audioCache = new AudioCacheService();
