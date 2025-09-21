import { v4 as uuidv4 } from 'uuid';
import { DealModel } from '../models/deal.js';
import { VenueModel } from '../models/venue.js';

export class DealService {
  static async get_deals(filters = {}) {
    const deals = await DealModel.find_all(filters);
    const total = await DealModel.count_all(filters);
    
    const page = parseInt(filters.page || 1);
    const limit = parseInt(filters.limit || 20);
    
    return {
      deals,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async get_deal_by_id(deal_id) {
    const deal = await DealModel.find_by_id(deal_id);
    if (!deal) {
      throw new Error('Deal not found');
    }
    return deal;
  }

  static async get_deals_by_venue(venue_id, status = null) {
    // Verify venue exists
    const venue = await VenueModel.find_by_id(venue_id);
    if (!venue) {
      throw new Error('Venue not found');
    }

    return await DealModel.find_by_venue_id(venue_id, status);
  }

  static async create_deal(user_id, deal_data) {
    const {
      venue_id, title, description, terms_and_conditions,
      original_price, deal_price, max_vouchers, max_per_customer,
      deal_image_url, start_date, end_date, requires_age_verification
    } = deal_data;

    // Verify venue exists and user has access
    const venue = await VenueModel.find_by_id(venue_id);
    if (!venue) {
      throw new Error('Venue not found');
    }

    // Validate deal data
    if (original_price <= 0 || deal_price <= 0) {
      throw new Error('Prices must be greater than zero');
    }

    if (deal_price >= original_price) {
      throw new Error('Deal price must be less than original price');
    }

    if (new Date(start_date) >= new Date(end_date)) {
      throw new Error('Start date must be before end date');
    }

    if (new Date(start_date) < new Date()) {
      throw new Error('Start date cannot be in the past');
    }

    if (max_vouchers <= 0 || max_per_customer <= 0) {
      throw new Error('Max vouchers and max per customer must be greater than zero');
    }

    const deal_id = uuidv4();
    
    const deal = await DealModel.create({
      id: deal_id,
      venue_id,
      title,
      description,
      terms_and_conditions,
      original_price,
      deal_price,
      max_vouchers,
      max_per_customer,
      deal_image_url,
      start_date,
      end_date,
      requires_age_verification
    });

    return deal;
  }

  static async update_deal(deal_id, user_id, update_data) {
    const existing_deal = await DealModel.find_by_id(deal_id);
    if (!existing_deal) {
      throw new Error('Deal not found');
    }

    // Validate update data if prices are being changed
    if (update_data.original_price && update_data.original_price <= 0) {
      throw new Error('Original price must be greater than zero');
    }

    if (update_data.deal_price && update_data.deal_price <= 0) {
      throw new Error('Deal price must be greater than zero');
    }

    if (update_data.original_price && update_data.deal_price) {
      if (update_data.deal_price >= update_data.original_price) {
        throw new Error('Deal price must be less than original price');
      }
    }

    // Validate dates if being changed
    if (update_data.start_date && update_data.end_date) {
      if (new Date(update_data.start_date) >= new Date(update_data.end_date)) {
        throw new Error('Start date must be before end date');
      }
    }

    const updated_deal = await DealModel.update(deal_id, update_data);
    return updated_deal;
  }

  static async activate_deal(deal_id, user_id) {
    const deal = await DealModel.find_by_id(deal_id);
    if (!deal) {
      throw new Error('Deal not found');
    }

    if (deal.status !== 'draft') {
      throw new Error('Only draft deals can be activated');
    }

    // Validate deal is ready for activation
    const now = new Date();
    if (new Date(deal.end_date) <= now) {
      throw new Error('Cannot activate deal that has already ended');
    }

    return await DealModel.update(deal_id, { status: 'active' });
  }

  static async pause_deal(deal_id, user_id) {
    const deal = await DealModel.find_by_id(deal_id);
    if (!deal) {
      throw new Error('Deal not found');
    }

    if (deal.status !== 'active') {
      throw new Error('Only active deals can be paused');
    }

    return await DealModel.update(deal_id, { status: 'paused' });
  }

  static async end_deal(deal_id, user_id) {
    const deal = await DealModel.find_by_id(deal_id);
    if (!deal) {
      throw new Error('Deal not found');
    }

    if (!['active', 'paused'].includes(deal.status)) {
      throw new Error('Only active or paused deals can be ended');
    }

    await DealModel.delete(deal_id);
    return { message: 'Deal ended successfully' };
  }

  static async check_deal_availability(deal_id, quantity = 1) {
    const deal = await DealModel.find_by_id(deal_id);
    if (!deal) {
      throw new Error('Deal not found');
    }

    return await DealModel.check_availability(deal_id, quantity);
  }

  static async get_deal_analytics(deal_id, period_days = 30) {
    const deal = await DealModel.find_by_id(deal_id);
    if (!deal) {
      throw new Error('Deal not found');
    }

    const analytics = await DealModel.get_analytics(deal_id, period_days);
    
    return {
      deal_info: {
        id: deal.id,
        title: deal.title,
        venue_name: deal.venue_name,
        status: deal.status
      },
      analytics,
      period_days
    };
  }

  static async search_deals(search_params) {
    const {
      query,
      city,
      min_savings,
      max_price,
      category,
      page = 1,
      limit = 20
    } = search_params;

    const filters = {
      search: query,
      city,
      min_savings,
      max_price,
      page,
      limit
    };

    return await this.get_deals(filters);
  }

  static async get_trending_deals(limit = 10) {
    // Get deals with high voucher sales in the last 7 days
    const deals = await DealModel.find_all({ limit: 50 }); // Get more to analyze
    
    // Sort by vouchers_sold and return top deals
    const trending = deals
      .filter(deal => deal.vouchers_sold > 0)
      .sort((a, b) => b.vouchers_sold - a.vouchers_sold)
      .slice(0, limit);

    return trending;
  }

  static async get_expiring_deals(days_ahead = 7) {
    const all_deals = await DealModel.find_all({ limit: 1000 });
    
    const expiring = all_deals.filter(deal => {
      const days_until_expiry = Math.ceil((new Date(deal.end_date) - new Date()) / (1000 * 60 * 60 * 24));
      return days_until_expiry <= days_ahead && days_until_expiry > 0;
    });

    return expiring.sort((a, b) => new Date(a.end_date) - new Date(b.end_date));
  }
}