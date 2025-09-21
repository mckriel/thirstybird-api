import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Client } from 'pg';
import { run_migrations } from '../../src/utils/migrate.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load test environment
dotenv.config({ path: '.env.test' });

export async function setup() {
  console.log('🧪 Setting up test environment...');
  
  try {
    // Connect to PostgreSQL server (not specific database)
    const client = new Client({
      user: 'thirstybird',
      password: 'dev_password_123',
      host: 'localhost',
      port: 5432,
      database: 'postgres' // Connect to default database first
    });
    
    await client.connect();
    
    // Force disconnect all connections to test database
    await client.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity 
      WHERE datname = 'thirstybird_test' AND pid <> pg_backend_pid()
    `);
    
    // Drop test database if it exists and recreate it
    console.log('🗑️  Dropping existing test database...');
    await client.query('DROP DATABASE IF EXISTS thirstybird_test');
    
    console.log('🏗️  Creating fresh test database...');
    await client.query('CREATE DATABASE thirstybird_test');
    
    await client.end();
    
    // Run migrations on the test database
    console.log('⚡ Running migrations...');
    await run_migrations();
    
    // Only load seed data for non-unit tests (validation tests need seed data)
    const test_files = process.argv.slice(2).join(' ');
    if (test_files.includes('validation') || !test_files.includes('unit')) {
      console.log('🌱 Loading base test fixtures...');
      const safe_seed_path = path.join(__dirname, '../../database/seeds/001_test_data_safe.sql');
      const seed_sql = fs.readFileSync(safe_seed_path, 'utf8');
      
      // Import db connection which is already configured for test environment
      const { db } = await import('../../src/database/connection.js');
      await db.query(seed_sql);
    } else {
      console.log('🧪 Unit tests - skipping seed data loading');
    }
    
    console.log('✅ Test environment setup complete');
    
  } catch (error) {
    console.error('❌ Test setup failed:', error);
    process.exit(1);
  }
}

export async function teardown() {
  console.log('🧹 Cleaning up test environment...');
  
  try {
    const client = new Client({
      user: 'thirstybird',
      password: 'dev_password_123', 
      host: 'localhost',
      port: 5432,
      database: 'postgres'
    });
    
    await client.connect();
    
    // Force disconnect all connections to test database
    await client.query(`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity 
      WHERE datname = 'thirstybird_test' AND pid <> pg_backend_pid()
    `);
    
    // Drop test database
    await client.query('DROP DATABASE IF EXISTS thirstybird_test');
    await client.end();
    
    console.log('✅ Test cleanup complete');
    
  } catch (error) {
    console.warn('⚠️  Test cleanup warning:', error.message);
  }
}