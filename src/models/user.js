import { db } from '../database/connection.js';

export class UserModel {
  static async create(user_data) {
    const { id, email, password_hash, first_name, last_name, phone, date_of_birth } = user_data;
    
    const result = await db.query(`
      INSERT INTO users (id, email, password_hash, first_name, last_name, phone, date_of_birth)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING id, email, first_name, last_name, role, created_at
    `, [id, email, password_hash, first_name, last_name, phone, date_of_birth]);

    return result.rows[0];
  }

  static async find_by_email(email) {
    const result = await db.query(`
      SELECT id, email, password_hash, first_name, last_name, role, is_active
      FROM users
      WHERE email = $1
    `, [email]);

    return result.rows[0];
  }

  static async find_by_id(id) {
    const result = await db.query(`
      SELECT 
        id, email, first_name, last_name, phone, date_of_birth,
        role, email_verified, phone_verified, created_at, updated_at
      FROM users
      WHERE id = $1
    `, [id]);

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
      UPDATE users 
      SET ${update_fields.join(', ')}, updated_at = $${param_count}
      WHERE id = $${param_count - 1}
      RETURNING id, email, first_name, last_name, phone, date_of_birth, role, updated_at
    `, params);

    return result.rows[0];
  }

  static async update_password(id, password_hash) {
    await db.query(`
      UPDATE users
      SET password_hash = $1, updated_at = CURRENT_TIMESTAMP
      WHERE id = $2
    `, [password_hash, id]);
  }

  static async deactivate(id) {
    await db.query(`
      UPDATE users
      SET is_active = false, email = CONCAT('deleted_', id, '@deleted.thirstybird.co.za'), updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
    `, [id]);
  }

  static async get_user_stats(user_id) {
    const result = await db.query(`
      SELECT 
        COUNT(v.id) as total_vouchers,
        COUNT(CASE WHEN v.status = 'active' THEN 1 END) as active_vouchers,
        COUNT(CASE WHEN v.status = 'redeemed' THEN 1 END) as redeemed_vouchers,
        COALESCE(SUM(v.purchase_price), 0) as total_spent
      FROM vouchers v
      WHERE v.user_id = $1
    `, [user_id]);

    return result.rows[0];
  }

  static async get_recent_vouchers(user_id, limit = 5) {
    const result = await db.query(`
      SELECT 
        v.id, v.voucher_code, v.status, v.purchase_price, v.created_at,
        d.title as deal_title, ven.name as venue_name
      FROM vouchers v
      JOIN deals d ON d.id = v.deal_id
      JOIN venues ven ON ven.id = v.venue_id
      WHERE v.user_id = $1
      ORDER BY v.created_at DESC
      LIMIT $2
    `, [user_id, limit]);

    return result.rows;
  }

  static async check_active_vouchers(user_id) {
    const result = await db.query(`
      SELECT COUNT(*) as active_vouchers
      FROM vouchers
      WHERE user_id = $1 AND status = 'active'
    `, [user_id]);

    return parseInt(result.rows[0].active_vouchers);
  }

  static async get_venues_for_user(user_id) {
    const result = await db.query(`
      SELECT 
        v.id, v.name, v.description, v.city, v.is_active,
        v.logo_url, v.created_at,
        vp.permissions, vp.is_primary_contact,
        COUNT(d.id) as total_deals,
        COUNT(CASE WHEN d.status = 'active' THEN 1 END) as active_deals
      FROM venue_profiles vp
      JOIN venues v ON v.id = vp.venue_id
      LEFT JOIN deals d ON d.venue_id = v.id
      WHERE vp.user_id = $1
      GROUP BY v.id, v.name, v.description, v.city, v.is_active, 
               v.logo_url, v.created_at, vp.permissions, vp.is_primary_contact
      ORDER BY v.name
    `, [user_id]);

    return result.rows;
  }
}