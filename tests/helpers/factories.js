import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

// Base factories for generating test data
export class TestDataFactory {
  
  // User factory
  static generate_user(overrides = {}) {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 6);
    
    return {
      id: uuidv4(),
      email: `test-user-${timestamp}-${random}@test.example.com`,
      password: 'Test123!@#',
      password_hash: bcrypt.hashSync('Test123!@#', 12),
      first_name: 'Test',
      last_name: 'User',
      role: 'customer',
      is_active: true,
      email_verified: true,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };
  }
  
  // Admin user factory
  static generate_admin_user(overrides = {}) {
    return this.generate_user({
      role: 'admin',
      first_name: 'Admin',
      last_name: 'User',
      ...overrides
    });
  }
  
  // Venue user factory
  static generate_venue_user(overrides = {}) {
    return this.generate_user({
      role: 'venue',
      first_name: 'Venue',
      last_name: 'Manager',
      ...overrides
    });
  }
  
  // Venue factory
  static generate_venue(overrides = {}) {
    const timestamp = Date.now();
    const venue_names = [
      'The Testing Tavern',
      'Mock Restaurant & Bar',
      'Unit Test Brewery',
      'Integration Bistro',
      'E2E Eatery'
    ];
    
    const cities = ['Cape Town', 'Johannesburg', 'Durban', 'Pretoria', 'Port Elizabeth'];
    const categories = ['restaurant', 'bar', 'club', 'lounge', 'brewery'];
    
    return {
      id: uuidv4(),
      name: venue_names[Math.floor(Math.random() * venue_names.length)] + ` ${timestamp}`,
      description: `A test venue for automated testing purposes - ${timestamp}`,
      address: `${Math.floor(Math.random() * 999) + 1} Test Street`,
      city: cities[Math.floor(Math.random() * cities.length)],
      province: 'Western Cape',
      postal_code: (Math.floor(Math.random() * 9000) + 1000).toString(),
      country: 'South Africa',
      latitude: -33.9249 + (Math.random() - 0.5) * 0.1, // Around Cape Town
      longitude: 18.4241 + (Math.random() - 0.5) * 0.1,
      phone: `+2721${Math.floor(Math.random() * 9000000) + 1000000}`,
      email: `venue-${timestamp}@test.example.com`,
      website: `https://test-venue-${timestamp}.example.com`,
      category: categories[Math.floor(Math.random() * categories.length)],
      requires_age_verification: Math.random() > 0.5,
      is_active: true,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };
  }
  
  // Deal factory
  static generate_deal(venue_id, overrides = {}) {
    const timestamp = Date.now();
    const deal_titles = [
      '2-for-1 Test Special',
      'Happy Hour Testing Deal',
      'Weekend Mock Offer',
      'Unit Test Combo',
      'Integration Special'
    ];
    
    const categories = ['drinks', 'food', 'experience', 'combo'];
    const original_price = Math.floor(Math.random() * 300) + 50; // R50-R350
    const discount = Math.floor(Math.random() * 50) + 20; // 20-70% discount
    const discounted_price = Math.round(original_price * (100 - discount) / 100);
    
    return {
      id: uuidv4(),
      venue_id,
      title: deal_titles[Math.floor(Math.random() * deal_titles.length)] + ` ${timestamp}`,
      description: `A test deal for automated testing - ${timestamp}`,
      terms_and_conditions: `Test terms and conditions for deal ${timestamp}. Valid for testing purposes only.`,
      original_price: original_price,
      deal_price: discounted_price,
      discount_percentage: discount,
      max_vouchers: Math.floor(Math.random() * 400) + 100, // 100-500 vouchers
      max_per_customer: Math.floor(Math.random() * 5) + 1, // 1-5 per customer
      category: categories[Math.floor(Math.random() * categories.length)],
      start_date: new Date(),
      end_date: new Date(Date.now() + (Math.floor(Math.random() * 60) + 30) * 24 * 60 * 60 * 1000), // 30-90 days
      status: 'active',
      requires_age_verification: Math.random() > 0.7,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };
  }
  
  // Voucher factory
  static generate_voucher(user_id, deal_id, venue_id, overrides = {}) {
    const timestamp = Date.now();
    const voucher_code = `TB-TEST-${timestamp.toString().slice(-6).padStart(6, '0')}`;
    
    return {
      id: uuidv4(),
      user_id,
      deal_id,
      venue_id,
      voucher_code,
      qr_code_data: JSON.stringify({
        voucher_id: overrides.id || uuidv4(),
        deal_id,
        venue_id,
        code: voucher_code
      }),
      status: 'active',
      quantity: 1,
      purchase_price: Math.floor(Math.random() * 200) + 50,
      purchased_at: new Date(),
      expires_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };
  }
  
  // Payment factory
  static generate_payment(user_id, deal_id, venue_id, voucher_ids = [], overrides = {}) {
    const timestamp = Date.now();
    const amount = Math.floor(Math.random() * 500) + 50;
    const statuses = ['pending', 'completed', 'failed', 'cancelled', 'refunded'];
    
    return {
      id: uuidv4(),
      user_id,
      deal_id,
      venue_id,
      payment_method: 'payfast',
      amount,
      currency: 'ZAR',
      status: overrides.status || 'completed',
      external_payment_id: `pf_test_${timestamp}`,
      voucher_ids: JSON.stringify(voucher_ids),
      metadata: JSON.stringify({
        test: true,
        timestamp
      }),
      processed_at: new Date(),
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };
  }
  
  // Venue profile factory (links user to venue)
  static generate_venue_profile(user_id, venue_id, overrides = {}) {
    const permission_sets = [
      ['view_analytics'],
      ['manage_deals', 'view_analytics'],
      ['manage_deals', 'view_analytics', 'redeem_vouchers'],
      ['manage_deals', 'view_analytics', 'redeem_vouchers', 'manage_venue']
    ];
    
    return {
      id: uuidv4(),
      user_id,
      venue_id,
      permissions: JSON.stringify(permission_sets[Math.floor(Math.random() * permission_sets.length)]),
      is_primary_contact: false,
      created_at: new Date(),
      updated_at: new Date(),
      ...overrides
    };
  }
  
  // Create a complete test scenario (user + venue + deal + voucher)
  static async create_complete_scenario(db_query_fn) {
    const user = this.generate_user();
    const venue_user = this.generate_venue_user();
    const venue = this.generate_venue();
    const deal = this.generate_deal(venue.id);
    const voucher = this.generate_voucher(user.id, deal.id, venue.id);
    const payment = this.generate_payment(user.id, deal.id, venue.id, [voucher.id]);
    const venue_profile = this.generate_venue_profile(venue_user.id, venue.id, {
      is_primary_contact: true,
      permissions: JSON.stringify(['manage_deals', 'view_analytics', 'redeem_vouchers', 'manage_venue'])
    });
    
    // Insert into database if query function provided
    if (db_query_fn) {
      await db_query_fn('INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, email_verified, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [user.id, user.email, user.password_hash, user.first_name, user.last_name, user.role, user.is_active, user.email_verified, user.created_at, user.updated_at]);
      
      await db_query_fn('INSERT INTO users (id, email, password_hash, first_name, last_name, role, is_active, email_verified, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)',
        [venue_user.id, venue_user.email, venue_user.password_hash, venue_user.first_name, venue_user.last_name, venue_user.role, venue_user.is_active, venue_user.email_verified, venue_user.created_at, venue_user.updated_at]);
      
      await db_query_fn('INSERT INTO venues (id, name, description, address, city, province, postal_code, country, latitude, longitude, phone, email, website, category, requires_age_verification, is_active, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18)',
        [venue.id, venue.name, venue.description, venue.address, venue.city, venue.province, venue.postal_code, venue.country, venue.latitude, venue.longitude, venue.phone, venue.email, venue.website, venue.category, venue.requires_age_verification, venue.is_active, venue.created_at, venue.updated_at]);
      
      await db_query_fn('INSERT INTO venue_profiles (id, user_id, venue_id, permissions, is_primary_contact, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7)',
        [venue_profile.id, venue_profile.user_id, venue_profile.venue_id, venue_profile.permissions, venue_profile.is_primary_contact, venue_profile.created_at, venue_profile.updated_at]);
      
      await db_query_fn('INSERT INTO deals (id, venue_id, title, description, terms_and_conditions, original_price, deal_price, max_vouchers, max_per_customer, category, start_date, end_date, status, requires_age_verification, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)',
        [deal.id, deal.venue_id, deal.title, deal.description, deal.terms_and_conditions, deal.original_price, deal.deal_price, deal.max_vouchers, deal.max_per_customer, deal.category, deal.start_date, deal.end_date, deal.status, deal.requires_age_verification, deal.created_at, deal.updated_at]);
      
      await db_query_fn('INSERT INTO vouchers (id, user_id, deal_id, venue_id, voucher_code, qr_code_data, status, quantity, purchase_price, purchased_at, expires_at, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)',
        [voucher.id, voucher.user_id, voucher.deal_id, voucher.venue_id, voucher.voucher_code, voucher.qr_code_data, voucher.status, voucher.quantity, voucher.purchase_price, voucher.purchased_at, voucher.expires_at, voucher.created_at, voucher.updated_at]);
      
      await db_query_fn('INSERT INTO payments (id, user_id, deal_id, venue_id, payment_method, amount, currency, status, external_payment_id, voucher_ids, metadata, processed_at, created_at, updated_at) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)',
        [payment.id, payment.user_id, payment.deal_id, payment.venue_id, payment.payment_method, payment.amount, payment.currency, payment.status, payment.external_payment_id, payment.voucher_ids, payment.metadata, payment.processed_at, payment.created_at, payment.updated_at]);
    }
    
    return {
      user,
      venue_user,
      venue,
      venue_profile,
      deal,
      voucher,
      payment
    };
  }
}