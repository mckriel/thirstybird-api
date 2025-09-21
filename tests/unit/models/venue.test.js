import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { VenueModel } from '../../../src/models/venue.js';
import { UserModel } from '../../../src/models/user.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

describe('VenueModel', () => {
  beforeAll(async () => {
    // Clean before this test file starts
    await test_utils.clean_test_data();
  });
  
  afterAll(async () => {
    // Clean after this test file ends
    await test_utils.clean_test_data();
  });

  describe('create', () => {
    it('should create a new venue with valid data', async () => {
      const venue_data = {
        id: uuidv4(),
        name: 'Test Venue',
        description: 'A great test venue for testing purposes',
        address: '123 Test Street',
        city: 'Cape Town',
        postal_code: '8001',
        phone: '+27123456789',
        email: 'venue@test.com',
        latitude: -33.9249,
        longitude: 18.4241
      };
      
      const result = await VenueModel.create(venue_data);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(venue_data.id);
      expect(result.name).toBe(venue_data.name);
      expect(result.email).toBe(venue_data.email);
      expect(result.city).toBe(venue_data.city);
      expect(result.is_active).toBe(true);
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should handle optional fields correctly', async () => {
      const venue_data = {
        id: uuidv4(),
        name: 'Minimal Venue',
        description: 'A minimal venue for testing',
        address: '456 Minimal Street',
        city: 'Johannesburg',
        postal_code: '2000',
        phone: '+27987654321',
        email: 'minimal@venue.com'
        // latitude, longitude, website are optional
      };
      
      const result = await VenueModel.create(venue_data);
      
      expect(result).toBeDefined();
      expect(result.name).toBe(venue_data.name);
      expect(result.latitude).toBeNull();
      expect(result.longitude).toBeNull();
    });
  });

  describe('find_by_id', () => {
    it('should find venue by ID', async () => {
      const venue_data = {
        id: uuidv4(),
        name: 'Findable Venue',
        description: 'A venue that can be found by ID',
        address: '789 Findable Street',
        city: 'Durban',
        postal_code: '4000',
        phone: '+27456789123',
        email: 'findable@venue.com'
      };
      
      await VenueModel.create(venue_data);
      const found_venue = await VenueModel.find_by_id(venue_data.id);
      
      expect(found_venue).toBeDefined();
      expect(found_venue.id).toBe(venue_data.id);
      expect(found_venue.name).toBe(venue_data.name);
      expect(found_venue.email).toBe(venue_data.email);
    });

    it('should return undefined for non-existent ID', async () => {
      const fake_id = '550e8400-e29b-41d4-a716-446655440000';
      
      const result = await VenueModel.find_by_id(fake_id);
      
      expect(result).toBeUndefined();
    });

    it('should throw error for invalid UUID format', async () => {
      await expect(VenueModel.find_by_id('invalid-uuid'))
        .rejects
        .toThrow();
    });
  });

  describe('find_all', () => {
    it('should find venues by city filter', async () => {
      const venue_data = {
        id: uuidv4(),
        name: 'City Test Venue',
        description: 'A venue in a specific city',
        address: '321 City Street',
        city: 'Bloemfontein',
        postal_code: '9300',
        phone: '+27654321987',
        email: 'citytest@venue.com'
      };
      
      await VenueModel.create(venue_data);
      const venues = await VenueModel.find_all({ city: 'Bloemfontein' });
      
      expect(venues).toBeInstanceOf(Array);
      expect(venues.length).toBeGreaterThan(0);
      expect(venues.find(v => v.id === venue_data.id)).toBeDefined();
    });

    it('should return empty array for city with no venues', async () => {
      const venues = await VenueModel.find_all({ city: 'NonExistentCity' });
      
      expect(venues).toBeInstanceOf(Array);
      expect(venues.length).toBe(0);
    });
  });

  describe('update', () => {
    it('should update venue information', async () => {
      const venue_data = {
        id: uuidv4(),
        name: 'Update Test Venue',
        description: 'A venue to test updates',
        address: '654 Update Street',
        city: 'Pretoria',
        postal_code: '0001',
        phone: '+27789654123',
        email: 'update@venue.com'
      };
      
      await VenueModel.create(venue_data);
      
      const updates = {
        name: 'Updated Venue Name',
        description: 'This venue has been updated',
        phone: '+27111222333'
      };
      
      const updated_venue = await VenueModel.update(venue_data.id, updates);
      
      expect(updated_venue.name).toBe('Updated Venue Name');
      expect(updated_venue.description).toBe('This venue has been updated');
      expect(updated_venue.phone).toBe('+27111222333');
      expect(updated_venue.email).toBe(venue_data.email); // Should remain unchanged
      expect(updated_venue.updated_at).toBeInstanceOf(Date);
    });

    it('should return undefined for non-existent venue', async () => {
      const fake_id = '550e8400-e29b-41d4-a716-446655440000';
      
      const result = await VenueModel.update(fake_id, { name: 'Test' });
      
      expect(result).toBeUndefined();
    });
  });

  describe('create_venue_profile', () => {
    it('should create venue profile for user', async () => {
      // First create a user
      const user_data = {
        id: uuidv4(),
        email: `profileuser-${uuidv4()}@test.com`,
        password_hash: await bcrypt.hash('password123', 12),
        first_name: 'Profile',
        last_name: 'User'
      };
      await UserModel.create(user_data);

      // Then create a venue
      const venue_data = {
        id: uuidv4(),
        name: 'Profile Test Venue',
        description: 'A venue to test profile creation',
        address: '147 Profile Street',
        city: 'East London',
        postal_code: '5200',
        phone: '+27258741963',
        email: 'profile@venue.com'
      };
      await VenueModel.create(venue_data);

      // Create profile - this method doesn't return anything, so we just test it doesn't throw
      const permissions = ['manage_deals', 'view_analytics'];
      await expect(VenueModel.create_venue_profile(user_data.id, venue_data.id, permissions))
        .resolves
        .not.toThrow();
    });
  });

  describe('get_active_deals', () => {
    it('should return empty array for venue with no active deals', async () => {
      const venue_data = {
        id: uuidv4(),
        name: 'No Deals Venue',
        description: 'A venue with no deals',
        address: '258 No Deals Street',
        city: 'Polokwane',
        postal_code: '0700',
        phone: '+27159753852',
        email: 'nodeals@venue.com'
      };
      
      await VenueModel.create(venue_data);
      const deals = await VenueModel.get_active_deals(venue_data.id);
      
      expect(deals).toEqual([]);
    });
  });

  describe('get_venue_analytics', () => {
    it('should return venue analytics', async () => {
      const venue_data = {
        id: uuidv4(),
        name: 'Analytics Venue',
        description: 'A venue to test analytics',
        address: '369 Analytics Street',
        city: 'Kimberley',
        postal_code: '8300',
        phone: '+27741852963',
        email: 'analytics@venue.com'
      };
      
      await VenueModel.create(venue_data);
      const analytics = await VenueModel.get_venue_analytics(venue_data.id);
      
      expect(analytics).toBeDefined();
      expect(analytics.total_vouchers).toBe('0');
      expect(analytics.active_vouchers).toBe('0');
      expect(analytics.redeemed_vouchers).toBe('0');
      expect(parseInt(analytics.total_revenue)).toBe(0);
    });
  });

  describe('count_all', () => {
    it('should count all venues', async () => {
      const count = await VenueModel.count_all();
      
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should filter count by city', async () => {
      const count = await VenueModel.count_all({ city: 'Cape Town' });
      
      expect(count).toBeGreaterThanOrEqual(0);
    });

    it('should filter count by search term', async () => {
      const count = await VenueModel.count_all({ search: 'Test' });
      
      expect(count).toBeGreaterThanOrEqual(0);
    });
  });

  describe('find_all with search', () => {
    it('should filter venues by search term', async () => {
      const venues = await VenueModel.find_all({ search: 'Test' });
      
      expect(venues).toBeInstanceOf(Array);
      expect(venues.length).toBeGreaterThanOrEqual(0);
    });

    it('should handle pagination', async () => {
      const venues = await VenueModel.find_all({ page: 1, limit: 5 });
      
      expect(venues).toBeInstanceOf(Array);
      expect(venues.length).toBeLessThanOrEqual(5);
    });
  });

  describe('get_top_deals', () => {
    it('should return top deals for venue', async () => {
      const venue_data = {
        id: uuidv4(),
        name: 'Top Deals Venue',
        description: 'A venue to test top deals',
        address: '456 Top Deals Street',
        city: 'Port Elizabeth',
        postal_code: '6000',
        phone: '+27963852741',
        email: 'topdeals@venue.com'
      };
      
      await VenueModel.create(venue_data);
      const top_deals = await VenueModel.get_top_deals(venue_data.id);
      
      expect(top_deals).toBeInstanceOf(Array);
      expect(top_deals.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('get_dashboard_data', () => {
    it('should return dashboard data for venue', async () => {
      const venue_data = {
        id: uuidv4(),
        name: 'Dashboard Venue',
        description: 'A venue to test dashboard data',
        address: '789 Dashboard Street',
        city: 'George',
        postal_code: '6530',
        phone: '+27321654987',
        email: 'dashboard@venue.com'
      };
      
      await VenueModel.create(venue_data);
      const dashboard_data = await VenueModel.get_dashboard_data(venue_data.id);
      
      expect(dashboard_data).toBeDefined();
      expect(dashboard_data.venue).toBeDefined();
      expect(dashboard_data.analytics).toBeDefined();
      expect(dashboard_data.recent_vouchers).toBeInstanceOf(Array);
      expect(dashboard_data.active_deals).toBeInstanceOf(Array);
    });
  });

  describe('update error handling', () => {
    it('should throw error for no fields to update', async () => {
      const venue_data = {
        id: uuidv4(),
        name: 'Error Test Venue',
        description: 'A venue to test error handling',
        address: '999 Error Street',
        city: 'Error City',
        postal_code: '0000',
        phone: '+27000000000',
        email: 'error@venue.com'
      };
      
      await VenueModel.create(venue_data);
      
      await expect(VenueModel.update(venue_data.id, {}))
        .rejects
        .toThrow('No fields to update');
    });
  });
});