import { db } from '../database/connection.js';

export class DealModel {
  static async find_all(filters = {}) {
    const { city, venue_id, search, min_savings, max_price, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        d.id, d.title, d.description, d.terms_and_conditions,
        d.original_price, d.deal_price, d.savings_amount, d.savings_percentage,
        d.deal_image_url, d.start_date, d.end_date, d.requires_age_verification,
        d.max_vouchers, d.max_per_customer, d.status,
        v.id as venue_id, v.name as venue_name, v.city as venue_city,
        v.logo_url as venue_logo, v.address as venue_address,
        COUNT(vou.id) as vouchers_sold,
        d.max_vouchers - COUNT(vou.id) as vouchers_remaining
      FROM deals d
      JOIN venues v ON v.id = d.venue_id
      LEFT JOIN vouchers vou ON vou.deal_id = d.id
      WHERE d.status = 'active' 
        AND d.start_date <= NOW() 
        AND d.end_date >= NOW()
        AND v.is_active = true
    `;
    const params = [];
    let param_count = 0;

    if (city) {
      param_count++;
      query += ` AND LOWER(v.city) = LOWER($${param_count})`;
      params.push(city);
    }

    if (venue_id) {
      param_count++;
      query += ` AND d.venue_id = $${param_count}`;
      params.push(venue_id);
    }

    if (search) {
      param_count++;
      query += ` AND (d.title ILIKE $${param_count} OR d.description ILIKE $${param_count} OR v.name ILIKE $${param_count})`;
      params.push(`%${search}%`);
    }

    if (min_savings) {
      param_count++;
      query += ` AND d.savings_percentage >= $${param_count}`;
      params.push(min_savings);
    }

    if (max_price) {
      param_count++;
      query += ` AND d.deal_price <= $${param_count}`;
      params.push(max_price);
    }

    query += `
      GROUP BY d.id, v.id
      ORDER BY d.created_at DESC
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
    const { city, venue_id, search, min_savings, max_price } = filters;

    let count_query = `
      SELECT COUNT(DISTINCT d.id)
      FROM deals d
      JOIN venues v ON v.id = d.venue_id
      WHERE d.status = 'active' 
        AND d.start_date <= NOW() 
        AND d.end_date >= NOW()
        AND v.is_active = true
    `;
    const count_params = [];
    let count_param_count = 0;

    if (city) {
      count_param_count++;
      count_query += ` AND LOWER(v.city) = LOWER($${count_param_count})`;
      count_params.push(city);
    }

    if (venue_id) {
      count_param_count++;
      count_query += ` AND d.venue_id = $${count_param_count}`;
      count_params.push(venue_id);
    }

    if (search) {
      count_param_count++;
      count_query += ` AND (d.title ILIKE $${count_param_count} OR d.description ILIKE $${count_param_count} OR v.name ILIKE $${count_param_count})`;
      count_params.push(`%${search}%`);
    }

    if (min_savings) {
      count_param_count++;
      count_query += ` AND d.savings_percentage >= $${count_param_count}`;
      count_params.push(min_savings);
    }

    if (max_price) {
      count_param_count++;
      count_query += ` AND d.deal_price <= $${count_param_count}`;
      count_params.push(max_price);
    }

    const count_result = await db.query(count_query, count_params);
    return parseInt(count_result.rows[0].count);
  }

  static async find_by_id(id) {
    const result = await db.query(`
      SELECT 
        d.*,
        v.name as venue_name, v.address as venue_address,
        v.city as venue_city, v.phone as venue_phone,
        v.logo_url as venue_logo, v.opening_hours as venue_hours,
        COUNT(vou.id) as vouchers_sold,
        d.max_vouchers - COUNT(vou.id) as vouchers_remaining
      FROM deals d
      JOIN venues v ON v.id = d.venue_id
      LEFT JOIN vouchers vou ON vou.deal_id = d.id
      WHERE d.id = $1
      GROUP BY d.id, v.id
    `, [id]);

    return result.rows[0];
  }

  static async find_by_venue_id(venue_id, status = null) {
    let query = `
      SELECT 
        d.*,
        COUNT(vou.id) as vouchers_sold,
        d.max_vouchers - COUNT(vou.id) as vouchers_remaining
      FROM deals d
      LEFT JOIN vouchers vou ON vou.deal_id = d.id
      WHERE d.venue_id = $1
    `;
    const params = [venue_id];

    if (status) {
      params.push(status);
      query += ` AND d.status = $${params.length}`;
    }

    query += `
      GROUP BY d.id
      ORDER BY d.created_at DESC
    `;

    const result = await db.query(query, params);
    return result.rows;
  }

  static async create(deal_data) {
    const {
      id, venue_id, title, description, terms_and_conditions,
      original_price, deal_price, max_vouchers, max_per_customer,
      deal_image_url, start_date, end_date, requires_age_verification
    } = deal_data;

    const result = await db.query(`
      INSERT INTO deals (
        id, venue_id, title, description, terms_and_conditions,
        original_price, deal_price, max_vouchers, max_per_customer,
        deal_image_url, start_date, end_date, requires_age_verification, status
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
      RETURNING *
    `, [
      id, venue_id, title, description, terms_and_conditions,
      original_price, deal_price, max_vouchers, max_per_customer,
      deal_image_url, start_date, end_date, requires_age_verification, 'draft'
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

    const result = await db.query(`
      UPDATE deals 
      SET ${update_fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${param_count}
      RETURNING *
    `, params);

    return result.rows[0];
  }

  static async delete(id) {
    await db.query(`
      UPDATE deals 
      SET status = 'ended', updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);
  }

  static async check_availability(deal_id, quantity) {
    const result = await db.query(`
      SELECT 
        d.status, d.start_date, d.end_date, d.max_vouchers,
        COUNT(v.id) as vouchers_sold,
        d.max_vouchers - COUNT(v.id) as vouchers_remaining
      FROM deals d
      LEFT JOIN vouchers v ON v.deal_id = d.id
      WHERE d.id = $1
      GROUP BY d.id
    `, [deal_id]);

    const deal = result.rows[0];
    if (!deal) return { available: false, reason: 'Deal not found' };
    
    if (deal.status !== 'active') {
      return { available: false, reason: 'Deal not active' };
    }

    const now = new Date();
    if (now < new Date(deal.start_date) || now > new Date(deal.end_date)) {
      return { available: false, reason: 'Deal not available' };
    }

    if (deal.vouchers_remaining < quantity) {
      return { available: false, reason: `Only ${deal.vouchers_remaining} vouchers remaining` };
    }

    return { available: true, vouchers_remaining: deal.vouchers_remaining };
  }

  static async get_analytics(deal_id, period_days = 30) {
    const result = await db.query(`
      SELECT 
        COUNT(v.id) as total_vouchers,
        COUNT(CASE WHEN v.status = 'active' THEN 1 END) as active_vouchers,
        COUNT(CASE WHEN v.status = 'redeemed' THEN 1 END) as redeemed_vouchers,
        COALESCE(SUM(v.purchase_price), 0) as total_revenue,
        COUNT(DISTINCT v.user_id) as unique_customers
      FROM vouchers v
      WHERE v.deal_id = $1 
        AND v.created_at >= NOW() - INTERVAL '${period_days} days'
    `, [deal_id]);

    return result.rows[0];
  }
}