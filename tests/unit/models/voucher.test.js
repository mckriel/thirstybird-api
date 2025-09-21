import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { VoucherModel } from '../../../src/models/voucher.js';
import { UserModel } from '../../../src/models/user.js';
import { VenueModel } from '../../../src/models/venue.js';
import { DealModel } from '../../../src/models/deal.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

describe('VoucherModel', () => {
  let test_user_id;
  let test_venue_id;
  let test_deal_id;

  beforeAll(async () => {
    // Clean before this test file starts
    await test_utils.clean_test_data();
    
    // Create a test user
    const user_data = {
      id: uuidv4(),
      email: 'voucheruser@test.com',
      password_hash: await bcrypt.hash('password123', 12),
      first_name: 'Voucher',
      last_name: 'User'
    };
    await UserModel.create(user_data);
    test_user_id = user_data.id;
    
    // Create a test venue
    const venue_data = {
      id: uuidv4(),
      name: 'Test Voucher Venue',
      description: 'A venue for testing vouchers',
      address: '123 Voucher Street',
      city: 'Voucher City',
      postal_code: '1234',
      phone: '+27123456789',
      email: 'vouchervenue@test.com'
    };
    await VenueModel.create(venue_data);
    test_venue_id = venue_data.id;
    
    // Create a test deal
    const deal_data = {
      id: uuidv4(),
      venue_id: test_venue_id,
      title: 'Test Voucher Deal',
      description: 'A deal for testing vouchers',
      terms_and_conditions: 'Terms for voucher testing',
      original_price: 100.00,
      deal_price: 50.00,
      max_vouchers: 100,
      max_per_customer: 5,
      start_date: new Date(Date.now() + 86400000),
      end_date: new Date(Date.now() + 7 * 86400000)
    };
    await DealModel.create(deal_data);
    test_deal_id = deal_data.id;
  });
  
  afterAll(async () => {
    // Clean after this test file ends
    await test_utils.clean_test_data();
  });

  describe('create', () => {
    it('should create a new voucher with valid data', async () => {
      const voucher_data = {
        id: uuidv4(),
        user_id: test_user_id,
        deal_id: test_deal_id,
        venue_id: test_venue_id,
        voucher_code: 'TEST-VOUCHER-001',
        qr_code_data: 'qr-data-12345',
        purchase_price: 50.00,
        quantity: 1,
        expires_at: new Date(Date.now() + 30 * 86400000) // 30 days from now
      };
      
      const result = await VoucherModel.create(voucher_data);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(voucher_data.id);
      expect(result.user_id).toBe(voucher_data.user_id);
      expect(result.deal_id).toBe(voucher_data.deal_id);
      expect(result.venue_id).toBe(voucher_data.venue_id);
      expect(result.voucher_code).toBe(voucher_data.voucher_code);
      expect(result.purchase_price).toBe('50.00');
      expect(result.quantity).toBe(1);
      expect(result.status).toBe('active'); // Default status
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should handle default quantity and other optional fields', async () => {
      const voucher_data = {
        id: uuidv4(),
        user_id: test_user_id,
        deal_id: test_deal_id,
        venue_id: test_venue_id,
        voucher_code: 'TEST-VOUCHER-002',
        qr_code_data: 'default-qr-data',
        purchase_price: 25.00,
        expires_at: new Date(Date.now() + 15 * 86400000)
        // quantity defaults to 1
      };
      
      const result = await VoucherModel.create(voucher_data);
      
      expect(result).toBeDefined();
      expect(result.voucher_code).toBe(voucher_data.voucher_code);
      expect(result.quantity).toBe(1); // Default
      expect(result.qr_code_data).toBe('default-qr-data');
    });
  });

  describe('find_by_id', () => {
    it('should find voucher by ID', async () => {
      const voucher_data = {
        id: uuidv4(),
        user_id: test_user_id,
        deal_id: test_deal_id,
        venue_id: test_venue_id,
        voucher_code: 'FIND-BY-ID-001',
        qr_code_data: 'find-by-id-qr',
        purchase_price: 40.00,
        expires_at: new Date(Date.now() + 20 * 86400000)
      };
      
      await VoucherModel.create(voucher_data);
      const found_voucher = await VoucherModel.find_by_id(voucher_data.id);
      
      expect(found_voucher).toBeDefined();
      expect(found_voucher.id).toBe(voucher_data.id);
      expect(found_voucher.voucher_code).toBe(voucher_data.voucher_code);
      expect(found_voucher.deal_title).toBe('Test Voucher Deal');
      expect(found_voucher.venue_name).toBe('Test Voucher Venue');
    });

    it('should filter by user_id when provided', async () => {
      const voucher_data = {
        id: uuidv4(),
        user_id: test_user_id,
        deal_id: test_deal_id,
        venue_id: test_venue_id,
        voucher_code: 'FIND-BY-USER-001',
        qr_code_data: 'find-by-user-qr',
        purchase_price: 35.00,
        expires_at: new Date(Date.now() + 25 * 86400000)
      };
      
      await VoucherModel.create(voucher_data);
      const found_voucher = await VoucherModel.find_by_id(voucher_data.id, test_user_id);
      
      expect(found_voucher).toBeDefined();
      expect(found_voucher.id).toBe(voucher_data.id);
    });

    it('should return undefined for non-existent ID', async () => {
      const fake_id = '550e8400-e29b-41d4-a716-446655440000';
      
      const result = await VoucherModel.find_by_id(fake_id);
      
      expect(result).toBeUndefined();
    });
  });

  describe('find_by_code', () => {
    it('should find voucher by voucher code', async () => {
      const voucher_data = {
        id: uuidv4(),
        user_id: test_user_id,
        deal_id: test_deal_id,
        venue_id: test_venue_id,
        voucher_code: 'FIND-BY-CODE-001',
        qr_code_data: 'find-by-code-qr',
        purchase_price: 45.00,
        expires_at: new Date(Date.now() + 30 * 86400000)
      };
      
      await VoucherModel.create(voucher_data);
      const found_voucher = await VoucherModel.find_by_code(voucher_data.voucher_code);
      
      expect(found_voucher).toBeDefined();
      expect(found_voucher.voucher_code).toBe(voucher_data.voucher_code);
      expect(found_voucher.deal_title).toBe('Test Voucher Deal');
      expect(found_voucher.first_name).toBe('Voucher');
      expect(found_voucher.last_name).toBe('User');
      expect(found_voucher.venue_name).toBe('Test Voucher Venue');
    });

    it('should return undefined for non-existent code', async () => {
      const result = await VoucherModel.find_by_code('NON-EXISTENT-CODE');
      
      expect(result).toBeUndefined();
    });
  });

  describe('find_by_user', () => {
    it('should find vouchers by user ID', async () => {
      const voucher_data = {
        id: uuidv4(),
        user_id: test_user_id,
        deal_id: test_deal_id,
        venue_id: test_venue_id,
        voucher_code: 'USER-VOUCHER-001',
        qr_code_data: 'user-voucher-qr',
        purchase_price: 30.00,
        expires_at: new Date(Date.now() + 30 * 86400000)
      };
      
      await VoucherModel.create(voucher_data);
      const vouchers = await VoucherModel.find_by_user(test_user_id);
      
      expect(vouchers).toBeInstanceOf(Array);
      expect(vouchers.length).toBeGreaterThan(0);
      expect(vouchers.find(v => v.id === voucher_data.id)).toBeDefined();
    });

    it('should filter by status when provided', async () => {
      const vouchers = await VoucherModel.find_by_user(test_user_id, { status: 'active' });
      
      expect(vouchers).toBeInstanceOf(Array);
      expect(vouchers.every(v => v.status === 'active')).toBe(true);
    });

    it('should return empty array for user with no vouchers', async () => {
      const fake_user_id = '550e8400-e29b-41d4-a716-446655440000';
      const vouchers = await VoucherModel.find_by_user(fake_user_id);
      
      expect(vouchers).toBeInstanceOf(Array);
      expect(vouchers.length).toBe(0);
    });
  });

  describe('count_by_user', () => {
    it('should count vouchers for user', async () => {
      const count = await VoucherModel.count_by_user(test_user_id);
      
      expect(count).toBeGreaterThan(0);
    });

    it('should filter count by status when provided', async () => {
      const active_count = await VoucherModel.count_by_user(test_user_id, 'active');
      
      expect(active_count).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 for user with no vouchers', async () => {
      const fake_user_id = '550e8400-e29b-41d4-a716-446655440000';
      const count = await VoucherModel.count_by_user(fake_user_id);
      
      expect(count).toBe(0);
    });
  });

  describe('update_status', () => {
    it('should update voucher status', async () => {
      const voucher_data = {
        id: uuidv4(),
        user_id: test_user_id,
        deal_id: test_deal_id,
        venue_id: test_venue_id,
        voucher_code: 'STATUS-UPDATE-001',
        qr_code_data: 'status-update-qr',
        purchase_price: 60.00,
        expires_at: new Date(Date.now() + 30 * 86400000)
      };
      
      const created_voucher = await VoucherModel.create(voucher_data);
      const updated_voucher = await VoucherModel.update_status(created_voucher.id, 'redeemed', test_user_id);
      
      expect(updated_voucher.status).toBe('redeemed');
      expect(updated_voucher.redeemed_at).toBeInstanceOf(Date);
      expect(updated_voucher.redeemed_by).toBe(test_user_id);
      expect(updated_voucher.updated_at).toBeInstanceOf(Date);
    });

    it('should update status without redeemed_by for non-redeemed status', async () => {
      const voucher_data = {
        id: uuidv4(),
        user_id: test_user_id,
        deal_id: test_deal_id,
        venue_id: test_venue_id,
        voucher_code: 'EXPIRE-UPDATE-001',
        qr_code_data: 'expire-update-qr',
        purchase_price: 55.00,
        expires_at: new Date(Date.now() + 30 * 86400000)
      };
      
      const created_voucher = await VoucherModel.create(voucher_data);
      const updated_voucher = await VoucherModel.update_status(created_voucher.id, 'expired');
      
      expect(updated_voucher.status).toBe('expired');
      expect(updated_voucher.updated_at).toBeInstanceOf(Date);
    });

    it('should return undefined for non-existent voucher', async () => {
      const fake_id = '550e8400-e29b-41d4-a716-446655440000';
      
      const result = await VoucherModel.update_status(fake_id, 'redeemed');
      
      expect(result).toBeUndefined();
    });
  });

  describe('get_qr_data', () => {
    it('should get QR data for voucher', async () => {
      const voucher_data = {
        id: uuidv4(),
        user_id: test_user_id,
        deal_id: test_deal_id,
        venue_id: test_venue_id,
        voucher_code: 'QR-DATA-001',
        qr_code_data: 'qr-data-xyz789',
        purchase_price: 65.00,
        expires_at: new Date(Date.now() + 30 * 86400000)
      };
      
      const created_voucher = await VoucherModel.create(voucher_data);
      const qr_data = await VoucherModel.get_qr_data(created_voucher.id);
      
      expect(qr_data).toBeDefined();
      expect(qr_data.qr_code_data).toBe('qr-data-xyz789');
      expect(qr_data.voucher_code).toBe('QR-DATA-001');
      expect(qr_data.status).toBe('active');
    });

    it('should filter by user_id when provided', async () => {
      const voucher_data = {
        id: uuidv4(),
        user_id: test_user_id,
        deal_id: test_deal_id,
        venue_id: test_venue_id,
        voucher_code: 'QR-USER-001',
        qr_code_data: 'qr-user-data-123',
        purchase_price: 70.00,
        expires_at: new Date(Date.now() + 30 * 86400000)
      };
      
      const created_voucher = await VoucherModel.create(voucher_data);
      const qr_data = await VoucherModel.get_qr_data(created_voucher.id, test_user_id);
      
      expect(qr_data).toBeDefined();
      expect(qr_data.voucher_code).toBe('QR-USER-001');
    });

    it('should return undefined for non-existent voucher', async () => {
      const fake_id = '550e8400-e29b-41d4-a716-446655440000';
      
      const result = await VoucherModel.get_qr_data(fake_id);
      
      expect(result).toBeUndefined();
    });
  });

  describe('check_user_purchase_limit', () => {
    it('should return count of user vouchers for deal', async () => {
      const count = await VoucherModel.check_user_purchase_limit(test_user_id, test_deal_id);
      
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 for user with no vouchers for deal', async () => {
      const fake_deal_id = '550e8400-e29b-41d4-a716-446655440000';
      const count = await VoucherModel.check_user_purchase_limit(test_user_id, fake_deal_id);
      
      expect(count).toBe(0);
    });
  });

  describe('get_expiring_vouchers', () => {
    it('should return expiring vouchers within specified days', async () => {
      const expiring_vouchers = await VoucherModel.get_expiring_vouchers(7);
      
      expect(expiring_vouchers).toBeInstanceOf(Array);
      // All vouchers should be expiring within 7 days but not already expired
      expect(expiring_vouchers.every(v => new Date(v.expires_at) > new Date())).toBe(true);
    });

    it('should return empty array when no vouchers are expiring soon', async () => {
      const expiring_vouchers = await VoucherModel.get_expiring_vouchers(0);
      
      expect(expiring_vouchers).toBeInstanceOf(Array);
      expect(expiring_vouchers.length).toBe(0);
    });
  });

  describe('expire_old_vouchers', () => {
    it('should return expired vouchers (currently none)', async () => {
      const expired_vouchers = await VoucherModel.expire_old_vouchers();
      
      expect(expired_vouchers).toBeInstanceOf(Array);
      // In our test setup, all vouchers have future expiry dates
      expect(expired_vouchers.length).toBe(0);
    });
  });

  describe('get_venue_vouchers', () => {
    it('should get vouchers for venue', async () => {
      const venue_vouchers = await VoucherModel.get_venue_vouchers(test_venue_id);
      
      expect(venue_vouchers).toBeInstanceOf(Array);
      expect(venue_vouchers.length).toBeGreaterThan(0);
      expect(venue_vouchers.every(v => v.deal_title === 'Test Voucher Deal')).toBe(true);
    });

    it('should filter by status when provided', async () => {
      const active_vouchers = await VoucherModel.get_venue_vouchers(test_venue_id, { status: 'active' });
      
      expect(active_vouchers).toBeInstanceOf(Array);
      expect(active_vouchers.every(v => v.status === 'active')).toBe(true);
    });

    it('should return empty array for venue with no vouchers', async () => {
      const fake_venue_id = '660e8400-e29b-41d4-a716-446655440000';
      const venue_vouchers = await VoucherModel.get_venue_vouchers(fake_venue_id);
      
      expect(venue_vouchers).toBeInstanceOf(Array);
      expect(venue_vouchers.length).toBe(0);
    });
  });

  describe('get_analytics', () => {
    it('should return global voucher analytics', async () => {
      const analytics = await VoucherModel.get_analytics();
      
      expect(analytics).toBeDefined();
      expect(parseInt(analytics.total_vouchers)).toBeGreaterThan(0);
      expect(parseInt(analytics.active_vouchers)).toBeGreaterThan(0);
      expect(parseInt(analytics.redeemed_vouchers)).toBeGreaterThanOrEqual(0);
      expect(parseInt(analytics.expired_vouchers)).toBeGreaterThanOrEqual(0);
      expect(parseFloat(analytics.total_revenue)).toBeGreaterThan(0);
      expect(parseInt(analytics.unique_customers)).toBeGreaterThan(0);
    });

    it('should return venue-specific analytics', async () => {
      const analytics = await VoucherModel.get_analytics(test_venue_id);
      
      expect(analytics).toBeDefined();
      expect(parseInt(analytics.total_vouchers)).toBeGreaterThan(0);
      expect(parseInt(analytics.unique_customers)).toBeGreaterThan(0);
    });
  });

  describe('create_multiple', () => {
    it('should create multiple vouchers', async () => {
      const vouchers_data = [
        {
          id: uuidv4(),
          user_id: test_user_id,
          deal_id: test_deal_id,
          venue_id: test_venue_id,
          voucher_code: 'MULTI-001',
          qr_code_data: 'multi-qr-001',
          purchase_price: 25.00,
          expires_at: new Date(Date.now() + 30 * 86400000)
        },
        {
          id: uuidv4(),
          user_id: test_user_id,
          deal_id: test_deal_id,
          venue_id: test_venue_id,
          voucher_code: 'MULTI-002',
          qr_code_data: 'multi-qr-002',
          purchase_price: 25.00,
          expires_at: new Date(Date.now() + 30 * 86400000)
        }
      ];
      
      const created_vouchers = await VoucherModel.create_multiple(vouchers_data);
      
      expect(created_vouchers).toBeInstanceOf(Array);
      expect(created_vouchers.length).toBe(2);
      expect(created_vouchers[0].voucher_code).toBe('MULTI-001');
      expect(created_vouchers[1].voucher_code).toBe('MULTI-002');
    });
  });
});