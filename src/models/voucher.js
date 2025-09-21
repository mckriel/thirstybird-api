import { db } from '../database/connection.js';

export class VoucherModel {
  static async find_by_user(user_id, filters = {}) {
    const { status, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        v.id, v.voucher_code, v.status, v.quantity, v.purchase_price,
        v.redeemed_at, v.expires_at, v.created_at,
        d.id as deal_id, d.title as deal_title, d.description as deal_description,
        d.original_price, d.deal_price, d.deal_image_url, d.terms_and_conditions,
        ven.id as venue_id, ven.name as venue_name, ven.address as venue_address,
        ven.phone as venue_phone, ven.logo_url as venue_logo
      FROM vouchers v
      JOIN deals d ON d.id = v.deal_id
      JOIN venues ven ON ven.id = v.venue_id
      WHERE v.user_id = $1
    `;
    const params = [user_id];
    let param_count = 1;

    if (status) {
      param_count++;
      query += ` AND v.status = $${param_count}`;
      params.push(status);
    }

    query += ` ORDER BY v.created_at DESC`;

    param_count++;
    query += ` LIMIT $${param_count}`;
    params.push(limit);

    param_count++;
    query += ` OFFSET $${param_count}`;
    params.push(offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  static async count_by_user(user_id, status = null) {
    let query = `SELECT COUNT(*) FROM vouchers WHERE user_id = $1`;
    const params = [user_id];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    const result = await db.query(query, params);
    return parseInt(result.rows[0].count);
  }

  static async find_by_id(id, user_id = null) {
    let query = `
      SELECT 
        v.*,
        d.title as deal_title, d.description as deal_description,
        d.original_price, d.deal_price, d.terms_and_conditions,
        d.deal_image_url, d.requires_age_verification as deal_requires_age_verification,
        ven.name as venue_name, ven.address as venue_address,
        ven.phone as venue_phone, ven.opening_hours as venue_hours,
        ven.logo_url as venue_logo, ven.cover_image_url as venue_cover
      FROM vouchers v
      JOIN deals d ON d.id = v.deal_id
      JOIN venues ven ON ven.id = v.venue_id
      WHERE v.id = $1
    `;
    const params = [id];

    if (user_id) {
      params.push(user_id);
      query += ` AND v.user_id = $${params.length}`;
    }

    const result = await db.query(query, params);
    return result.rows[0];
  }

  static async find_by_code(voucher_code) {
    const result = await db.query(`
      SELECT 
        v.*,
        d.title as deal_title, d.terms_and_conditions,
        u.first_name, u.last_name, u.email,
        ven.name as venue_name
      FROM vouchers v
      JOIN deals d ON d.id = v.deal_id
      JOIN users u ON u.id = v.user_id
      JOIN venues ven ON ven.id = v.venue_id
      WHERE v.voucher_code = $1
    `, [voucher_code]);

    return result.rows[0];
  }

  static async create(voucher_data) {
    const {
      id, user_id, deal_id, venue_id, voucher_code,
      qr_code_data, purchase_price, quantity = 1, expires_at
    } = voucher_data;

    const result = await db.query(`
      INSERT INTO vouchers (
        id, user_id, deal_id, venue_id, voucher_code, 
        qr_code_data, purchase_price, quantity, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING *
    `, [id, user_id, deal_id, venue_id, voucher_code, qr_code_data, purchase_price, quantity, expires_at]);

    return result.rows[0];
  }

  static async create_multiple(vouchers_data) {
    const vouchers = [];
    
    for (const voucher_data of vouchers_data) {
      const voucher = await this.create(voucher_data);
      vouchers.push(voucher);
    }
    
    return vouchers;
  }

  static async update_status(id, status, redeemed_by = null) {
    let query = `
      UPDATE vouchers 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
    `;
    const params = [status, id];

    if (status === 'redeemed' && redeemed_by) {
      query += `, redeemed_at = CURRENT_TIMESTAMP, redeemed_by = $3`;
      params.splice(2, 0, redeemed_by); // Insert at position 2
    }

    query += ` WHERE id = $${params.length} RETURNING *`;

    const result = await db.query(query, params);
    return result.rows[0];
  }

  static async get_qr_data(id, user_id = null) {
    let query = `
      SELECT v.qr_code_data, v.voucher_code, v.status
      FROM vouchers v
      WHERE v.id = $1
    `;
    const params = [id];

    if (user_id) {
      params.push(user_id);
      query += ` AND v.user_id = $${params.length}`;
    }

    const result = await db.query(query, params);
    return result.rows[0];
  }

  static async check_user_purchase_limit(user_id, deal_id) {
    const result = await db.query(`
      SELECT COUNT(*) as user_voucher_count
      FROM vouchers
      WHERE user_id = $1 AND deal_id = $2
    `, [user_id, deal_id]);

    return parseInt(result.rows[0].user_voucher_count);
  }

  static async get_expiring_vouchers(days_ahead = 7) {
    const result = await db.query(`
      SELECT 
        v.id, v.voucher_code, v.expires_at,
        u.email, u.first_name, u.last_name,
        d.title as deal_title,
        ven.name as venue_name
      FROM vouchers v
      JOIN users u ON u.id = v.user_id
      JOIN deals d ON d.id = v.deal_id
      JOIN venues ven ON ven.id = v.venue_id
      WHERE v.status = 'active'
        AND v.expires_at <= NOW() + INTERVAL '${days_ahead} days'
        AND v.expires_at > NOW()
      ORDER BY v.expires_at
    `);

    return result.rows;
  }

  static async expire_old_vouchers() {
    const result = await db.query(`
      UPDATE vouchers 
      SET status = 'expired', updated_at = CURRENT_TIMESTAMP
      WHERE status = 'active' 
        AND expires_at <= NOW()
      RETURNING id, voucher_code
    `);

    return result.rows;
  }

  static async get_venue_vouchers(venue_id, filters = {}) {
    const { status, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        v.id, v.voucher_code, v.status, v.purchase_price, 
        v.created_at, v.redeemed_at, v.expires_at,
        d.title as deal_title,
        u.first_name, u.last_name, u.email
      FROM vouchers v
      JOIN deals d ON d.id = v.deal_id
      JOIN users u ON u.id = v.user_id
      WHERE v.venue_id = $1
    `;
    const params = [venue_id];
    let param_count = 1;

    if (status) {
      param_count++;
      query += ` AND v.status = $${param_count}`;
      params.push(status);
    }

    query += ` ORDER BY v.created_at DESC`;

    param_count++;
    query += ` LIMIT $${param_count}`;
    params.push(limit);

    param_count++;
    query += ` OFFSET $${param_count}`;
    params.push(offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  static async get_analytics(venue_id = null, period_days = 30) {
    let query = `
      SELECT 
        COUNT(v.id) as total_vouchers,
        COUNT(CASE WHEN v.status = 'active' THEN 1 END) as active_vouchers,
        COUNT(CASE WHEN v.status = 'redeemed' THEN 1 END) as redeemed_vouchers,
        COUNT(CASE WHEN v.status = 'expired' THEN 1 END) as expired_vouchers,
        COALESCE(SUM(v.purchase_price), 0) as total_revenue,
        COUNT(DISTINCT v.user_id) as unique_customers
      FROM vouchers v
      WHERE v.created_at >= NOW() - INTERVAL '${period_days} days'
    `;
    const params = [];

    if (venue_id) {
      params.push(venue_id);
      query += ` AND v.venue_id = $${params.length}`;
    }

    const result = await db.query(query, params);
    return result.rows[0];
  }
}