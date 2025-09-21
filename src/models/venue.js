import { db } from '../database/connection.js';

export class VenueModel {
  static async find_all(filters = {}) {
    const { city, search, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        v.id, v.name, v.description, v.address, v.city, v.postal_code,
        v.latitude, v.longitude, v.phone, v.email, v.website,
        v.logo_url, v.cover_image_url, v.opening_hours, v.requires_age_verification,
        COUNT(d.id) as active_deals_count
      FROM venues v
      LEFT JOIN deals d ON d.venue_id = v.id AND d.status = 'active' AND d.start_date <= NOW() AND d.end_date >= NOW()
      WHERE v.is_active = true
    `;
    const params = [];
    let param_count = 0;

    if (city) {
      param_count++;
      query += ` AND LOWER(v.city) = LOWER($${param_count})`;
      params.push(city);
    }

    if (search) {
      param_count++;
      query += ` AND (v.name ILIKE $${param_count} OR v.description ILIKE $${param_count})`;
      params.push(`%${search}%`);
    }

    query += `
      GROUP BY v.id, v.name, v.description, v.address, v.city, v.postal_code,
               v.latitude, v.longitude, v.phone, v.email, v.website,
               v.logo_url, v.cover_image_url, v.opening_hours, v.requires_age_verification
      ORDER BY v.name
    `;

    param_count++;
    query += ` LIMIT $${param_count}`;
    params.push(limit);

    param_count++;
    query += ` OFFSET $${param_count}`;
    params.push(offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  static async count_all(filters = {}) {
    const { city, search } = filters;

    let count_query = `
      SELECT COUNT(*) 
      FROM venues v 
      WHERE v.is_active = true
    `;
    const count_params = [];
    let count_param_count = 0;

    if (city) {
      count_param_count++;
      count_query += ` AND LOWER(v.city) = LOWER($${count_param_count})`;
      count_params.push(city);
    }

    if (search) {
      count_param_count++;
      count_query += ` AND (v.name ILIKE $${count_param_count} OR v.description ILIKE $${count_param_count})`;
      count_params.push(`%${search}%`);
    }

    const count_result = await db.query(count_query, count_params);
    return parseInt(count_result.rows[0].count);
  }

  static async find_by_id(id) {
    const result = await db.query(`
      SELECT 
        v.*,
        COUNT(d.id) as total_deals_count,
        COUNT(CASE WHEN d.status = 'active' AND d.start_date <= NOW() AND d.end_date >= NOW() THEN 1 END) as active_deals_count
      FROM venues v
      LEFT JOIN deals d ON d.venue_id = v.id
      WHERE v.id = $1 AND v.is_active = true
      GROUP BY v.id
    `, [id]);

    return result.rows[0];
  }

  static async get_active_deals(venue_id) {
    const result = await db.query(`
      SELECT 
        id, title, description, original_price, deal_price, 
        savings_amount, savings_percentage, deal_image_url,
        start_date, end_date, requires_age_verification
      FROM deals
      WHERE venue_id = $1 AND status = 'active' AND start_date <= NOW() AND end_date >= NOW()
      ORDER BY created_at DESC
    `, [venue_id]);

    return result.rows;
  }

  static async create(venue_data) {
    const {
      id, name, description, address, city, postal_code,
      latitude, longitude, phone, email, website,
      logo_url, cover_image_url, opening_hours, requires_age_verification
    } = venue_data;

    const result = await db.query(`
      INSERT INTO venues (
        id, name, description, address, city, postal_code,
        latitude, longitude, phone, email, website,
        logo_url, cover_image_url, opening_hours, requires_age_verification
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
      RETURNING *
    `, [
      id, name, description, address, city, postal_code,
      latitude, longitude, phone, email, website,
      logo_url, cover_image_url, opening_hours, requires_age_verification
    ]);

    return result.rows[0];
  }

  static async update(id, update_data) {
    const update_fields = [];
    const params = [];
    let param_count = 0;

    for (const [key, val] of Object.entries(update_data)) {
      if (val !== undefined) {
        param_count++;
        update_fields.push(`${key} = $${param_count}`);
        params.push(val);
      }
    }

    if (update_fields.length === 0) {
      throw new Error('No fields to update');
    }

    param_count++;
    params.push(id);
    param_count++;
    params.push(new Date());

    const result = await db.query(`
      UPDATE venues 
      SET ${update_fields.join(', ')}, updated_at = $${param_count}
      WHERE id = $${param_count - 1}
      RETURNING *
    `, params);

    return result.rows[0];
  }

  static async create_venue_profile(user_id, venue_id, permissions, is_primary_contact = true) {
    await db.query(`
      INSERT INTO venue_profiles (user_id, venue_id, permissions, is_primary_contact)
      VALUES ($1, $2, $3, $4)
    `, [user_id, venue_id, JSON.stringify(permissions), is_primary_contact]);
  }

  static async get_venue_analytics(venue_id, period_days = 30) {
    const result = await db.query(`
      SELECT 
        COUNT(DISTINCT v.id) as total_vouchers,
        COUNT(CASE WHEN v.status = 'active' THEN 1 END) as active_vouchers,
        COUNT(CASE WHEN v.status = 'redeemed' THEN 1 END) as redeemed_vouchers,
        COALESCE(SUM(v.purchase_price), 0) as total_revenue,
        COUNT(DISTINCT v.user_id) as unique_customers,
        COUNT(DISTINCT d.id) as total_deals
      FROM vouchers v
      JOIN deals d ON d.id = v.deal_id
      WHERE v.venue_id = $1 
        AND v.created_at >= NOW() - INTERVAL '${period_days} days'
    `, [venue_id]);

    return result.rows[0];
  }

  static async get_top_deals(venue_id, period_days = 30) {
    const result = await db.query(`
      SELECT 
        d.id, d.title, 
        COUNT(v.id) as voucher_count,
        SUM(v.purchase_price) as revenue
      FROM deals d
      LEFT JOIN vouchers v ON v.deal_id = d.id AND v.created_at >= NOW() - INTERVAL '${period_days} days'
      WHERE d.venue_id = $1
      GROUP BY d.id, d.title
      ORDER BY voucher_count DESC
      LIMIT 5
    `, [venue_id]);

    return result.rows;
  }

  static async get_dashboard_data(venue_id) {
    const venue_info = await db.query(`
      SELECT v.name, v.description, v.city, v.logo_url
      FROM venues v
      WHERE v.id = $1
    `, [venue_id]);

    const analytics = await this.get_venue_analytics(venue_id, 30);

    const recent_vouchers = await db.query(`
      SELECT 
        v.id, v.voucher_code, v.status, v.purchase_price, v.created_at, v.redeemed_at,
        d.title as deal_title,
        u.first_name, u.last_name, u.email
      FROM vouchers v
      JOIN deals d ON d.id = v.deal_id
      JOIN users u ON u.id = v.user_id
      WHERE v.venue_id = $1
      ORDER BY v.created_at DESC
      LIMIT 20
    `, [venue_id]);

    const active_deals = await db.query(`
      SELECT 
        d.id, d.title, d.status, d.original_price, d.deal_price,
        d.start_date, d.end_date, d.max_vouchers,
        COUNT(v.id) as vouchers_sold,
        d.max_vouchers - COUNT(v.id) as vouchers_remaining
      FROM deals d
      LEFT JOIN vouchers v ON v.deal_id = d.id
      WHERE d.venue_id = $1
      GROUP BY d.id
      ORDER BY d.created_at DESC
    `, [venue_id]);

    return {
      venue: venue_info.rows[0],
      analytics,
      recent_vouchers: recent_vouchers.rows,
      active_deals: active_deals.rows
    };
  }
}