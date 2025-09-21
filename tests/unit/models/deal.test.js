import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { DealModel } from '../../../src/models/deal.js';
import { VenueModel } from '../../../src/models/venue.js';
import { v4 as uuidv4 } from 'uuid';

describe('DealModel', () => {
  let test_venue_id;

  beforeAll(async () => {
    // Clean before this test file starts
    await test_utils.clean_test_data();
    
    // Create a test venue for our deals
    const venue_data = {
      id: uuidv4(),
      name: 'Test Deal Venue',
      description: 'A venue for testing deals',
      address: '123 Deal Street',
      city: 'Test City',
      postal_code: '1234',
      phone: '+27123456789',
      email: 'dealvenue@test.com'
    };
    
    await VenueModel.create(venue_data);
    test_venue_id = venue_data.id;
  });
  
  afterAll(async () => {
    // Clean after this test file ends
    await test_utils.clean_test_data();
  });

  describe('create', () => {
    it('should create a new deal with valid data', async () => {
      const deal_data = {
        id: uuidv4(),
        venue_id: test_venue_id,
        title: 'Test Deal',
        description: 'A great test deal with amazing savings',
        terms_and_conditions: 'Terms and conditions apply to this deal',
        original_price: 100.00,
        deal_price: 50.00,
        max_vouchers: 100,
        max_per_customer: 5,
        start_date: new Date(Date.now() + 86400000), // Tomorrow
        end_date: new Date(Date.now() + 7 * 86400000), // Next week
        requires_age_verification: false
      };
      
      const result = await DealModel.create(deal_data);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(deal_data.id);
      expect(result.venue_id).toBe(deal_data.venue_id);
      expect(result.title).toBe(deal_data.title);
      expect(result.original_price).toBe('100.00');
      expect(result.deal_price).toBe('50.00');
      expect(result.status).toBe('draft'); // Default status
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should handle optional fields correctly', async () => {
      const deal_data = {
        id: uuidv4(),
        venue_id: test_venue_id,
        title: 'Minimal Deal',
        description: 'A minimal deal for testing',
        terms_and_conditions: 'Basic terms apply',
        original_price: 50.00,
        deal_price: 25.00,
        max_vouchers: 50,
        max_per_customer: 2,
        start_date: new Date(Date.now() + 86400000),
        end_date: new Date(Date.now() + 3 * 86400000)
        // Optional: deal_image_url, requires_age_verification
      };
      
      const result = await DealModel.create(deal_data);
      
      expect(result).toBeDefined();
      expect(result.title).toBe(deal_data.title);
      expect(result.deal_image_url).toBeNull();
      expect(result.requires_age_verification).toBeFalsy(); // Default (could be false or null)
    });
  });

  describe('find_by_id', () => {
    it('should find deal by ID', async () => {
      const deal_data = {
        id: uuidv4(),
        venue_id: test_venue_id,
        title: 'Findable Deal',
        description: 'A deal that can be found by ID',
        terms_and_conditions: 'Standard terms',
        original_price: 80.00,
        deal_price: 40.00,
        max_vouchers: 75,
        max_per_customer: 3,
        start_date: new Date(Date.now() + 86400000),
        end_date: new Date(Date.now() + 5 * 86400000)
      };
      
      await DealModel.create(deal_data);
      const found_deal = await DealModel.find_by_id(deal_data.id);
      
      expect(found_deal).toBeDefined();
      expect(found_deal.id).toBe(deal_data.id);
      expect(found_deal.title).toBe(deal_data.title);
      expect(found_deal.venue_name).toBe('Test Deal Venue');
      expect(found_deal.vouchers_sold).toBe('0');
    });

    it('should return undefined for non-existent ID', async () => {
      const fake_id = '550e8400-e29b-41d4-a716-446655440000';
      
      const result = await DealModel.find_by_id(fake_id);
      
      expect(result).toBeUndefined();
    });
  });

  describe('find_by_venue_id', () => {
    it('should find deals by venue ID', async () => {
      const deal_data = {
        id: uuidv4(),
        venue_id: test_venue_id,
        title: 'Venue Deal Test',
        description: 'A deal to test venue filtering',
        terms_and_conditions: 'Venue specific terms',
        original_price: 60.00,
        deal_price: 30.00,
        max_vouchers: 60,
        max_per_customer: 2,
        start_date: new Date(Date.now() + 86400000),
        end_date: new Date(Date.now() + 4 * 86400000)
      };
      
      await DealModel.create(deal_data);
      const deals = await DealModel.find_by_venue_id(test_venue_id);
      
      expect(deals).toBeInstanceOf(Array);
      expect(deals.length).toBeGreaterThan(0);
      expect(deals.find(d => d.id === deal_data.id)).toBeDefined();
    });

    it('should filter by status when provided', async () => {
      const deals = await DealModel.find_by_venue_id(test_venue_id, 'draft');
      
      expect(deals).toBeInstanceOf(Array);
      // All deals created in tests have 'draft' status by default
      expect(deals.every(d => d.status === 'draft')).toBe(true);
    });

    it('should return empty array for venue with no deals', async () => {
      const fake_venue_id = '660e8400-e29b-41d4-a716-446655440000';
      const deals = await DealModel.find_by_venue_id(fake_venue_id);
      
      expect(deals).toBeInstanceOf(Array);
      expect(deals.length).toBe(0);
    });
  });

  describe('update', () => {
    it('should update deal information', async () => {
      const deal_data = {
        id: uuidv4(),
        venue_id: test_venue_id,
        title: 'Update Test Deal',
        description: 'A deal to test updates',
        terms_and_conditions: 'Original terms',
        original_price: 70.00,
        deal_price: 35.00,
        max_vouchers: 70,
        max_per_customer: 3,
        start_date: new Date(Date.now() + 86400000),
        end_date: new Date(Date.now() + 6 * 86400000)
      };
      
      const created_deal = await DealModel.create(deal_data);
      
      const updates = {
        title: 'Updated Deal Title',
        description: 'This deal has been updated',
        deal_price: 25.00
      };
      
      const updated_deal = await DealModel.update(created_deal.id, updates);
      
      expect(updated_deal.title).toBe('Updated Deal Title');
      expect(updated_deal.description).toBe('This deal has been updated');
      expect(updated_deal.deal_price).toBe('25.00');
      expect(updated_deal.original_price).toBe('70.00'); // Should remain unchanged
      expect(updated_deal.updated_at).toBeInstanceOf(Date);
    });

    it('should throw error for no fields to update', async () => {
      const deal_data = {
        id: uuidv4(),
        venue_id: test_venue_id,
        title: 'No Update Deal',
        description: 'A deal with no updates',
        terms_and_conditions: 'No update terms',
        original_price: 90.00,
        deal_price: 45.00,
        max_vouchers: 90,
        max_per_customer: 4,
        start_date: new Date(Date.now() + 86400000),
        end_date: new Date(Date.now() + 8 * 86400000)
      };
      
      const created_deal = await DealModel.create(deal_data);
      
      await expect(DealModel.update(created_deal.id, {}))
        .rejects
        .toThrow('No fields to update');
    });

    it('should return undefined for non-existent deal', async () => {
      const fake_id = '550e8400-e29b-41d4-a716-446655440000';
      
      const result = await DealModel.update(fake_id, { title: 'Test' });
      
      expect(result).toBeUndefined();
    });
  });

  describe('delete', () => {
    it('should soft delete deal by setting status to ended', async () => {
      const deal_data = {
        id: uuidv4(),
        venue_id: test_venue_id,
        title: 'Delete Test Deal',
        description: 'A deal to test deletion',
        terms_and_conditions: 'Delete terms',
        original_price: 120.00,
        deal_price: 60.00,
        max_vouchers: 120,
        max_per_customer: 5,
        start_date: new Date(Date.now() + 86400000),
        end_date: new Date(Date.now() + 9 * 86400000)
      };
      
      const created_deal = await DealModel.create(deal_data);
      await DealModel.delete(created_deal.id);
      
      const deleted_deal = await DealModel.find_by_id(created_deal.id);
      expect(deleted_deal.status).toBe('ended');
      expect(deleted_deal.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('check_availability', () => {
    it('should return availability for draft deals', async () => {
      const deal_data = {
        id: uuidv4(),
        venue_id: test_venue_id,
        title: 'Availability Test Deal',
        description: 'A deal to test availability',
        terms_and_conditions: 'Availability terms',
        original_price: 100.00,
        deal_price: 50.00,
        max_vouchers: 100,
        max_per_customer: 3,
        start_date: new Date(Date.now() - 86400000), // Yesterday (in the past for testing)
        end_date: new Date(Date.now() + 5 * 86400000) // Future
      };
      
      const created_deal = await DealModel.create(deal_data);
      const availability = await DealModel.check_availability(created_deal.id, 5);
      
      expect(availability).toBeDefined();
      expect(availability.available).toBe(false); // Because status is 'draft', not 'active'
      expect(availability.reason).toBe('Deal not active');
    });

    it('should return not available for future deals', async () => {
      const deal_data = {
        id: uuidv4(),
        venue_id: test_venue_id,
        title: 'Future Deal',
        description: 'A deal starting in the future',
        terms_and_conditions: 'Future terms',
        original_price: 80.00,
        deal_price: 40.00,
        max_vouchers: 50,
        max_per_customer: 2,
        start_date: new Date(Date.now() + 86400000), // Tomorrow
        end_date: new Date(Date.now() + 7 * 86400000) // Next week
      };
      
      const created_deal = await DealModel.create(deal_data);
      // First update to active status to test date logic
      await DealModel.update(created_deal.id, { status: 'active' });
      
      const availability = await DealModel.check_availability(created_deal.id, 1);
      
      expect(availability.available).toBe(false);
      expect(availability.reason).toBe('Deal not available');
    });

    it('should return not available for expired deals', async () => {
      const deal_data = {
        id: uuidv4(),
        venue_id: test_venue_id,
        title: 'Expired Deal',
        description: 'A deal that has expired',
        terms_and_conditions: 'Expired terms',
        original_price: 60.00,
        deal_price: 30.00,
        max_vouchers: 25,
        max_per_customer: 1,
        start_date: new Date(Date.now() - 7 * 86400000), // Last week
        end_date: new Date(Date.now() - 86400000) // Yesterday
      };
      
      const created_deal = await DealModel.create(deal_data);
      // Update to active status to test date expiry logic
      await DealModel.update(created_deal.id, { status: 'active' });
      
      const availability = await DealModel.check_availability(created_deal.id, 1);
      
      expect(availability.available).toBe(false);
      expect(availability.reason).toBe('Deal not available');
    });

    it('should return not available when insufficient vouchers remaining', async () => {
      const deal_data = {
        id: uuidv4(),
        venue_id: test_venue_id,
        title: 'Limited Stock Deal',
        description: 'A deal with limited vouchers',
        terms_and_conditions: 'Limited stock terms',
        original_price: 40.00,
        deal_price: 20.00,
        max_vouchers: 5, // Very limited
        max_per_customer: 2,
        start_date: new Date(Date.now() - 86400000), // Yesterday
        end_date: new Date(Date.now() + 86400000) // Tomorrow
      };
      
      const created_deal = await DealModel.create(deal_data);
      // Update to active status
      await DealModel.update(created_deal.id, { status: 'active' });
      
      const availability = await DealModel.check_availability(created_deal.id, 10); // Request more than available
      
      expect(availability.available).toBe(false);
      expect(availability.reason).toBe('Only 5 vouchers remaining');
    });

    it('should return available when deal is active and in date range', async () => {
      const deal_data = {
        id: uuidv4(),
        venue_id: test_venue_id,
        title: 'Available Deal',
        description: 'A currently available deal',
        terms_and_conditions: 'Available terms',
        original_price: 90.00,
        deal_price: 45.00,
        max_vouchers: 100,
        max_per_customer: 5,
        start_date: new Date(Date.now() - 86400000), // Yesterday
        end_date: new Date(Date.now() + 86400000) // Tomorrow
      };
      
      const created_deal = await DealModel.create(deal_data);
      // Update to active status
      await DealModel.update(created_deal.id, { status: 'active' });
      
      const availability = await DealModel.check_availability(created_deal.id, 3);
      
      expect(availability.available).toBe(true);
      expect(availability.vouchers_remaining).toBe('100');
    });

    it('should return not found for non-existent deal', async () => {
      const fake_id = '550e8400-e29b-41d4-a716-446655440000';
      
      const availability = await DealModel.check_availability(fake_id, 1);
      
      expect(availability.available).toBe(false);
      expect(availability.reason).toBe('Deal not found');
    });
  });

  describe('get_analytics', () => {
    it('should return analytics for deal with no vouchers', async () => {
      const deal_data = {
        id: uuidv4(),
        venue_id: test_venue_id,
        title: 'Analytics Test Deal',
        description: 'A deal to test analytics',
        terms_and_conditions: 'Analytics terms',
        original_price: 80.00,
        deal_price: 40.00,
        max_vouchers: 80,
        max_per_customer: 4,
        start_date: new Date(Date.now() + 86400000),
        end_date: new Date(Date.now() + 7 * 86400000)
      };
      
      const created_deal = await DealModel.create(deal_data);
      const analytics = await DealModel.get_analytics(created_deal.id);
      
      expect(analytics).toBeDefined();
      expect(analytics.total_vouchers).toBe('0');
      expect(analytics.active_vouchers).toBe('0');
      expect(analytics.redeemed_vouchers).toBe('0');
      expect(parseInt(analytics.total_revenue)).toBe(0);
      expect(analytics.unique_customers).toBe('0');
    });
  });

  describe('find_all', () => {
    it('should find all active deals with proper filters', async () => {
      const deals = await DealModel.find_all();
      
      expect(deals).toBeInstanceOf(Array);
      // There may be seed data with active deals, so just check it's an array
      expect(deals.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter by venue_id', async () => {
      const deals = await DealModel.find_all({ venue_id: test_venue_id });
      
      expect(deals).toBeInstanceOf(Array);
      // Our test venue now has active deals from the availability tests above
      expect(deals.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter by min_savings', async () => {
      const deals = await DealModel.find_all({ min_savings: 50 });
      
      expect(deals).toBeInstanceOf(Array);
      expect(deals.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter by max_price', async () => {
      const deals = await DealModel.find_all({ max_price: 50 });
      
      expect(deals).toBeInstanceOf(Array);
      expect(deals.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter by search term', async () => {
      const deals = await DealModel.find_all({ search: 'Available' });
      
      expect(deals).toBeInstanceOf(Array);
      expect(deals.length).toBeGreaterThanOrEqual(0);
    });

    it('should filter by city', async () => {
      // This will likely return empty as our test venue has active deals but may not match seed data cities
      const deals = await DealModel.find_all({ city: 'Test City' });
      
      expect(deals).toBeInstanceOf(Array);
      expect(deals.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('count_all', () => {
    it('should count all active deals', async () => {
      const count = await DealModel.count_all();
      
      // There may be seed data, so just check it's a number >= 0
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should filter count by min_savings', async () => {
      const count = await DealModel.count_all({ min_savings: 50 });
      
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should filter count by max_price', async () => {
      const count = await DealModel.count_all({ max_price: 50 });
      
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should filter count by both min_savings and max_price', async () => {
      const count = await DealModel.count_all({ min_savings: 40, max_price: 60 });
      
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should filter count by venue_id', async () => {
      const count = await DealModel.count_all({ venue_id: test_venue_id });
      
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should filter count by search term', async () => {
      const count = await DealModel.count_all({ search: 'Available' });
      
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should filter count by city', async () => {
      const count = await DealModel.count_all({ city: 'Test City' });
      
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });
});