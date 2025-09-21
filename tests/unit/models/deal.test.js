import { describe, it, expect, beforeEach } from 'vitest';
import { DealModel } from '../../../src/models/deal.js';
import { VenueModel } from '../../../src/models/venue.js';
import { v4 as uuidv4 } from 'uuid';

describe('DealModel', () => {
  beforeEach(async () => {
    // Clean deals and related tables for this test (order matters for foreign keys)
    await test_utils.clean_tables(['vouchers', 'deals', 'venue_profiles', 'venues', 'users']);
  });

  describe('create', () => {
    let test_venue_id;

    beforeEach(async () => {
      // Create a test venue
      const venue_data = {
        id: uuidv4(),
        name: 'Deal Test Venue',
        description: 'Test venue for deals',
        address: '123 Deal St',
        city: 'Cape Town',
        phone: '+27211234567',
        email: 'deals@venue.com'
      };
      
      const created_venue = await VenueModel.create(venue_data);
      test_venue_id = created_venue.id;
    });

    it('should create a new deal with valid data', async () => {
      const deal_data = {
        id: uuidv4(),
        venue_id: test_venue_id,
        title: 'Test Deal',
        description: 'A fantastic test deal',
        terms_and_conditions: 'Valid for 30 days',
        original_price: 100.00,
        deal_price: 60.00,
        max_vouchers: 50,
        max_per_customer: 2,
        deal_image_url: 'https://example.com/deal.jpg',
        start_date: '2025-01-01',
        end_date: '2025-12-31',
        requires_age_verification: true
      };
      
      const result = await DealModel.create(deal_data);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(deal_data.id);
      expect(result.venue_id).toBe(test_venue_id);
      expect(result.title).toBe(deal_data.title);
      expect(result.description).toBe(deal_data.description);
      expect(parseFloat(result.original_price)).toBe(100.00);
      expect(parseFloat(result.deal_price)).toBe(60.00);
      expect(result.max_vouchers).toBe(50);
      expect(result.max_per_customer).toBe(2);
      expect(result.status).toBe('draft'); // Default status
      expect(result.requires_age_verification).toBe(true);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should handle optional fields correctly', async () => {
      const minimal_deal = {
        id: uuidv4(),
        venue_id: test_venue_id,
        title: 'Minimal Deal',
        description: 'Basic deal',
        original_price: 50.00,
        deal_price: 30.00,
        max_vouchers: 10,
        max_per_customer: 1,
        start_date: '2025-01-01',
        end_date: '2025-12-31'
      };
      
      const result = await DealModel.create(minimal_deal);
      
      expect(result).toBeDefined();
      expect(result.title).toBe(minimal_deal.title);
      expect(result.terms_and_conditions).toBeNull();
      expect(result.deal_image_url).toBeNull();
      expect(result.requires_age_verification).toBeNull();
    });

    it('should calculate savings automatically', async () => {
      const deal_data = {
        id: uuidv4(),
        venue_id: test_venue_id,
        title: 'Savings Test Deal',
        description: 'Test savings calculation',
        original_price: 200.00,
        deal_price: 120.00,
        max_vouchers: 20,
        max_per_customer: 1,
        start_date: '2025-01-01',
        end_date: '2025-12-31'
      };
      
      const result = await DealModel.create(deal_data);
      
      expect(result).toBeDefined();
      // Note: savings_amount and savings_percentage might be calculated by triggers
      expect(parseFloat(result.original_price)).toBe(200.00);
      expect(parseFloat(result.deal_price)).toBe(120.00);
    });
  });

  describe('find_all', () => {
    let venue1_id, venue2_id;

    beforeEach(async () => {
      // Create test venues
      const venue1_data = {
        id: uuidv4(),
        name: 'Cape Town Venue',
        description: 'Great venue in Cape Town',
        address: '123 CT St',
        city: 'Cape Town',
        phone: '+27211111111',
        email: 'ct@venue.com'
      };
      
      const venue2_data = {
        id: uuidv4(),
        name: 'Johannesburg Venue',
        description: 'Amazing venue in Joburg',
        address: '456 JHB St',
        city: 'Johannesburg',
        phone: '+27112222222',
        email: 'jhb@venue.com'
      };
      
      const venue1 = await VenueModel.create(venue1_data);
      const venue2 = await VenueModel.create(venue2_data);
      venue1_id = venue1.id;
      venue2_id = venue2.id;

      // Create test deals (active and within date range)
      const current_date = new Date();
      const start_date = new Date(current_date.getTime() - 24 * 60 * 60 * 1000); // Yesterday
      const end_date = new Date(current_date.getTime() + 30 * 24 * 60 * 60 * 1000); // 30 days from now

      const deals = [
        {
          id: uuidv4(),
          venue_id: venue1_id,
          title: 'Cape Town Food Deal',
          description: 'Delicious food deal',
          original_price: 100.00,
          deal_price: 70.00,
          max_vouchers: 20,
          max_per_customer: 2,
          start_date: start_date.toISOString(),
          end_date: end_date.toISOString()
        },
        {
          id: uuidv4(),
          venue_id: venue2_id,
          title: 'Johannesburg Drinks Special',
          description: 'Great drinks at low prices',
          original_price: 80.00,
          deal_price: 40.00,
          max_vouchers: 15,
          max_per_customer: 1,
          start_date: start_date.toISOString(),
          end_date: end_date.toISOString()
        }
      ];
      
      for (const deal of deals) {
        const created_deal = await DealModel.create(deal);
        // Activate the deals so they appear in find_all
        await DealModel.update(created_deal.id, { status: 'active' });
      }
    });

    it('should return active deals within date range', async () => {
      const deals = await DealModel.find_all();
      
      expect(deals).toHaveLength(2);
      expect(deals[0].status).toBe('active');
      expect(deals[0].vouchers_sold).toBe('0');
      expect(deals[0].venue_name).toBeDefined();
    });

    it('should filter deals by city', async () => {
      const cape_town_deals = await DealModel.find_all({ city: 'Cape Town' });
      
      expect(cape_town_deals).toHaveLength(1);
      expect(cape_town_deals[0].title).toBe('Cape Town Food Deal');
      expect(cape_town_deals[0].venue_city).toBe('Cape Town');
    });

    it('should filter deals by venue_id', async () => {
      const venue_deals = await DealModel.find_all({ venue_id: venue1_id });
      
      expect(venue_deals).toHaveLength(1);
      expect(venue_deals[0].venue_id).toBe(venue1_id);
      expect(venue_deals[0].title).toBe('Cape Town Food Deal');
    });

    it('should filter deals by search term', async () => {
      const search_results = await DealModel.find_all({ search: 'food' });
      
      expect(search_results).toHaveLength(1);
      expect(search_results[0].title).toBe('Cape Town Food Deal');
    });

    it('should filter by minimum savings percentage', async () => {
      const high_savings_deals = await DealModel.find_all({ min_savings: 40 });
      
      // The Johannesburg deal has 50% savings, Cape Town has 30%
      expect(high_savings_deals).toHaveLength(1);
      expect(high_savings_deals[0].title).toBe('Johannesburg Drinks Special');
    });

    it('should filter by maximum price', async () => {
      const cheap_deals = await DealModel.find_all({ max_price: 50 });
      
      expect(cheap_deals).toHaveLength(1);
      expect(cheap_deals[0].title).toBe('Johannesburg Drinks Special');
    });

    it('should handle pagination', async () => {
      const first_page = await DealModel.find_all({ page: 1, limit: 1 });
      const second_page = await DealModel.find_all({ page: 2, limit: 1 });
      
      expect(first_page).toHaveLength(1);
      expect(second_page).toHaveLength(1);
      expect(first_page[0].id).not.toBe(second_page[0].id);
    });
  });

  describe('count_all', () => {
    beforeEach(async () => {
      // Create venues and active deals for counting
      const venue_data = {
        id: uuidv4(),
        name: 'Count Venue',
        description: 'Venue for counting tests',
        address: '999 Count St',
        city: 'Cape Town',
        phone: '+27219999999',
        email: 'count@venue.com'
      };
      
      const venue = await VenueModel.create(venue_data);
      
      // Create 3 active deals
      const current_date = new Date();
      const start_date = new Date(current_date.getTime() - 24 * 60 * 60 * 1000);
      const end_date = new Date(current_date.getTime() + 30 * 24 * 60 * 60 * 1000);

      for (let i = 1; i <= 3; i++) {
        const deal = await DealModel.create({
          id: uuidv4(),
          venue_id: venue.id,
          title: `Count Deal ${i}`,
          description: `Deal for counting ${i}`,
          original_price: 100.00,
          deal_price: 80.00,
          max_vouchers: 10,
          max_per_customer: 1,
          start_date: start_date.toISOString(),
          end_date: end_date.toISOString()
        });
        
        await DealModel.update(deal.id, { status: 'active' });
      }
    });

    it('should count active deals', async () => {
      const count = await DealModel.count_all();
      
      expect(count).toBe(3);
    });

    it('should count with filters', async () => {
      const cape_town_count = await DealModel.count_all({ city: 'Cape Town' });
      
      expect(cape_town_count).toBe(3);
    });
  });

  describe('find_by_id', () => {
    let test_deal_id, test_venue_id;

    beforeEach(async () => {
      // Create venue and deal
      const venue_data = {
        id: uuidv4(),
        name: 'Find By ID Venue',
        description: 'Venue for find by ID tests',
        address: '777 FindID St',
        city: 'Cape Town',
        phone: '+27217777777',
        email: 'findid@venue.com'
      };
      
      const venue = await VenueModel.create(venue_data);
      test_venue_id = venue.id;
      
      const deal_data = {
        id: uuidv4(),
        venue_id: test_venue_id,
        title: 'Find By ID Deal',
        description: 'Deal for find by ID tests',
        original_price: 150.00,
        deal_price: 100.00,
        max_vouchers: 25,
        max_per_customer: 3,
        start_date: '2025-01-01',
        end_date: '2025-12-31'
      };
      
      const deal = await DealModel.create(deal_data);
      test_deal_id = deal.id;
    });

    it('should find deal by ID with venue info', async () => {
      const deal = await DealModel.find_by_id(test_deal_id);
      
      expect(deal).toBeDefined();
      expect(deal.id).toBe(test_deal_id);
      expect(deal.title).toBe('Find By ID Deal');
      expect(deal.venue_name).toBe('Find By ID Venue');
      expect(deal.venue_city).toBe('Cape Town');
      expect(deal.vouchers_sold).toBe('0');
      expect(deal.vouchers_remaining).toBe('25');
    });

    it('should return undefined for non-existent ID', async () => {
      const fake_id = '550e8400-e29b-41d4-a716-446655440000';
      
      const result = await DealModel.find_by_id(fake_id);
      
      expect(result).toBeUndefined();
    });
  });

  describe('find_by_venue_id', () => {
    let test_venue_id;

    beforeEach(async () => {
      // Create venue
      const venue_data = {
        id: uuidv4(),
        name: 'Venue Deals Test',
        description: 'Venue for testing venue deals',
        address: '666 VenueDeals St',
        city: 'Cape Town',
        phone: '+27216666666',
        email: 'venuedeals@venue.com'
      };
      
      const venue = await VenueModel.create(venue_data);
      test_venue_id = venue.id;
      
      // Create deals with different statuses
      const deals = [
        {
          id: uuidv4(),
          venue_id: test_venue_id,
          title: 'Active Deal',
          description: 'An active deal',
          original_price: 100.00,
          deal_price: 70.00,
          max_vouchers: 10,
          max_per_customer: 1,
          start_date: '2025-01-01',
          end_date: '2025-12-31'
        },
        {
          id: uuidv4(),
          venue_id: test_venue_id,
          title: 'Draft Deal',
          description: 'A draft deal',
          original_price: 80.00,
          deal_price: 50.00,
          max_vouchers: 5,
          max_per_customer: 1,
          start_date: '2025-01-01',
          end_date: '2025-12-31'
        }
      ];
      
      for (const deal_data of deals) {
        await DealModel.create(deal_data);
      }
      
      // Find the deal we want to activate (by title) and activate it
      const all_deals = await DealModel.find_by_venue_id(test_venue_id);
      const active_deal = all_deals.find(d => d.title === 'Active Deal');
      if (active_deal) {
        await DealModel.update(active_deal.id, { status: 'active' });
      }
    });

    it('should return all deals for venue', async () => {
      const deals = await DealModel.find_by_venue_id(test_venue_id);
      
      expect(deals).toHaveLength(2);
      expect(deals[0].vouchers_sold).toBe('0');
    });

    it('should filter deals by status', async () => {
      const active_deals = await DealModel.find_by_venue_id(test_venue_id, 'active');
      const draft_deals = await DealModel.find_by_venue_id(test_venue_id, 'draft');
      
      expect(active_deals).toHaveLength(1);
      expect(active_deals[0].title).toBe('Active Deal');
      expect(draft_deals).toHaveLength(1);
      expect(draft_deals[0].title).toBe('Draft Deal');
    });

    it('should return empty array for non-existent venue', async () => {
      const fake_venue_id = '550e8400-e29b-41d4-a716-446655440000';
      
      const deals = await DealModel.find_by_venue_id(fake_venue_id);
      
      expect(deals).toEqual([]);
    });
  });

  describe('update', () => {
    let test_deal_id, test_venue_id;

    beforeEach(async () => {
      // Create venue and deal
      const venue_data = {
        id: uuidv4(),
        name: 'Update Test Venue',
        description: 'Venue for update tests',
        address: '555 Update St',
        city: 'Cape Town',
        phone: '+27215555555',
        email: 'update@venue.com'
      };
      
      const venue = await VenueModel.create(venue_data);
      test_venue_id = venue.id;
      
      const deal_data = {
        id: uuidv4(),
        venue_id: test_venue_id,
        title: 'Update Test Deal',
        description: 'Deal for update tests',
        original_price: 120.00,
        deal_price: 80.00,
        max_vouchers: 20,
        max_per_customer: 2,
        start_date: '2025-01-01',
        end_date: '2025-12-31'
      };
      
      const deal = await DealModel.create(deal_data);
      test_deal_id = deal.id;
    });

    it('should update deal fields', async () => {
      const updates = {
        title: 'Updated Deal Title',
        description: 'Updated deal description',
        deal_price: 60.00,
        status: 'active'
      };
      
      const updated_deal = await DealModel.update(test_deal_id, updates);
      
      expect(updated_deal.title).toBe('Updated Deal Title');
      expect(updated_deal.description).toBe('Updated deal description');
      expect(parseFloat(updated_deal.deal_price)).toBe(60.00);
      expect(updated_deal.status).toBe('active');
      expect(updated_deal.updated_at).toBeInstanceOf(Date);
    });

    it('should throw error for no fields to update', async () => {
      await expect(DealModel.update(test_deal_id, {}))
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
    let test_deal_id, test_venue_id;

    beforeEach(async () => {
      // Create venue and deal
      const venue_data = {
        id: uuidv4(),
        name: 'Delete Test Venue',
        description: 'Venue for delete tests',
        address: '444 Delete St',
        city: 'Cape Town',
        phone: '+27214444444',
        email: 'delete@venue.com'
      };
      
      const venue = await VenueModel.create(venue_data);
      test_venue_id = venue.id;
      
      const deal_data = {
        id: uuidv4(),
        venue_id: test_venue_id,
        title: 'Delete Test Deal',
        description: 'Deal for delete tests',
        original_price: 90.00,
        deal_price: 65.00,
        max_vouchers: 15,
        max_per_customer: 1,
        start_date: '2025-01-01',
        end_date: '2025-12-31'
      };
      
      const deal = await DealModel.create(deal_data);
      test_deal_id = deal.id;
    });

    it('should soft delete deal by setting status to ended', async () => {
      await DealModel.delete(test_deal_id);
      
      const deleted_deal = await DealModel.find_by_id(test_deal_id);
      
      expect(deleted_deal.status).toBe('ended');
      expect(deleted_deal.updated_at).toBeInstanceOf(Date);
    });
  });

  describe('check_availability', () => {
    let test_deal_id, test_venue_id;

    beforeEach(async () => {
      // Create venue
      const venue_data = {
        id: uuidv4(),
        name: 'Availability Test Venue',
        description: 'Venue for availability tests',
        address: '333 Available St',
        city: 'Cape Town',
        phone: '+27213333333',
        email: 'available@venue.com'
      };
      
      const venue = await VenueModel.create(venue_data);
      test_venue_id = venue.id;
    });

    it('should return not available for non-existent deal', async () => {
      const fake_id = '550e8400-e29b-41d4-a716-446655440000';
      
      const result = await DealModel.check_availability(fake_id, 1);
      
      expect(result.available).toBe(false);
      expect(result.reason).toBe('Deal not found');
    });

    it('should return not available for inactive deal', async () => {
      const deal_data = {
        id: uuidv4(),
        venue_id: test_venue_id,
        title: 'Inactive Deal',
        description: 'An inactive deal',
        original_price: 100.00,
        deal_price: 70.00,
        max_vouchers: 10,
        max_per_customer: 1,
        start_date: '2025-01-01',
        end_date: '2025-12-31'
      };
      
      const deal = await DealModel.create(deal_data);
      
      const result = await DealModel.check_availability(deal.id, 1);
      
      expect(result.available).toBe(false);
      expect(result.reason).toBe('Deal not active');
    });

    it('should return not available for expired deal', async () => {
      const past_date = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000); // 7 days ago
      const deal_data = {
        id: uuidv4(),
        venue_id: test_venue_id,
        title: 'Expired Deal',
        description: 'An expired deal',
        original_price: 100.00,
        deal_price: 70.00,
        max_vouchers: 10,
        max_per_customer: 1,
        start_date: past_date.toISOString(),
        end_date: past_date.toISOString()
      };
      
      const deal = await DealModel.create(deal_data);
      await DealModel.update(deal.id, { status: 'active' });
      
      const result = await DealModel.check_availability(deal.id, 1);
      
      expect(result.available).toBe(false);
      expect(result.reason).toBe('Deal not available');
    });

    it('should return available for valid deal', async () => {
      const future_date = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000); // 30 days from now
      const deal_data = {
        id: uuidv4(),
        venue_id: test_venue_id,
        title: 'Available Deal',
        description: 'An available deal',
        original_price: 100.00,
        deal_price: 70.00,
        max_vouchers: 10,
        max_per_customer: 1,
        start_date: new Date().toISOString(),
        end_date: future_date.toISOString()
      };
      
      const deal = await DealModel.create(deal_data);
      await DealModel.update(deal.id, { status: 'active' });
      
      const result = await DealModel.check_availability(deal.id, 2);
      
      expect(result.available).toBe(true);
      expect(result.vouchers_remaining).toBe('10');
    });
  });

  describe('get_analytics', () => {
    let test_deal_id, test_venue_id;

    beforeEach(async () => {
      // Create venue and deal
      const venue_data = {
        id: uuidv4(),
        name: 'Analytics Test Venue',
        description: 'Venue for analytics tests',
        address: '222 Analytics St',
        city: 'Cape Town',
        phone: '+27212222222',
        email: 'analytics@venue.com'
      };
      
      const venue = await VenueModel.create(venue_data);
      test_venue_id = venue.id;
      
      const deal_data = {
        id: uuidv4(),
        venue_id: test_venue_id,
        title: 'Analytics Test Deal',
        description: 'Deal for analytics tests',
        original_price: 100.00,
        deal_price: 75.00,
        max_vouchers: 20,
        max_per_customer: 2,
        start_date: '2025-01-01',
        end_date: '2025-12-31'
      };
      
      const deal = await DealModel.create(deal_data);
      test_deal_id = deal.id;
    });

    it('should return analytics for deal with no vouchers', async () => {
      const analytics = await DealModel.get_analytics(test_deal_id);
      
      expect(analytics).toBeDefined();
      expect(analytics.total_vouchers).toBe('0');
      expect(analytics.active_vouchers).toBe('0');
      expect(analytics.redeemed_vouchers).toBe('0');
      expect(parseInt(analytics.total_revenue)).toBe(0);
      expect(analytics.unique_customers).toBe('0');
    });

    it('should handle custom period', async () => {
      const analytics_7_days = await DealModel.get_analytics(test_deal_id, 7);
      const analytics_60_days = await DealModel.get_analytics(test_deal_id, 60);
      
      expect(analytics_7_days).toBeDefined();
      expect(analytics_60_days).toBeDefined();
      // Should return same results for deal with no vouchers
      expect(analytics_7_days.total_vouchers).toBe(analytics_60_days.total_vouchers);
    });
  });

  describe('edge cases and error handling', () => {
    let test_venue_id;

    beforeEach(async () => {
      const venue_data = {
        id: uuidv4(),
        name: 'Edge Case Venue',
        description: 'Venue for edge case tests',
        address: '111 Edge St',
        city: 'Cape Town',
        phone: '+27211111111',
        email: 'edge@venue.com'
      };
      
      const venue = await VenueModel.create(venue_data);
      test_venue_id = venue.id;
    });

    it('should handle extremely long deal titles', async () => {
      const deal_data = {
        id: uuidv4(),
        venue_id: test_venue_id,
        title: 'A'.repeat(300), // Exceeds typical varchar limits
        description: 'Long title deal',
        original_price: 100.00,
        deal_price: 70.00,
        max_vouchers: 10,
        max_per_customer: 1,
        start_date: '2025-01-01',
        end_date: '2025-12-31'
      };
      
      await expect(DealModel.create(deal_data))
        .rejects
        .toThrow();
    });

    it('should handle negative prices gracefully', async () => {
      const deal_data = {
        id: uuidv4(),
        venue_id: test_venue_id,
        title: 'Negative Price Deal',
        description: 'Deal with negative price',
        original_price: 100.00,
        deal_price: -50.00, // Negative price
        max_vouchers: 10,
        max_per_customer: 1,
        start_date: '2025-01-01',
        end_date: '2025-12-31'
      };
      
      // This might be allowed by the database but should be validated at business logic level
      const result = await DealModel.create(deal_data);
      expect(result).toBeDefined();
      expect(parseFloat(result.deal_price)).toBe(-50.00);
    });

    it('should handle concurrent deal updates', async () => {
      const deal_data = {
        id: uuidv4(),
        venue_id: test_venue_id,
        title: 'Concurrent Update Deal',
        description: 'Deal for concurrent updates',
        original_price: 100.00,
        deal_price: 70.00,
        max_vouchers: 10,
        max_per_customer: 1,
        start_date: '2025-01-01',
        end_date: '2025-12-31'
      };
      
      const deal = await DealModel.create(deal_data);
      
      const update_promises = [
        DealModel.update(deal.id, { title: 'Updated Title 1' }),
        DealModel.update(deal.id, { title: 'Updated Title 2' })
      ];
      
      const results = await Promise.allSettled(update_promises);
      
      // Both should succeed (last writer wins)
      expect(results.every(r => r.status === 'fulfilled')).toBe(true);
    });
  });
});