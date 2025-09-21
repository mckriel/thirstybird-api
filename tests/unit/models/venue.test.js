import { describe, it, expect, beforeEach } from 'vitest';
import { VenueModel } from '../../../src/models/venue.js';
import { UserModel } from '../../../src/models/user.js';
import { create_venue_factory } from '../../helpers/factories.js';
import { v4 as uuidv4 } from 'uuid';
import bcrypt from 'bcryptjs';

describe('VenueModel', () => {
  beforeEach(async () => {
    // Clean venues and related tables for this test
    await test_utils.clean_tables(['venue_profiles', 'deals', 'vouchers', 'venues']);
  });

  describe('create', () => {
    it('should create a new venue with valid data', async () => {
      const venue_data = {
        id: uuidv4(),
        name: 'Test Venue',
        description: 'A test venue for unit testing',
        address: '123 Test Street',
        city: 'Cape Town',
        postal_code: '8001',
        latitude: -33.9249,
        longitude: 18.4241,
        phone: '+27214567890',
        email: 'test@venue.com',
        website: 'https://testvenue.com',
        logo_url: 'https://example.com/logo.png',
        cover_image_url: 'https://example.com/cover.jpg',
        opening_hours: JSON.stringify({
          monday: { open: '09:00', close: '22:00' },
          tuesday: { open: '09:00', close: '22:00' }
        }),
        requires_age_verification: true
      };
      
      const result = await VenueModel.create(venue_data);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(venue_data.id);
      expect(result.name).toBe(venue_data.name);
      expect(result.description).toBe(venue_data.description);
      expect(result.address).toBe(venue_data.address);
      expect(result.city).toBe(venue_data.city);
      expect(parseFloat(result.latitude)).toBe(venue_data.latitude);
      expect(parseFloat(result.longitude)).toBe(venue_data.longitude);
      expect(result.phone).toBe(venue_data.phone);
      expect(result.email).toBe(venue_data.email);
      expect(result.requires_age_verification).toBe(true);
      expect(result.is_active).toBe(true); // Default value
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should handle optional fields correctly', async () => {
      const minimal_venue = {
        id: uuidv4(),
        name: 'Minimal Venue',
        description: 'Basic venue',
        address: '456 Simple St',
        city: 'Johannesburg',
        phone: '+27115551234',
        email: 'minimal@venue.com'
      };
      
      const result = await VenueModel.create(minimal_venue);
      
      expect(result).toBeDefined();
      expect(result.name).toBe(minimal_venue.name);
      expect(result.website).toBeNull();
      expect(result.logo_url).toBeNull();
      expect(result.requires_age_verification).toBeNull(); // Optional field
    });

    it('should allow duplicate emails (no unique constraint)', async () => {
      const venue_data = {
        id: uuidv4(),
        name: 'First Venue',
        description: 'First venue',
        address: '123 First St',
        city: 'Cape Town',
        phone: '+27214567890',
        email: 'duplicate@venue.com'
      };
      
      await VenueModel.create(venue_data);
      
      const duplicate_venue = {
        ...venue_data,
        id: uuidv4(),
        name: 'Second Venue'
      };
      
      const result = await VenueModel.create(duplicate_venue);
      expect(result).toBeDefined();
      expect(result.name).toBe('Second Venue');
      expect(result.email).toBe('duplicate@venue.com');
    });
  });

  describe('find_all', () => {
    beforeEach(async () => {
      // Create test venues
      const venues = [
        {
          id: uuidv4(),
          name: 'Cape Town Bar',
          description: 'Great drinks in Cape Town',
          address: '123 Long St',
          city: 'Cape Town',
          phone: '+27214567890',
          email: 'capetown@bar.com'
        },
        {
          id: uuidv4(),
          name: 'Johannesburg Pub',
          description: 'Amazing food in Joburg',
          address: '456 Main Rd',
          city: 'Johannesburg',
          phone: '+27115551234',
          email: 'joburg@pub.com'
        },
        {
          id: uuidv4(),
          name: 'Durban Restaurant',
          description: 'Seafood by the beach',
          address: '789 Beach Rd',
          city: 'Durban',
          phone: '+27315554567',
          email: 'durban@restaurant.com'
        }
      ];
      
      for (const venue of venues) {
        await VenueModel.create(venue);
      }
    });

    it('should return all active venues', async () => {
      const venues = await VenueModel.find_all();
      
      expect(venues).toHaveLength(3);
      expect(venues[0].active_deals_count).toBe('0');
      expect(venues.every(v => v.is_active === undefined)).toBe(true); // Not selected
    });

    it('should filter venues by city', async () => {
      const cape_town_venues = await VenueModel.find_all({ city: 'Cape Town' });
      
      expect(cape_town_venues).toHaveLength(1);
      expect(cape_town_venues[0].name).toBe('Cape Town Bar');
      expect(cape_town_venues[0].city).toBe('Cape Town');
    });

    it('should filter venues by search term', async () => {
      const search_results = await VenueModel.find_all({ search: 'Amazing food' });
      
      expect(search_results).toHaveLength(1);
      expect(search_results[0].name).toBe('Johannesburg Pub');
    });

    it('should handle pagination', async () => {
      const first_page = await VenueModel.find_all({ page: 1, limit: 2 });
      const second_page = await VenueModel.find_all({ page: 2, limit: 2 });
      
      expect(first_page).toHaveLength(2);
      expect(second_page).toHaveLength(1);
      expect(first_page[0].id).not.toBe(second_page[0].id);
    });

    it('should combine city and search filters', async () => {
      const filtered_venues = await VenueModel.find_all({ 
        city: 'Durban', 
        search: 'seafood' 
      });
      
      expect(filtered_venues).toHaveLength(1);
      expect(filtered_venues[0].name).toBe('Durban Restaurant');
    });
  });

  describe('count_all', () => {
    beforeEach(async () => {
      // Create 5 test venues
      for (let i = 1; i <= 5; i++) {
        await VenueModel.create({
          id: uuidv4(),
          name: `Test Venue ${i}`,
          description: `Description ${i}`,
          address: `${i} Test St`,
          city: i <= 3 ? 'Cape Town' : 'Johannesburg',
          phone: `+2721${i}567890`,
          email: `venue${i}@test.com`
        });
      }
    });

    it('should count all venues', async () => {
      const count = await VenueModel.count_all();
      
      expect(count).toBe(5);
    });

    it('should count venues by city', async () => {
      const cape_town_count = await VenueModel.count_all({ city: 'Cape Town' });
      const joburg_count = await VenueModel.count_all({ city: 'Johannesburg' });
      
      expect(cape_town_count).toBe(3);
      expect(joburg_count).toBe(2);
    });

    it('should count venues by search term', async () => {
      const search_count = await VenueModel.count_all({ search: 'Description' });
      
      expect(search_count).toBe(5);
    });
  });

  describe('find_by_id', () => {
    let test_venue_id;

    beforeEach(async () => {
      const venue_data = {
        id: uuidv4(),
        name: 'Find By ID Venue',
        description: 'Test venue for find by ID',
        address: '999 Find St',
        city: 'Cape Town',
        phone: '+27219999999',
        email: 'findme@venue.com'
      };
      
      const created_venue = await VenueModel.create(venue_data);
      test_venue_id = created_venue.id;
    });

    it('should find venue by ID with deal counts', async () => {
      const venue = await VenueModel.find_by_id(test_venue_id);
      
      expect(venue).toBeDefined();
      expect(venue.id).toBe(test_venue_id);
      expect(venue.name).toBe('Find By ID Venue');
      expect(venue.total_deals_count).toBe('0');
      expect(venue.active_deals_count).toBe('0');
    });

    it('should return undefined for non-existent ID', async () => {
      const fake_id = '550e8400-e29b-41d4-a716-446655440000';
      
      const result = await VenueModel.find_by_id(fake_id);
      
      expect(result).toBeUndefined();
    });

    it('should throw error for invalid UUID', async () => {
      await expect(VenueModel.find_by_id('invalid-uuid'))
        .rejects
        .toThrow();
    });
  });

  describe('get_active_deals', () => {
    let test_venue_id;

    beforeEach(async () => {
      const venue_data = {
        id: uuidv4(),
        name: 'Deals Venue',
        description: 'Test venue for deals',
        address: '888 Deals St',
        city: 'Cape Town',
        phone: '+27218888888',
        email: 'deals@venue.com'
      };
      
      const created_venue = await VenueModel.create(venue_data);
      test_venue_id = created_venue.id;
    });

    it('should return empty array for venue with no deals', async () => {
      const deals = await VenueModel.get_active_deals(test_venue_id);
      
      expect(deals).toEqual([]);
    });

    it('should return empty array for non-existent venue', async () => {
      const fake_id = '550e8400-e29b-41d4-a716-446655440000';
      
      const deals = await VenueModel.get_active_deals(fake_id);
      
      expect(deals).toEqual([]);
    });
  });

  describe('update', () => {
    let test_venue_id;

    beforeEach(async () => {
      const venue_data = {
        id: uuidv4(),
        name: 'Update Venue',
        description: 'Test venue for updates',
        address: '777 Update St',
        city: 'Cape Town',
        phone: '+27217777777',
        email: 'update@venue.com'
      };
      
      const created_venue = await VenueModel.create(venue_data);
      test_venue_id = created_venue.id;
    });

    it('should update venue fields', async () => {
      const updates = {
        name: 'Updated Venue Name',
        description: 'Updated description',
        phone: '+27219999999'
      };
      
      const updated_venue = await VenueModel.update(test_venue_id, updates);
      
      expect(updated_venue.name).toBe('Updated Venue Name');
      expect(updated_venue.description).toBe('Updated description');
      expect(updated_venue.phone).toBe('+27219999999');
      expect(updated_venue.email).toBe('update@venue.com'); // Should remain unchanged
      expect(updated_venue.updated_at).toBeInstanceOf(Date);
    });

    it('should throw error for no fields to update', async () => {
      await expect(VenueModel.update(test_venue_id, {}))
        .rejects
        .toThrow('No fields to update');
    });

    it('should return undefined for non-existent venue', async () => {
      const fake_id = '550e8400-e29b-41d4-a716-446655440000';
      
      const result = await VenueModel.update(fake_id, { name: 'Test' });
      
      expect(result).toBeUndefined();
    });

    it('should handle partial updates', async () => {
      const updated_venue = await VenueModel.update(test_venue_id, { 
        website: 'https://newwebsite.com' 
      });
      
      expect(updated_venue.website).toBe('https://newwebsite.com');
      expect(updated_venue.name).toBe('Update Venue'); // Should remain unchanged
    });
  });

  describe('create_venue_profile', () => {
    let test_venue_id;
    let test_user_id;

    beforeEach(async () => {
      // Create a test venue
      const venue_data = {
        id: uuidv4(),
        name: 'Profile Venue',
        description: 'Test venue for profiles',
        address: '666 Profile St',
        city: 'Cape Town',
        phone: '+27216666666',
        email: 'profile@venue.com'
      };
      
      const created_venue = await VenueModel.create(venue_data);
      test_venue_id = created_venue.id;
      
      // Create a test user
      const user_data = {
        id: uuidv4(),
        email: 'profileuser@test.com',
        password_hash: await bcrypt.hash('password123', 12),
        first_name: 'Profile',
        last_name: 'User'
      };
      
      const created_user = await UserModel.create(user_data);
      test_user_id = created_user.id;
    });

    it('should create venue profile', async () => {
      const permissions = ['manage_deals', 'view_analytics'];
      
      await VenueModel.create_venue_profile(
        test_user_id, 
        test_venue_id, 
        permissions, 
        true
      );
      
      // Verify profile was created
      const result = await test_utils.query(
        'SELECT * FROM venue_profiles WHERE user_id = $1 AND venue_id = $2',
        [test_user_id, test_venue_id]
      );
      
      expect(result.rows).toHaveLength(1);
      expect(result.rows[0].user_id).toBe(test_user_id);
      expect(result.rows[0].venue_id).toBe(test_venue_id);
      expect(result.rows[0].is_primary_contact).toBe(true);
      // The permissions are stored as JSON string
      const stored_permissions = result.rows[0].permissions;
      if (typeof stored_permissions === 'string') {
        expect(JSON.parse(stored_permissions)).toEqual(permissions);
      } else {
        expect(stored_permissions).toEqual(permissions);
      }
    });

    it('should handle non-primary contact', async () => {
      const permissions = ['view_analytics'];
      
      await VenueModel.create_venue_profile(
        test_user_id, 
        test_venue_id, 
        permissions, 
        false
      );
      
      const result = await test_utils.query(
        'SELECT is_primary_contact FROM venue_profiles WHERE user_id = $1 AND venue_id = $2',
        [test_user_id, test_venue_id]
      );
      
      expect(result.rows[0].is_primary_contact).toBe(false);
    });
  });

  describe('get_venue_analytics', () => {
    let test_venue_id;

    beforeEach(async () => {
      const venue_data = {
        id: uuidv4(),
        name: 'Analytics Venue',
        description: 'Test venue for analytics',
        address: '555 Analytics St',
        city: 'Cape Town',
        phone: '+27215555555',
        email: 'analytics@venue.com'
      };
      
      const created_venue = await VenueModel.create(venue_data);
      test_venue_id = created_venue.id;
    });

    it('should return analytics for venue with no activity', async () => {
      const analytics = await VenueModel.get_venue_analytics(test_venue_id);
      
      expect(analytics).toBeDefined();
      expect(analytics.total_vouchers).toBe('0');
      expect(analytics.active_vouchers).toBe('0');
      expect(analytics.redeemed_vouchers).toBe('0');
      expect(parseInt(analytics.total_revenue)).toBe(0);
      expect(analytics.unique_customers).toBe('0');
      expect(analytics.total_deals).toBe('0');
    });

    it('should handle custom period', async () => {
      const analytics_7_days = await VenueModel.get_venue_analytics(test_venue_id, 7);
      const analytics_60_days = await VenueModel.get_venue_analytics(test_venue_id, 60);
      
      expect(analytics_7_days).toBeDefined();
      expect(analytics_60_days).toBeDefined();
      // Both should return same results for empty venue
      expect(analytics_7_days.total_vouchers).toBe(analytics_60_days.total_vouchers);
    });
  });

  describe('get_top_deals', () => {
    let test_venue_id;

    beforeEach(async () => {
      const venue_data = {
        id: uuidv4(),
        name: 'Top Deals Venue',
        description: 'Test venue for top deals',
        address: '444 Top St',
        city: 'Cape Town',
        phone: '+27214444444',
        email: 'topdeals@venue.com'
      };
      
      const created_venue = await VenueModel.create(venue_data);
      test_venue_id = created_venue.id;
    });

    it('should return empty array for venue with no deals', async () => {
      const top_deals = await VenueModel.get_top_deals(test_venue_id);
      
      expect(top_deals).toEqual([]);
    });

    it('should handle custom period', async () => {
      const top_deals_7_days = await VenueModel.get_top_deals(test_venue_id, 7);
      const top_deals_90_days = await VenueModel.get_top_deals(test_venue_id, 90);
      
      expect(top_deals_7_days).toEqual([]);
      expect(top_deals_90_days).toEqual([]);
    });
  });

  describe('get_dashboard_data', () => {
    let test_venue_id;

    beforeEach(async () => {
      const venue_data = {
        id: uuidv4(),
        name: 'Dashboard Venue',
        description: 'Test venue for dashboard',
        address: '333 Dashboard St',
        city: 'Cape Town',
        phone: '+27213333333',
        email: 'dashboard@venue.com',
        logo_url: 'https://example.com/logo.png'
      };
      
      const created_venue = await VenueModel.create(venue_data);
      test_venue_id = created_venue.id;
    });

    it('should return complete dashboard data', async () => {
      const dashboard_data = await VenueModel.get_dashboard_data(test_venue_id);
      
      expect(dashboard_data).toBeDefined();
      expect(dashboard_data.venue).toBeDefined();
      expect(dashboard_data.venue.name).toBe('Dashboard Venue');
      expect(dashboard_data.venue.city).toBe('Cape Town');
      expect(dashboard_data.venue.logo_url).toBe('https://example.com/logo.png');
      
      expect(dashboard_data.analytics).toBeDefined();
      expect(dashboard_data.analytics.total_vouchers).toBe('0');
      
      expect(dashboard_data.recent_vouchers).toEqual([]);
      expect(dashboard_data.active_deals).toEqual([]);
    });

    it('should return null venue for non-existent venue', async () => {
      const fake_id = '550e8400-e29b-41d4-a716-446655440000';
      
      const dashboard_data = await VenueModel.get_dashboard_data(fake_id);
      
      expect(dashboard_data.venue).toBeUndefined();
      expect(dashboard_data.analytics.total_vouchers).toBe('0'); // Analytics still runs
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle null values in optional fields', async () => {
      const venue_data = {
        id: uuidv4(),
        name: 'Null Fields Venue',
        description: 'Test venue with nulls',
        address: '222 Null St',
        city: 'Cape Town',
        phone: '+27212222222',
        email: 'nulls@venue.com',
        website: null,
        logo_url: null,
        opening_hours: null
      };
      
      const result = await VenueModel.create(venue_data);
      
      expect(result).toBeDefined();
      expect(result.website).toBeNull();
      expect(result.logo_url).toBeNull();
    });

    it('should handle extremely long venue names gracefully', async () => {
      const venue_data = {
        id: uuidv4(),
        name: 'A'.repeat(300), // Exceeds typical varchar limits
        description: 'Long name venue',
        address: '111 Long St',
        city: 'Cape Town',
        phone: '+27211111111',
        email: 'longname@venue.com'
      };
      
      await expect(VenueModel.create(venue_data))
        .rejects
        .toThrow();
    });

    it('should handle concurrent venue updates', async () => {
      const venue_data = {
        id: uuidv4(),
        name: 'Concurrent Venue',
        description: 'Test concurrent updates',
        address: '100 Concurrent St',
        city: 'Cape Town',
        phone: '+27211000000',
        email: 'concurrent@venue.com'
      };
      
      const created_venue = await VenueModel.create(venue_data);
      
      const update_promises = [
        VenueModel.update(created_venue.id, { name: 'Updated Name 1' }),
        VenueModel.update(created_venue.id, { name: 'Updated Name 2' })
      ];
      
      const results = await Promise.allSettled(update_promises);
      
      // Both should succeed (last writer wins in most cases)
      expect(results.every(r => r.status === 'fulfilled')).toBe(true);
    });
  });
});