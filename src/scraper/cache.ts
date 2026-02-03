import NodeCache from 'node-cache';
import { logger } from '../utils/logger.js';

// Cache TTLs in seconds
const CACHE_TTL = {
  LISTAGEM: 15 * 60,      // 15 minutes for listings
  DETALHE: 60 * 60,       // 1 hour for details
  RELATORIO: 24 * 60 * 60 // 24 hours for reports
};

const cache = new NodeCache({
  stdTTL: CACHE_TTL.LISTAGEM,
  checkperiod: 120,
  useClones: false
});

export type CacheType = 'LISTAGEM' | 'DETALHE' | 'RELATORIO';

export function getCached<T>(key: string): T | undefined {
  const value = cache.get<T>(key);
  if (value) {
    logger.debug({ key }, 'Cache hit');
  }
  return value;
}

export function setCache<T>(key: string, value: T, type: CacheType = 'LISTAGEM'): void {
  const ttl = CACHE_TTL[type];
  cache.set(key, value, ttl);
  logger.debug({ key, ttl }, 'Cache set');
}

export function invalidateCache(pattern?: string): void {
  if (pattern) {
    const keys = cache.keys().filter(k => k.includes(pattern));
    keys.forEach(k => cache.del(k));
    logger.debug({ pattern, count: keys.length }, 'Cache invalidated by pattern');
  } else {
    cache.flushAll();
    logger.debug('Cache flushed');
  }
}

export function getCacheStats() {
  return cache.getStats();
}
