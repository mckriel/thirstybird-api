import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { PaymentModel } from '../../../src/models/payment.js';
import { UserModel } from '../../../src/models/user.js';
import { VenueModel } from '../../../src/models/venue.js';
import { DealModel } from '../../../src/models/deal.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

describe('PaymentModel', () => {
  let test_user_id;
  let test_venue_id;
  let test_deal_id;

  beforeAll(async () => {
    // Clean before this test file starts
    await test_utils.clean_test_data();
    
    // Create a test user for our payments
    const user_data = {
      id: uuidv4(),
      email: `paymentuser-${uuidv4()}@test.com`,
      password_hash: await bcrypt.hash('password123', 12),
      first_name: 'Payment',
      last_name: 'User'
    };
    await UserModel.create(user_data);
    test_user_id = user_data.id;

    // Create a test venue for our payments
    const venue_data = {
      id: uuidv4(),
      name: 'Test Payment Venue',
      description: 'A venue for testing payments',
      address: '123 Payment Street',
      city: 'Payment City',
      postal_code: '1234',
      phone: '+27123456789',
      email: 'paymentvenue@test.com'
    };
    await VenueModel.create(venue_data);
    test_venue_id = venue_data.id;

    // Create a test deal for our payments
    const deal_data = {
      id: uuidv4(),
      venue_id: test_venue_id,
      title: 'Test Payment Deal',
      description: 'A deal for testing payments',
      terms_and_conditions: 'Payment terms apply',
      original_price: 100.00,
      deal_price: 50.00,
      max_vouchers: 100,
      max_per_customer: 5,
      start_date: new Date(Date.now() - 86400000), // Yesterday
      end_date: new Date(Date.now() + 86400000) // Tomorrow
    };
    const created_deal = await DealModel.create(deal_data);
    await DealModel.update(created_deal.id, { status: 'active' });
    test_deal_id = deal_data.id;
  });
  
  afterAll(async () => {
    // Clean after this test file ends
    await test_utils.clean_test_data();
  });

  describe('create', () => {
    it('should create a new payment with valid data', async () => {
      const payment_data = {
        id: uuidv4(),
        user_id: test_user_id,
        deal_id: test_deal_id,
        venue_id: test_venue_id,
        payment_method: 'payfast',
        amount: 50.00,
        currency: 'ZAR',
        external_payment_id: 'pf_test_12345',
        payment_data: { gateway: 'payfast', transaction_id: '12345' },
        voucher_ids: [uuidv4(), uuidv4()]
      };
      
      const result = await PaymentModel.create(payment_data);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(payment_data.id);
      expect(result.user_id).toBe(payment_data.user_id);
      expect(result.deal_id).toBe(payment_data.deal_id);
      expect(result.venue_id).toBe(payment_data.venue_id);
      expect(result.amount).toBe('50.00');
      expect(result.status).toBe('pending');
      expect(result.processed_at).toBeInstanceOf(Date);
    });

    it('should create payment with default values', async () => {
      const payment_data = {
        id: uuidv4(),
        user_id: test_user_id,
        deal_id: test_deal_id,
        venue_id: test_venue_id,
        amount: 25.00,
        external_payment_id: 'pf_test_67890',
        voucher_ids: [uuidv4()]
        // payment_method defaults to 'payfast', currency defaults to 'ZAR'
      };
      
      const result = await PaymentModel.create(payment_data);
      
      expect(result).toBeDefined();
      expect(result.payment_method).toBe('payfast');
      expect(result.currency).toBe('ZAR');
      expect(result.status).toBe('pending');
    });
  });

  describe('find_by_id', () => {
    it('should find payment by ID with user data', async () => {
      const payment_data = {
        id: uuidv4(),
        user_id: test_user_id,
        deal_id: test_deal_id,
        venue_id: test_venue_id,
        amount: 75.00,
        external_payment_id: 'pf_test_find_id',
        voucher_ids: [uuidv4()]
      };
      
      await PaymentModel.create(payment_data);
      const found_payment = await PaymentModel.find_by_id(payment_data.id);
      
      expect(found_payment).toBeDefined();
      expect(found_payment.id).toBe(payment_data.id);
      expect(found_payment.deal_title).toBe('Test Payment Deal');
      expect(found_payment.venue_name).toBe('Test Payment Venue');
      expect(found_payment.user_email).toContain('@test.com');
      expect(found_payment.first_name).toBe('Payment');
    });

    it('should find payment by ID with user restriction', async () => {
      const payment_data = {
        id: uuidv4(),
        user_id: test_user_id,
        deal_id: test_deal_id,
        venue_id: test_venue_id,
        amount: 30.00,
        external_payment_id: 'pf_test_user_restrict',
        voucher_ids: [uuidv4()]
      };
      
      await PaymentModel.create(payment_data);
      const found_payment = await PaymentModel.find_by_id(payment_data.id, test_user_id);
      
      expect(found_payment).toBeDefined();
      expect(found_payment.id).toBe(payment_data.id);
    });

    it('should return undefined for non-existent payment', async () => {
      const fake_id = '550e8400-e29b-41d4-a716-446655440000';
      
      const result = await PaymentModel.find_by_id(fake_id);
      
      expect(result).toBeUndefined();
    });
  });

  describe('find_by_external_id', () => {
    it('should find payment by external payment ID', async () => {
      const payment_data = {
        id: uuidv4(),
        user_id: test_user_id,
        deal_id: test_deal_id,
        venue_id: test_venue_id,
        amount: 40.00,
        external_payment_id: 'pf_test_external_unique',
        voucher_ids: [uuidv4()]
      };
      
      await PaymentModel.create(payment_data);
      const found_payment = await PaymentModel.find_by_external_id('pf_test_external_unique');
      
      expect(found_payment).toBeDefined();
      expect(found_payment.id).toBe(payment_data.id);
      expect(found_payment.external_payment_id).toBe('pf_test_external_unique');
      expect(found_payment.deal_title).toBe('Test Payment Deal');
    });

    it('should return undefined for non-existent external ID', async () => {
      const result = await PaymentModel.find_by_external_id('non_existent_external_id');
      
      expect(result).toBeUndefined();
    });
  });

  describe('find_by_user', () => {
    it('should find payments by user ID', async () => {
      const payments = await PaymentModel.find_by_user(test_user_id);
      
      expect(payments).toBeInstanceOf(Array);
      expect(payments.length).toBeGreaterThan(0);
      // All payments should belong to test user
      expect(payments.every(p => p.deal_title && p.venue_name)).toBe(true);
    });

    it('should filter payments by status', async () => {
      const payments = await PaymentModel.find_by_user(test_user_id, { status: 'pending' });
      
      expect(payments).toBeInstanceOf(Array);
      // All returned payments should have pending status
      expect(payments.every(p => p.status === 'pending')).toBe(true);
    });

    it('should handle pagination', async () => {
      const payments = await PaymentModel.find_by_user(test_user_id, { page: 1, limit: 2 });
      
      expect(payments).toBeInstanceOf(Array);
      expect(payments.length).toBeLessThanOrEqual(2);
    });

    it('should return empty array for user with no payments', async () => {
      const fake_user_id = '550e8400-e29b-41d4-a716-446655440000';
      const payments = await PaymentModel.find_by_user(fake_user_id);
      
      expect(payments).toBeInstanceOf(Array);
      expect(payments.length).toBe(0);
    });
  });

  describe('count_by_user', () => {
    it('should count payments by user ID', async () => {
      const count = await PaymentModel.count_by_user(test_user_id);
      
      expect(count).toBeGreaterThan(0);
    });

    it('should filter count by status', async () => {
      const count = await PaymentModel.count_by_user(test_user_id, 'pending');
      
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should return 0 for user with no payments', async () => {
      const fake_user_id = '550e8400-e29b-41d4-a716-446655440000';
      const count = await PaymentModel.count_by_user(fake_user_id);
      
      expect(count).toBe(0);
    });
  });

  describe('update_status', () => {
    it('should update payment status to completed', async () => {
      const payment_data = {
        id: uuidv4(),
        user_id: test_user_id,
        deal_id: test_deal_id,
        venue_id: test_venue_id,
        amount: 60.00,
        external_payment_id: 'pf_test_update_status',
        voucher_ids: [uuidv4()]
      };
      
      const created_payment = await PaymentModel.create(payment_data);
      const updated_payment = await PaymentModel.update_status(created_payment.id, 'completed');
      
      expect(updated_payment.status).toBe('completed');
      expect(updated_payment.processed_at).toBeInstanceOf(Date);
      expect(updated_payment.updated_at).toBeInstanceOf(Date);
    });

    it('should update payment status to failed', async () => {
      const payment_data = {
        id: uuidv4(),
        user_id: test_user_id,
        deal_id: test_deal_id,
        venue_id: test_venue_id,
        amount: 35.00,
        external_payment_id: 'pf_test_failed',
        voucher_ids: [uuidv4()]
      };
      
      const created_payment = await PaymentModel.create(payment_data);
      const updated_payment = await PaymentModel.update_status(created_payment.id, 'failed');
      
      expect(updated_payment.status).toBe('failed');
      expect(updated_payment.updated_at).toBeInstanceOf(Date);
    });

    it('should update status with payment data', async () => {
      const payment_data = {
        id: uuidv4(),
        user_id: test_user_id,
        deal_id: test_deal_id,
        venue_id: test_venue_id,
        amount: 45.00,
        external_payment_id: 'pf_test_with_data',
        voucher_ids: [uuidv4()]
      };
      
      const created_payment = await PaymentModel.create(payment_data);
      const extra_data = { gateway_response: 'success', transaction_ref: 'abc123' };
      const updated_payment = await PaymentModel.update_status(created_payment.id, 'completed', extra_data);
      
      expect(updated_payment.status).toBe('completed');
      expect(updated_payment.payment_data).toEqual(extra_data);
    });

    it('should return undefined for non-existent payment', async () => {
      const fake_id = '550e8400-e29b-41d4-a716-446655440000';
      
      const result = await PaymentModel.update_status(fake_id, 'completed');
      
      expect(result).toBeUndefined();
    });
  });

  describe('get_venue_payments', () => {
    it('should get payments for venue', async () => {
      const payments = await PaymentModel.get_venue_payments(test_venue_id);
      
      expect(payments).toBeInstanceOf(Array);
      expect(payments.length).toBeGreaterThan(0);
      expect(payments.every(p => p.deal_title && p.first_name && p.voucher_count)).toBe(true);
    });

    it('should filter venue payments by status', async () => {
      const payments = await PaymentModel.get_venue_payments(test_venue_id, { status: 'pending' });
      
      expect(payments).toBeInstanceOf(Array);
    });

    it('should handle pagination for venue payments', async () => {
      const payments = await PaymentModel.get_venue_payments(test_venue_id, { page: 1, limit: 3 });
      
      expect(payments).toBeInstanceOf(Array);
      expect(payments.length).toBeLessThanOrEqual(3);
    });

    it('should return empty array for venue with no payments', async () => {
      const fake_venue_id = '550e8400-e29b-41d4-a716-446655440000';
      const payments = await PaymentModel.get_venue_payments(fake_venue_id);
      
      expect(payments).toBeInstanceOf(Array);
      expect(payments.length).toBe(0);
    });
  });

  describe('get_failed_payments', () => {
    it('should get failed payments from last 24 hours', async () => {
      const failed_payments = await PaymentModel.get_failed_payments();
      
      expect(failed_payments).toBeInstanceOf(Array);
      expect(failed_payments.length).toBeGreaterThanOrEqual(0);
    });

    it('should get failed payments with custom time range', async () => {
      const failed_payments = await PaymentModel.get_failed_payments(48);
      
      expect(failed_payments).toBeInstanceOf(Array);
      expect(failed_payments.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('get_pending_payments', () => {
    it('should get pending payments older than 2 hours', async () => {
      const pending_payments = await PaymentModel.get_pending_payments();
      
      expect(pending_payments).toBeInstanceOf(Array);
      expect(pending_payments.length).toBeGreaterThanOrEqual(0);
    });

    it('should get pending payments with custom time range', async () => {
      const pending_payments = await PaymentModel.get_pending_payments(1);
      
      expect(pending_payments).toBeInstanceOf(Array);
      expect(pending_payments.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('get_analytics', () => {
    it('should get overall payment analytics', async () => {
      const analytics = await PaymentModel.get_analytics();
      
      expect(analytics).toBeDefined();
      expect(analytics.total_payments).toBeDefined();
      expect(analytics.completed_payments).toBeDefined();
      expect(analytics.pending_payments).toBeDefined();
      expect(analytics.failed_payments).toBeDefined();
      expect(analytics.total_revenue).toBeDefined();
      expect(analytics.average_payment).toBeDefined();
      expect(analytics.unique_customers).toBeDefined();
    });

    it('should get venue-specific payment analytics', async () => {
      const analytics = await PaymentModel.get_analytics(test_venue_id);
      
      expect(analytics).toBeDefined();
      expect(analytics.total_payments).toBeDefined();
      expect(parseInt(analytics.total_payments)).toBeGreaterThanOrEqual(0);
    });

    it('should get analytics for custom period', async () => {
      const analytics = await PaymentModel.get_analytics(null, 7);
      
      expect(analytics).toBeDefined();
      expect(analytics.total_payments).toBeDefined();
    });
  });

  describe('get_daily_revenue', () => {
    it('should get daily revenue for last 30 days', async () => {
      const daily_revenue = await PaymentModel.get_daily_revenue();
      
      expect(daily_revenue).toBeInstanceOf(Array);
      expect(daily_revenue.length).toBeGreaterThanOrEqual(0);
    });

    it('should get venue-specific daily revenue', async () => {
      const daily_revenue = await PaymentModel.get_daily_revenue(test_venue_id);
      
      expect(daily_revenue).toBeInstanceOf(Array);
    });

    it('should get daily revenue for custom period', async () => {
      const daily_revenue = await PaymentModel.get_daily_revenue(null, 7);
      
      expect(daily_revenue).toBeInstanceOf(Array);
    });
  });

  describe('refund', () => {
    it('should refund a completed payment', async () => {
      // Create and complete a payment first
      const payment_data = {
        id: uuidv4(),
        user_id: test_user_id,
        deal_id: test_deal_id,
        venue_id: test_venue_id,
        amount: 80.00,
        external_payment_id: 'pf_test_refund',
        voucher_ids: [uuidv4(), uuidv4()]
      };
      
      const created_payment = await PaymentModel.create(payment_data);
      await PaymentModel.update_status(created_payment.id, 'completed');
      
      const refunded_payment = await PaymentModel.refund(created_payment.id, 'Customer requested refund');
      
      expect(refunded_payment.status).toBe('refunded');
      expect(refunded_payment.payment_data).toBeDefined();
      expect(refunded_payment.payment_data.refund_reason).toBe('Customer requested refund');
    });

    it('should handle refund without reason', async () => {
      // Create and complete a payment first
      const payment_data = {
        id: uuidv4(),
        user_id: test_user_id,
        deal_id: test_deal_id,
        venue_id: test_venue_id,
        amount: 55.00,
        external_payment_id: 'pf_test_refund_no_reason',
        voucher_ids: [uuidv4()]
      };
      
      const created_payment = await PaymentModel.create(payment_data);
      await PaymentModel.update_status(created_payment.id, 'completed');
      
      const refunded_payment = await PaymentModel.refund(created_payment.id);
      
      expect(refunded_payment.status).toBe('refunded');
    });

    it('should throw error for non-completed payment refund', async () => {
      const payment_data = {
        id: uuidv4(),
        user_id: test_user_id,
        deal_id: test_deal_id,
        venue_id: test_venue_id,
        amount: 25.00,
        external_payment_id: 'pf_test_refund_pending',
        voucher_ids: [uuidv4()]
      };
      
      const created_payment = await PaymentModel.create(payment_data);
      // Don't complete the payment - leave it as pending
      
      await expect(PaymentModel.refund(created_payment.id))
        .rejects
        .toThrow('Payment not found or not eligible for refund');
    });

    it('should throw error for non-existent payment refund', async () => {
      const fake_id = '550e8400-e29b-41d4-a716-446655440000';
      
      await expect(PaymentModel.refund(fake_id))
        .rejects
        .toThrow('Payment not found or not eligible for refund');
    });
  });
});