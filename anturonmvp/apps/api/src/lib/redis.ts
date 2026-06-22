import { Redis } from 'ioredis';

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  console.warn('⚠️  REDIS_URL not set — Redis features disabled');
}

export const redis = redisUrl
  ? new Redis(redisUrl, { maxRetriesPerRequest: 3, lazyConnect: true })
  : new Redis({ lazyConnect: true, enableOfflineQueue: false } as any);

if (redisUrl) {
  redis.on('connect', () => console.log('✅ Redis connected'));
  redis.on('error', (err: Error) => console.error('❌ Redis error:', err.message));
}

// Cache helpers
export async function getCache<T>(key: string): Promise<T | null> {
  const value = await redis.get(key);
  if (!value) return null;
  return JSON.parse(value) as T;
}

export async function setCache<T>(
  key: string,
  value: T,
  ttlSeconds = 300
): Promise<void> {
  await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
}

export async function deleteCache(key: string): Promise<void> {
  await redis.del(key);
}

export async function deleteCachePattern(pattern: string): Promise<void> {
  const keys = await redis.keys(pattern);
  if (keys.length > 0) await redis.del(...keys);
}

// Rate limiting helper
export async function checkRateLimit(
  key: string,
  maxRequests: number,
  windowSeconds: number
): Promise<{ allowed: boolean; remaining: number; resetIn: number }> {
  const current = await redis.incr(key);
  if (current === 1) {
    await redis.expire(key, windowSeconds);
  }
  const ttl = await redis.ttl(key);
  return {
    allowed: current <= maxRequests,
    remaining: Math.max(0, maxRequests - current),
    resetIn: ttl,
  };
}
