import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { db } from '../src/database/connection.js';

describe('Infrastructure Tests', () => {
  beforeAll(async () => {
    // Clean before this test file starts
    await test_utils.clean_test_data();
  });
  
  afterAll(async () => {
    // Clean after this test file ends
    await test_utils.clean_test_data();
  });

  describe('Database Connection', () => {
    it('should connect to PostgreSQL database', async () => {
      const client = await db.getClient();
      expect(client).toBeDefined();
      client.release();
    });

    it('should execute basic query', async () => {
      const result = await db.query('SELECT 1 as test');
      expect(result.rows[0].test).toBe(1);
    });
  });

  describe('Database Tables', () => {
    it('should have users table', async () => {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'users'
        );
      `);
      expect(result.rows[0].exists).toBe(true);
    });

    it('should have venues table', async () => {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'venues'
        );
      `);
      expect(result.rows[0].exists).toBe(true);
    });

    it('should have deals table', async () => {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'deals'
        );
      `);
      expect(result.rows[0].exists).toBe(true);
    });

    it('should have vouchers table', async () => {
      const result = await db.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = 'vouchers'
        );
      `);
      expect(result.rows[0].exists).toBe(true);
    });
  });
});