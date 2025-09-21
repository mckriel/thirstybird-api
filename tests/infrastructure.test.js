import { describe, test, expect } from 'vitest';
import { TestDataFactory } from './helpers/factories.js';

describe('Test Infrastructure', () => {
  
  test('should connect to test database', () => {
    console.log('\n=== DATABASE CONNECTION TEST ===');
    
    const is_connected = test_utils.is_db_connected();
    console.log(`📊 Database connection status: ${is_connected}`);
    console.log(`📊 Database URL: ${process.env.DATABASE_URL}`);
    
    expect(is_connected).toBe(true);
    console.log('✅ Database connection verified');
  });
  
  test('should have test environment variables loaded', () => {
    console.log('\n=== ENVIRONMENT VARIABLES TEST ===');
    
    const node_env = process.env.NODE_ENV;
    const jwt_secret = process.env.JWT_SECRET;
    const jwt_length = jwt_secret?.length || 0;
    
    console.log(`📊 NODE_ENV: ${node_env}`);
    console.log(`📊 JWT_SECRET length: ${jwt_length} characters`);
    console.log(`📊 JWT_SECRET (first 10 chars): ${jwt_secret?.substring(0, 10)}...`);
    console.log(`📊 DATABASE_URL: ${process.env.DATABASE_URL}`);
    
    expect(node_env).toBe('test');
    expect(jwt_secret).toBeDefined();
    expect(jwt_length).toBeGreaterThan(20);
    
    console.log('✅ Environment variables verified');
  });
  
  test('should have custom matchers working', () => {
    console.log('\n=== CUSTOM MATCHERS TEST ===');
    
    const test_uuid = '550e8400-e29b-41d4-a716-446655440001';
    const test_email = 'test@example.com';
    const test_date = '2023-12-01T10:00:00Z';
    const test_price = 99.99;
    
    console.log(`📊 Testing UUID: ${test_uuid}`);
    console.log(`📊 Testing Email: ${test_email}`);
    console.log(`📊 Testing Date: ${test_date}`);
    console.log(`📊 Testing Price: R${test_price}`);
    
    expect(test_uuid).toBeValidUUID();
    expect(test_email).toBeValidEmail();
    expect(test_date).toBeValidDate();
    expect(test_price).toHaveValidPrice();
    
    // Test invalid values too
    console.log('📊 Testing invalid values...');
    expect('not-a-uuid').not.toBeValidUUID();
    expect('not-an-email').not.toBeValidEmail();
    expect('not-a-date').not.toBeValidDate();
    expect(-5).not.toHaveValidPrice();
    
    console.log('✅ Custom matchers verified (valid and invalid cases)');
  });
  
  test('should generate test users with factories', () => {
    console.log('\n=== USER FACTORY TEST ===');
    
    const user = TestDataFactory.generate_user();
    
    console.log(`📊 Generated user ID: ${user.id}`);
    console.log(`📊 Generated email: ${user.email}`);
    console.log(`📊 First name: ${user.first_name}`);
    console.log(`📊 Last name: ${user.last_name}`);
    console.log(`📊 Role: ${user.role}`);
    console.log(`📊 Is active: ${user.is_active}`);
    console.log(`📊 Email verified: ${user.email_verified}`);
    console.log(`📊 Password hash length: ${user.password_hash?.length} chars`);
    
    expect(user.id).toBeValidUUID();
    expect(user.email).toBeValidEmail();
    expect(user.email).toContain('@test.example.com');
    expect(user.first_name).toBe('Test');
    expect(user.role).toBe('customer');
    expect(user.password_hash).toBeDefined();
    
    console.log('✅ User factory verified');
  });
  
  test('should generate admin users correctly', () => {
    console.log('\n=== ADMIN USER FACTORY TEST ===');
    
    const admin = TestDataFactory.generate_admin_user({
      email: 'admin@test.com'
    });
    
    console.log(`📊 Generated admin ID: ${admin.id}`);
    console.log(`📊 Admin email: ${admin.email}`);
    console.log(`📊 First name: ${admin.first_name}`);
    console.log(`📊 Last name: ${admin.last_name}`);
    console.log(`📊 Role: ${admin.role}`);
    
    expect(admin.role).toBe('admin');
    expect(admin.email).toBe('admin@test.com');
    expect(admin.first_name).toBe('Admin');
    
    console.log('✅ Admin user factory verified');
  });
  
  test('should generate venues with realistic data', () => {
    console.log('\n=== VENUE FACTORY TEST ===');
    
    const venue = TestDataFactory.generate_venue();
    
    console.log(`📊 Generated venue ID: ${venue.id}`);
    console.log(`📊 Venue name: ${venue.name}`);
    console.log(`📊 Address: ${venue.address}, ${venue.city}`);
    console.log(`📊 Coordinates: (${venue.latitude}, ${venue.longitude})`);
    console.log(`📊 Category: ${venue.category}`);
    console.log(`📊 Email: ${venue.email}`);
    console.log(`📊 Phone: ${venue.phone}`);
    console.log(`📊 Age verification required: ${venue.requires_age_verification}`);
    
    expect(venue.id).toBeValidUUID();
    expect(venue.name).toMatch(/Test|Mock|Unit|Integration|E2E/);
    expect(venue.email).toBeValidEmail();
    expect(venue.latitude).toBeTypeOf('number');
    expect(venue.longitude).toBeTypeOf('number');
    expect(['restaurant', 'bar', 'club', 'lounge', 'brewery']).toContain(venue.category);
    
    console.log('✅ Venue factory verified');
  });
  
  test('should generate deals with proper pricing', () => {
    console.log('\n=== DEAL FACTORY TEST ===');
    
    const venue_id = '550e8400-e29b-41d4-a716-446655440000';
    const deal = TestDataFactory.generate_deal(venue_id);
    
    console.log(`📊 Generated deal ID: ${deal.id}`);
    console.log(`📊 Venue ID: ${deal.venue_id}`);
    console.log(`📊 Deal title: ${deal.title}`);
    console.log(`📊 Original price: R${deal.original_price}`);
    console.log(`📊 Deal price: R${deal.deal_price}`);
    console.log(`📊 Discount: R${deal.original_price - deal.deal_price} (${Math.round((1 - deal.deal_price/deal.original_price) * 100)}%)`);
    console.log(`📊 Max vouchers: ${deal.max_vouchers}`);
    console.log(`📊 Max per customer: ${deal.max_per_customer}`);
    console.log(`📊 Category: ${deal.category}`);
    console.log(`📊 Age verification required: ${deal.requires_age_verification}`);
    
    expect(deal.venue_id).toBe(venue_id);
    expect(deal.original_price).toHaveValidPrice();
    expect(deal.deal_price).toHaveValidPrice();
    expect(deal.deal_price).toBeLessThan(deal.original_price);
    expect(['drinks', 'food', 'experience', 'combo']).toContain(deal.category);
    
    console.log('✅ Deal factory verified');
  });
  
  test('should access database through test_utils', async () => {
    console.log('\n=== DATABASE QUERY TEST ===');
    
    const query = 'SELECT COUNT(*) as user_count FROM users';
    console.log(`📊 Executing query: ${query}`);
    
    const result = await test_utils.query(query);
    
    console.log(`📊 Query result rows: ${result.rows.length}`);
    console.log(`📊 User count: ${result.rows[0].user_count}`);
    
    expect(result.rows[0]).toBeDefined();
    expect(result.rows[0].user_count).toBeDefined();
    expect(parseInt(result.rows[0].user_count)).toBeGreaterThanOrEqual(0);
    
    console.log('✅ Database query verified');
  });
  
  test('should get table counts', async () => {
    console.log('\n=== TABLE COUNT TEST ===');
    
    const tables = ['users', 'venues', 'deals', 'vouchers'];
    
    for (const table of tables) {
      const count = await test_utils.get_table_count(table);
      console.log(`📊 Table '${table}' contains ${count} rows`);
      
      expect(typeof count).toBe('number');
      expect(count).toBeGreaterThanOrEqual(0);
    }
    
    console.log('✅ Table counts verified');
  });
});