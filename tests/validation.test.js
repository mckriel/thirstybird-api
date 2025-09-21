import { describe, test, expect } from 'vitest';
import { TestDataFactory } from './helpers/factories.js';

describe('Test Validation - Verify Real Functionality', () => {
  
  test('should verify database actually has seeded data', async () => {
    console.log('\n=== DATABASE SEED VERIFICATION ===');
    
    // Check that our test database actually contains the expected seed data
    const users_result = await test_utils.query('SELECT COUNT(*) as count FROM users');
    const venues_result = await test_utils.query('SELECT COUNT(*) as count FROM venues');
    const deals_result = await test_utils.query('SELECT COUNT(*) as count FROM deals');
    const vouchers_result = await test_utils.query('SELECT COUNT(*) as count FROM vouchers');
    
    const user_count = parseInt(users_result.rows[0].count);
    const venue_count = parseInt(venues_result.rows[0].count);
    const deal_count = parseInt(deals_result.rows[0].count);
    const voucher_count = parseInt(vouchers_result.rows[0].count);
    
    console.log(`📊 Users in database: ${user_count}`);
    console.log(`📊 Venues in database: ${venue_count}`);
    console.log(`📊 Deals in database: ${deal_count}`);
    console.log(`📊 Vouchers in database: ${voucher_count}`);
    
    // Get some sample data to verify it looks correct
    const sample_user = await test_utils.query('SELECT email, role FROM users LIMIT 1');
    const sample_venue = await test_utils.query('SELECT name, city FROM venues LIMIT 1');
    
    if (sample_user.rows.length > 0) {
      console.log(`📊 Sample user: ${sample_user.rows[0].email} (${sample_user.rows[0].role})`);
    }
    if (sample_venue.rows.length > 0) {
      console.log(`📊 Sample venue: ${sample_venue.rows[0].name} in ${sample_venue.rows[0].city}`);
    }
    
    // Should have seed data from our safe seed file
    expect(user_count).toBeGreaterThan(0);
    expect(venue_count).toBeGreaterThan(0); 
    expect(deal_count).toBeGreaterThan(0);
    
    console.log('✅ Database seed data verified');
  });
  
  test('should verify factories generate unique data each time', () => {
    const user1 = TestDataFactory.generate_user();
    const user2 = TestDataFactory.generate_user();
    
    console.log(`Generated user emails: ${user1.email} and ${user2.email}`);
    
    // Should have different IDs and emails
    expect(user1.id).not.toBe(user2.id);
    expect(user1.email).not.toBe(user2.email);
    expect(user1.email).toMatch(/@test\.example\.com$/);
    expect(user2.email).toMatch(/@test\.example\.com$/);
  });
  
  test('should verify custom matchers actually validate correctly', () => {
    // Test that matchers fail on invalid data
    expect('not-a-uuid').not.toBeValidUUID();
    expect('not-an-email').not.toBeValidEmail();  
    expect('not-a-date').not.toBeValidDate();
    expect(-5).not.toHaveValidPrice();
    expect('string-price').not.toHaveValidPrice();
    
    // Test that matchers pass on valid data
    expect('550e8400-e29b-41d4-a716-446655440001').toBeValidUUID();
    expect('test@example.com').toBeValidEmail();
    expect('2023-12-01T10:00:00Z').toBeValidDate(); 
    expect(99.99).toHaveValidPrice();
  });
  
  test('should actually insert and query test data from database', async () => {
    // Insert a test user into the database
    const test_user = TestDataFactory.generate_user({
      email: 'validation-test@test.example.com'
    });
    
    await test_utils.query(
      'INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, email_verified) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)',
      [test_user.id, test_user.email, test_user.password_hash, test_user.first_name, test_user.last_name, test_user.role, test_user.is_active, test_user.email_verified]
    );
    
    // Query it back from database
    const result = await test_utils.query('SELECT * FROM users WHERE email = $1', [test_user.email]);
    
    console.log(`Inserted and retrieved user: ${result.rows[0].email}`);
    
    expect(result.rows).toHaveLength(1);
    expect(result.rows[0].email).toBe(test_user.email);
    expect(result.rows[0].id).toBe(test_user.id);
    expect(result.rows[0].first_name).toBe(test_user.first_name);
  });
  
  test('should verify database connection is actually working', async () => {
    const time_result = await test_utils.query('SELECT NOW() as current_time');
    const current_time = time_result.rows[0].current_time;
    
    console.log(`Database current time: ${current_time}`);
    
    expect(current_time).toBeDefined();
    expect(new Date(current_time)).toBeInstanceOf(Date);
    
    // Verify we can run basic SQL operations
    const math_result = await test_utils.query('SELECT 2 + 2 as result');
    expect(parseInt(math_result.rows[0].result)).toBe(4);
  });
  
  test('should verify venue factory generates valid geo coordinates', () => {
    const venue = TestDataFactory.generate_venue();
    
    console.log(`Generated venue: ${venue.name} at (${venue.latitude}, ${venue.longitude})`);
    
    // Should be valid South African coordinates (roughly around Cape Town)
    expect(venue.latitude).toBeTypeOf('number');
    expect(venue.longitude).toBeTypeOf('number');
    expect(venue.latitude).toBeGreaterThan(-35); // South of Cape Town
    expect(venue.latitude).toBeLessThan(-33); // North of Cape Town
    expect(venue.longitude).toBeGreaterThan(18); // West of Cape Town
    expect(venue.longitude).toBeLessThan(19); // East of Cape Town
  });
  
  test('should verify deal factory generates valid pricing logic', () => {
    const venue_id = '550e8400-e29b-41d4-a716-446655440000';
    const deal = TestDataFactory.generate_deal(venue_id);
    
    console.log(`Generated deal: ${deal.title} - Original: R${deal.original_price}, Deal: R${deal.deal_price}`);
    
    expect(deal.venue_id).toBe(venue_id);
    expect(deal.original_price).toBeGreaterThan(0);
    expect(deal.deal_price).toBeGreaterThan(0);
    expect(deal.deal_price).toBeLessThan(deal.original_price); // Deal price should be less than original
    expect(deal.max_vouchers).toBeGreaterThan(0);
    expect(deal.max_per_customer).toBeGreaterThan(0);
  });
  
  test('should verify environment isolation works correctly', () => {
    console.log(`NODE_ENV: ${process.env.NODE_ENV}`);
    console.log(`DATABASE_URL: ${process.env.DATABASE_URL}`);
    
    expect(process.env.NODE_ENV).toBe('test');
    expect(process.env.DATABASE_URL).toContain('thirstybird_test'); // Should be test database
    expect(process.env.JWT_SECRET).toBeDefined();
    expect(process.env.JWT_SECRET.length).toBeGreaterThan(20);
  });
  
});