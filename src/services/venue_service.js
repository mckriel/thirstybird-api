import { v4 as uuidv4 } from 'uuid';
import { VenueModel } from '../models/venue.js';

export class VenueService {
  static async get_venues(filters) {
    const venues = await VenueModel.find_all(filters);
    const total = await VenueModel.count_all(filters);
    
    const { page = 1, limit = 20 } = filters;

    return {
      venues,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async get_venue_details(venue_id) {
    const venue = await VenueModel.find_by_id(venue_id);
    if (!venue) {
      throw new Error('Venue not found');
    }

    const active_deals = await VenueModel.get_active_deals(venue_id);

    return {
      venue,
      active_deals
    };
  }

  static async create_venue(user_id, venue_data) {
    const venue_id = uuidv4();
    const venue = await VenueModel.create({
      id: venue_id,
      ...venue_data
    });

    await VenueModel.create_venue_profile(
      user_id,
      venue_id,
      ['manage_deals', 'view_analytics', 'redeem_vouchers', 'manage_venue'],
      true
    );

    return venue;
  }

  static async update_venue(venue_id, update_data) {
    const venue = await VenueModel.update(venue_id, update_data);
    if (!venue) {
      throw new Error('Venue not found');
    }

    return venue;
  }

  static async get_venue_analytics(venue_id, period = '30') {
    const period_days = parseInt(period);
    const analytics = await VenueModel.get_venue_analytics(venue_id, period_days);
    const top_deals = await VenueModel.get_top_deals(venue_id, period_days);

    return {
      analytics,
      top_deals,
      period_days
    };
  }

  static async get_venue_dashboard(venue_id) {
    const dashboard_data = await VenueModel.get_dashboard_data(venue_id);
    return dashboard_data;
  }
}