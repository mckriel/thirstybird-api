import { createClient } from 'redis';
import dotenv from 'dotenv';

dotenv.config();

let redis_client = null;
let is_connected = false;

export const connect_redis = async () => {
  if (process.env.REDIS_ENABLED !== 'true') {
    console.log('ℹ️  Redis disabled in environment');
    return false;
  }

  try {
    redis_client = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379'
    });

    redis_client.on('error', (err) => {
      console.error('❌ Redis error:', err.message);
      is_connected = false;
    });

    redis_client.on('connect', () => {
      console.log('🔗 Connecting to Redis...');
    });

    redis_client.on('ready', () => {
      console.log('✅ Redis connected and ready');
      is_connected = true;
    });

    redis_client.on('end', () => {
      console.log('🔌 Redis connection closed');
      is_connected = false;
    });

    await redis_client.connect();
    await redis_client.ping();
    console.log('🏓 Redis ping successful');
    
    return true;

  } catch (error) {
    console.error('❌ Redis connection failed:', error.message);
    console.log('⚠️  Continuing without Redis - using memory fallback');
    is_connected = false;
    return false;
  }
};

export const redis = {
  is_connected: () => is_connected && redis_client,
  
  get: async (key) => {
    if (!is_connected || !redis_client) {
      return null;
    }
    try {
      return await redis_client.get(key);
    } catch (error) {
      console.error('Redis GET error:', error.message);
      return null;
    }
  },

  set: async (key, value, expire_seconds = null) => {
    if (!is_connected || !redis_client) {
      return false;
    }
    try {
      if (expire_seconds) {
        await redis_client.setEx(key, expire_seconds, value);
      } else {
        await redis_client.set(key, value);
      }
      return true;
    } catch (error) {
      console.error('Redis SET error:', error.message);
      return false;
    }
  },

  del: async (key) => {
    if (!is_connected || !redis_client) {
      return false;
    }
    try {
      await redis_client.del(key);
      return true;
    } catch (error) {
      console.error('Redis DEL error:', error.message);
      return false;
    }
  },

  incr: async (key) => {
    if (!is_connected || !redis_client) {
      return null;
    }
    try {
      return await redis_client.incr(key);
    } catch (error) {
      console.error('Redis INCR error:', error.message);
      return null;
    }
  },

  expire: async (key, seconds) => {
    if (!is_connected || !redis_client) {
      return false;
    }
    try {
      await redis_client.expire(key, seconds);
      return true;
    } catch (error) {
      console.error('Redis EXPIRE error:', error.message);
      return false;
    }
  },

  mget: async (keys) => {
    if (!is_connected || !redis_client || !keys.length) {
      return [];
    }
    try {
      return await redis_client.mGet(keys);
    } catch (error) {
      console.error('Redis MGET error:', error.message);
      return [];
    }
  },

  mset: async (key_value_pairs) => {
    if (!is_connected || !redis_client) {
      return false;
    }
    try {
      await redis_client.mSet(key_value_pairs);
      return true;
    } catch (error) {
      console.error('Redis MSET error:', error.message);
      return false;
    }
  },

  exists: async (key) => {
    if (!is_connected || !redis_client) {
      return false;
    }
    try {
      const result = await redis_client.exists(key);
      return result === 1;
    } catch (error) {
      console.error('Redis EXISTS error:', error.message);
      return false;
    }
  },

  ttl: async (key) => {
    if (!is_connected || !redis_client) {
      return -1;
    }
    try {
      return await redis_client.ttl(key);
    } catch (error) {
      console.error('Redis TTL error:', error.message);
      return -1;
    }
  }
};

export const close_redis = async () => {
  if (redis_client) {
    try {
      await redis_client.quit();
      console.log('✅ Redis connection closed gracefully');
    } catch (error) {
      console.error('❌ Error closing Redis connection:', error.message);
    }
  }
};