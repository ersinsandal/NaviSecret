/**
 * NaviSecret Hybrid Redis & In-Memory Geospatial Engine
 * Provides ultra-fast Redis caching & pub/sub with transparent in-memory fallback
 * when Redis container is not running.
 * Author & Owner: Ersin Sandal (SliferSoft)
 */
import { Redis } from 'ioredis';
import { config } from '../config.js';

let isRedisReady = false;

const rawRedis = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    if (times > 3) return null; // stop retrying if offline
    return Math.min(times * 200, 1000);
  },
  lazyConnect: true,
  enableOfflineQueue: false,
});

export const redisSubscriber = new Redis(config.redisUrl, {
  maxRetriesPerRequest: 1,
  retryStrategy(times) {
    if (times > 3) return null;
    return Math.min(times * 200, 1000);
  },
  lazyConnect: true,
  enableOfflineQueue: false,
});

rawRedis.on('connect', () => {
  isRedisReady = true;
  console.log('[Redis] Connected successfully');
});

rawRedis.on('error', (err) => {
  isRedisReady = false;
  // quiet warning for local dev when Redis is not started
});

redisSubscriber.on('error', () => {
  // quiet warning
});

// In-Memory Fallback Store
const memoryGeo = new Map<string, Map<string, [number, number]>>();
const memoryHash = new Map<string, Record<string, string>>();

export const redis: any = new Proxy(rawRedis, {
  get(target, prop: string) {
    // If Redis is ready, use native Redis
    if (isRedisReady && typeof (target as any)[prop] === 'function') {
      return (...args: any[]) => (target as any)[prop](...args).catch((err: any) => {
        isRedisReady = false;
        return fallbackExec(prop, args);
      });
    }

    // In-Memory Fallbacks
    return (...args: any[]) => fallbackExec(prop, args);
  },
});

function fallbackExec(method: string, args: any[]): any {
  switch (method) {
    case 'geoadd': {
      const [key, lon, lat, member] = args;
      if (!memoryGeo.has(key)) memoryGeo.set(key, new Map());
      memoryGeo.get(key)!.set(String(member), [parseFloat(lon), parseFloat(lat)]);
      return Promise.resolve(1);
    }
    case 'geopos': {
      const [key, ...members] = args;
      const keyMap = memoryGeo.get(key);
      const positions = members.map((m) => {
        if (!keyMap || !keyMap.has(String(m))) return null;
        const [lon, lat] = keyMap.get(String(m))!;
        return [lon.toString(), lat.toString()];
      });
      return Promise.resolve(positions);
    }
    case 'hset': {
      const [key, data] = args;
      const current = memoryHash.get(key) || {};
      memoryHash.set(key, { ...current, ...data });
      return Promise.resolve(1);
    }
    case 'hgetall': {
      const [key] = args;
      return Promise.resolve(memoryHash.get(key) || {});
    }
    case 'expire': {
      return Promise.resolve(1);
    }
    case 'zrem': {
      const [key, member] = args;
      const keyMap = memoryGeo.get(key);
      if (keyMap) keyMap.delete(String(member));
      return Promise.resolve(1);
    }
    case 'del': {
      const [key] = args;
      memoryGeo.delete(key);
      memoryHash.delete(key);
      return Promise.resolve(1);
    }
    default:
      return Promise.resolve(null);
  }
}

export async function initRedis(): Promise<void> {
  try {
    await rawRedis.connect();
    await redisSubscriber.connect();
    isRedisReady = true;
    console.log('[Redis] Connected successfully to Redis 7');
  } catch {
    isRedisReady = false;
    console.log('[Redis] Redis offline. Operating in high-speed in-memory geospatial mode.');
  }
}
