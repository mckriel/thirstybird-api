import { redis } from '../database/redis.js';

const memory_store = new Map();

export const rate_limiter = async (req, res, next) => {
  const key = `rate_limit:${req.ip}`;
  const limit = 100; // requests per window
  const window = 15 * 60; // 15 minutes in seconds

  try {
    let current = 0;
    
    if (redis.is_connected()) {
      current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, window);
      }
    } else {
      const now = Date.now();
      const window_start = now - (window * 1000);
      
      if (!memory_store.has(key)) {
        memory_store.set(key, []);
      }
      
      const requests = memory_store.get(key);
      const valid_requests = requests.filter(time => time > window_start);
      valid_requests.push(now);
      memory_store.set(key, valid_requests);
      
      current = valid_requests.length;
    }

    if (current > limit) {
      return res.status(429).json({
        error: 'Too many requests',
        message: `Rate limit exceeded. Max ${limit} requests per ${window / 60} minutes.`,
        limit,
        window_minutes: window / 60,
        retry_after_seconds: window
      });
    }

    res.set({
      'X-RateLimit-Limit': limit,
      'X-RateLimit-Remaining': Math.max(0, limit - current),
      'X-RateLimit-Reset': new Date(Date.now() + window * 1000).toISOString(),
      'X-RateLimit-Window': `${window / 60} minutes`
    });

    next();
  } catch (error) {
    console.error('Rate limiter error:', error.message);
    next();
  }
};

export const auth_rate_limit = async (req, res, next) => {
  const key = `auth_rate_limit:${req.ip}`;
  const limit = 10; // login attempts per window
  const window = 15 * 60; // 15 minutes

  try {
    let current = 0;
    
    if (redis.is_connected()) {
      current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, window);
      }
    } else {
      const now = Date.now();
      const window_start = now - (window * 1000);
      const auth_key = `auth_${key}`;
      
      if (!memory_store.has(auth_key)) {
        memory_store.set(auth_key, []);
      }
      
      const requests = memory_store.get(auth_key);
      const valid_requests = requests.filter(time => time > window_start);
      valid_requests.push(now);
      memory_store.set(auth_key, valid_requests);
      
      current = valid_requests.length;
    }

    if (current > limit) {
      return res.status(429).json({
        error: 'Too many authentication attempts',
        message: 'Please try again in 15 minutes',
        limit,
        retry_after_seconds: window
      });
    }

    next();
  } catch (error) {
    console.error('Auth rate limiter error:', error.message);
    next();
  }
};

export const payment_rate_limit = async (req, res, next) => {
  const key = `payment_rate_limit:${req.ip}`;
  const limit = 5; // payment attempts per window
  const window = 10 * 60; // 10 minutes

  try {
    let current = 0;
    
    if (redis.is_connected()) {
      current = await redis.incr(key);
      if (current === 1) {
        await redis.expire(key, window);
      }
    } else {
      const now = Date.now();
      const window_start = now - (window * 1000);
      const payment_key = `payment_${key}`;
      
      if (!memory_store.has(payment_key)) {
        memory_store.set(payment_key, []);
      }
      
      const requests = memory_store.get(payment_key);
      const valid_requests = requests.filter(time => time > window_start);
      valid_requests.push(now);
      memory_store.set(payment_key, valid_requests);
      
      current = valid_requests.length;
    }

    if (current > limit) {
      return res.status(429).json({
        error: 'Too many payment attempts',
        message: 'Payment rate limit exceeded. Please try again later.',
        limit,
        retry_after_seconds: window
      });
    }

    next();
  } catch (error) {
    console.error('Payment rate limiter error:', error.message);
    next();
  }
};