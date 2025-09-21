import { db } from '../database/connection.js';

export class PaymentModel {
  static async create(payment_data) {
    const {
      id, user_id, deal_id, venue_id, payment_method = 'payfast',
      amount, currency = 'ZAR', external_payment_id, payment_data: extra_data,
      voucher_ids
    } = payment_data;

    const result = await db.query(`
      INSERT INTO payments (
        id, user_id, deal_id, venue_id, payment_method,
        amount, currency, external_payment_id, payment_data,
        voucher_ids, status, processed_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `, [
      id, user_id, deal_id, venue_id, payment_method,
      amount, currency, external_payment_id, extra_data,
      voucher_ids, 'pending', new Date()
    ]);

    return result.rows[0];
  }

  static async find_by_id(id, user_id = null) {
    let query = `
      SELECT 
        p.*,
        d.title as deal_title,
        v.name as venue_name,
        u.email as user_email, u.first_name, u.last_name
      FROM payments p
      JOIN deals d ON d.id = p.deal_id
      JOIN venues v ON v.id = p.venue_id
      JOIN users u ON u.id = p.user_id
      WHERE p.id = $1
    `;
    const params = [id];

    if (user_id) {
      params.push(user_id);
      query += ` AND p.user_id = $${params.length}`;
    }

    const result = await db.query(query, params);
    return result.rows[0];
  }

  static async find_by_external_id(external_payment_id) {
    const result = await db.query(`
      SELECT 
        p.*,
        d.title as deal_title,
        v.name as venue_name,
        u.email as user_email, u.first_name, u.last_name
      FROM payments p
      JOIN deals d ON d.id = p.deal_id
      JOIN venues v ON v.id = p.venue_id
      JOIN users u ON u.id = p.user_id
      WHERE p.external_payment_id = $1
    `, [external_payment_id]);

    return result.rows[0];
  }

