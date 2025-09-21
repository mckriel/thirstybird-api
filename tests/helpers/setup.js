import dotenv from 'dotenv';
import { beforeEach, afterEach, expect } from 'vitest';
import { db } from '../../src/database/connection.js';
import { run_seeds } from '../../src/utils/migrate.js';

// Load test environment
dotenv.config({ path: '.env.test' });

// Test database state tracking
let db_connected = false;

// Test database connection on startup
try {
  const result = await db.query('SELECT NOW() as current_time');
  if (result.rows[0]) {
    db_connected = true;
    console.log('✅ Test database connected');
  }
} catch (error) {
  console.error('❌ Test database connection failed:', error.message);
  process.exit(1);
}

// Clean and reset database state before each test
beforeEach(async () => {
  if (!db_connected) return;
  
  try {
    // Clean only test-generated data, keep base fixtures
    await db.query('BEGIN');
    
    // Only delete data that might be created by tests (with test email patterns)
    await db.query(`DELETE FROM refresh_tokens WHERE user_id IN (
      SELECT id FROM users WHERE email LIKE '%test%'
    )`);
    await db.query(`DELETE FROM payments WHERE user_id IN (
      SELECT id FROM users WHERE email LIKE '%test%'  
    )`);
    await db.query(`DELETE FROM vouchers WHERE user_id IN (
      SELECT id FROM users WHERE email LIKE '%test%'
    )`);
    await db.query(`DELETE FROM deals WHERE venue_id IN (
      SELECT id FROM venues WHERE email LIKE '%test%'
    )`);
    await db.query(`DELETE FROM venue_profiles WHERE venue_id IN (
      SELECT id FROM venues WHERE email LIKE '%test%'
    )`);
    await db.query(`DELETE FROM venues WHERE email LIKE '%test%'`);
    await db.query(`DELETE FROM users WHERE email LIKE '%test%'`);
    
    await db.query('COMMIT');
    
  } catch (error) {
    await db.query('ROLLBACK');
    console.error('❌ Test setup error:', error);
    throw error;
  }
});

// Cleanup any hanging transactions after each test
afterEach(async () => {
  if (!db_connected) return;
  
  try {
    // Rollback any hanging transactions
    await db.query('ROLLBACK').catch(() => {}); // Ignore errors if no transaction
  } catch (error) {
    console.warn('⚠️  Test cleanup warning:', error.message);
  }
});

// Export utilities for tests
export const test_utils = {
  is_db_connected: () => db_connected,
  
  // Skip test if database not available
  skip_if_no_db: () => {
    if (!db_connected) {
      return test.skip;
    }
    return test;
  },
  
  // Clean specific tables
  clean_tables: async (tables = []) => {
    if (!db_connected) return;
    
    for (const table of tables.reverse()) {
      await db.query(`DELETE FROM ${table}`);
    }
  },
  
  // Get current database state
  get_table_count: async (table) => {
    if (!db_connected) return 0;
    
    const result = await db.query(`SELECT COUNT(*) as count FROM ${table}`);
    return parseInt(result.rows[0].count);
  },
  
  // Execute raw SQL for setup/testing
  query: async (sql, params = []) => {
    if (!db_connected) throw new Error('Database not connected');
    return await db.query(sql, params);
  }
};

// Custom Vitest matchers
expect.extend({
  toBeValidUUID(received) {
    const uuid_regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    const pass = typeof received === 'string' && uuid_regex.test(received);
    
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid UUID`,
      pass
    };
  },
  
  toBeValidEmail(received) {
    const email_regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const pass = typeof received === 'string' && email_regex.test(received);
    
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid email`,
      pass
    };
  },
  
  toBeValidJWT(received) {
    const jwt_regex = /^[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+\.[A-Za-z0-9-_]*$/;
    const pass = typeof received === 'string' && jwt_regex.test(received);
    
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid JWT token`,
      pass
    };
  },
  
  toBeValidDate(received) {
    const date = new Date(received);
    const pass = !isNaN(date.getTime());
    
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid date`,
      pass
    };
  },
  
  toHaveValidPrice(received) {
    const pass = typeof received === 'number' && 
                 received > 0 && 
                 Number.isFinite(received) &&
                 Math.round(received * 100) === (received * 100); // Max 2 decimal places
    
    return {
      message: () => `expected ${received} ${pass ? 'not ' : ''}to be a valid price (positive number with max 2 decimal places)`,
      pass
    };
  }
});

// Make utilities globally available
globalThis.test_utils = test_utils;

console.log('🧪 Test setup initialized');