  static async find_by_user(user_id, filters = {}) {
    const { status, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        p.id, p.amount, p.currency, p.status, p.payment_method,
        p.created_at, p.processed_at,
        d.title as deal_title,
        v.name as venue_name
      FROM payments p
      JOIN deals d ON d.id = p.deal_id
      JOIN venues v ON v.id = p.venue_id
      WHERE p.user_id = $1
    `;
    const params = [user_id];
    let param_count = 1;

    if (status) {
      param_count++;
      query += ` AND p.status = $${param_count}`;
      params.push(status);
    }

    query += ` ORDER BY p.created_at DESC`;

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
    let query = `SELECT COUNT(*) FROM payments WHERE user_id = $1`;
    const params = [user_id];

    if (status) {
      params.push(status);
      query += ` AND status = $${params.length}`;
    }

    const result = await db.query(query, params);
    return parseInt(result.rows[0].count);
  }

  static async update_status(id, status, payment_data = null) {
    let query = `
      UPDATE payments 
      SET status = $1, updated_at = CURRENT_TIMESTAMP
    `;
    let params = [status];

    if (status === 'completed') {
      query += `, processed_at = CURRENT_TIMESTAMP`;
    }

    if (payment_data) {
      params.push(payment_data);
      query += `, payment_data = $${params.length}`;
    }

    params.push(id);
    query += ` WHERE id = $${params.length} RETURNING *`;

    const result = await db.query(query, params);
    return result.rows[0];
  }

  static async get_venue_payments(venue_id, filters = {}) {
    const { status, page = 1, limit = 20 } = filters;
    const offset = (page - 1) * limit;

    let query = `
      SELECT 
        p.id, p.amount, p.currency, p.status, p.payment_method,
        p.created_at, p.processed_at,
        d.title as deal_title,
        u.first_name, u.last_name, u.email,
        array_length(p.voucher_ids, 1) as voucher_count
      FROM payments p
      JOIN deals d ON d.id = p.deal_id
      JOIN users u ON u.id = p.user_id
      WHERE p.venue_id = $1
    `;
    const params = [venue_id];
    let param_count = 1;

    if (status) {
      param_count++;
      query += ` AND p.status = $${param_count}`;
      params.push(status);
    }

    query += ` ORDER BY p.created_at DESC`;

    param_count++;
    query += ` LIMIT $${param_count}`;
    params.push(limit);

    param_count++;
    query += ` OFFSET $${param_count}`;
    params.push(offset);

    const result = await db.query(query, params);
    return result.rows;
  }

  static async get_failed_payments(hours_ago = 24) {
    const result = await db.query(`
      SELECT 
        p.*,
        u.email, u.first_name, u.last_name,
        d.title as deal_title
      FROM payments p
      JOIN users u ON u.id = p.user_id
      JOIN deals d ON d.id = p.deal_id
      WHERE p.status = 'failed'
        AND p.created_at >= NOW() - INTERVAL '${hours_ago} hours'
      ORDER BY p.created_at DESC
    `);

    return result.rows;
  }

  static async get_pending_payments(hours_ago = 2) {
    const result = await db.query(`
      SELECT 
        p.*,
        u.email, u.first_name, u.last_name,
        d.title as deal_title
      FROM payments p
      JOIN users u ON u.id = p.user_id
      JOIN deals d ON d.id = p.deal_id
      WHERE p.status = 'pending'
        AND p.created_at <= NOW() - INTERVAL '${hours_ago} hours'
      ORDER BY p.created_at DESC
    `);

    return result.rows;
  }

  static async get_analytics(venue_id = null, period_days = 30) {
    let query = `
      SELECT 
        COUNT(p.id) as total_payments,
        COUNT(CASE WHEN p.status = 'completed' THEN 1 END) as completed_payments,
        COUNT(CASE WHEN p.status = 'pending' THEN 1 END) as pending_payments,
        COUNT(CASE WHEN p.status = 'failed' THEN 1 END) as failed_payments,
        COALESCE(SUM(CASE WHEN p.status = 'completed' THEN p.amount ELSE 0 END), 0) as total_revenue,
        COALESCE(AVG(CASE WHEN p.status = 'completed' THEN p.amount ELSE NULL END), 0) as average_payment,
        COUNT(DISTINCT p.user_id) as unique_customers
      FROM payments p
      WHERE p.created_at >= NOW() - INTERVAL '${period_days} days'
    `;
    const params = [];

    if (venue_id) {
      params.push(venue_id);
      query += ` AND p.venue_id = $${params.length}`;
    }

    const result = await db.query(query, params);
    return result.rows[0];
  }

  static async get_daily_revenue(venue_id = null, days = 30) {
    let query = `
      SELECT 
        DATE(p.created_at) as payment_date,
        COUNT(p.id) as payment_count,
        COALESCE(SUM(p.amount), 0) as daily_revenue
      FROM payments p
      WHERE p.status = 'completed'
        AND p.created_at >= NOW() - INTERVAL '${days} days'
    `;
    const params = [];

    if (venue_id) {
      params.push(venue_id);
      query += ` AND p.venue_id = $${params.length}`;
    }

    query += `
      GROUP BY DATE(p.created_at)
      ORDER BY payment_date DESC
    `;

    const result = await db.query(query, params);
    return result.rows;
  }

  static async refund(payment_id, refund_reason = null) {
    await db.query('BEGIN');

    try {
      // Update payment status
      const payment_result = await db.query(`
        UPDATE payments 
        SET status = 'refunded', 
            payment_data = COALESCE(payment_data, '{}')::jsonb || $2::jsonb,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = $1 AND status = 'completed'
        RETURNING *
      `, [payment_id, JSON.stringify({ refund_reason, refunded_at: new Date() })]);

      if (payment_result.rows.length === 0) {
        throw new Error('Payment not found or not eligible for refund');
      }

      const payment = payment_result.rows[0];

      // Update associated vouchers to refunded status
      if (payment.voucher_ids && payment.voucher_ids.length > 0) {
        await db.query(`
          UPDATE vouchers 
          SET status = 'refunded', updated_at = CURRENT_TIMESTAMP
          WHERE id = ANY($1::uuid[])
        `, [payment.voucher_ids]);
      }

      await db.query('COMMIT');
      return payment;
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
  }
}