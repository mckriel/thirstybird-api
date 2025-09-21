import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import { UserModel } from '../models/user.js';
import { generate_token } from '../middleware/auth.js';
import email_service from './email_service.js';

export class AuthService {
  static async register_user(user_data) {
    const { email, password, first_name, last_name, phone, date_of_birth } = user_data;

    const existing_user = await UserModel.find_by_email(email);
    if (existing_user) {
      throw new Error('Email already registered');
    }

    const password_hash = await bcrypt.hash(password, 12);
    const user_id = uuidv4();

    const user = await UserModel.create({
      id: user_id,
      email,
      password_hash,
      first_name,
      last_name,
      phone,
      date_of_birth
    });

    const token = generate_token(user.id, user.role);

    // Send welcome email
    try {
      const user_name = `${user.first_name} ${user.last_name}`;
      await email_service.send_welcome_email(user.email, user_name);
      console.log('✅ Welcome email sent successfully');
    } catch (email_error) {
      console.error('❌ Failed to send welcome email:', email_error.message);
      // Don't fail registration if email fails
    }

    return {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role,
        created_at: user.created_at
      },
      token,
      email_status: 'Welcome email sent'
    };
  }

  static async login_user(email, password) {
    const user = await UserModel.find_by_email(email);
    if (!user) {
      throw new Error('Invalid credentials');
    }

    if (!user.is_active) {
      throw new Error('Account deactivated');
    }

    const password_valid = await bcrypt.compare(password, user.password_hash);
    if (!password_valid) {
      throw new Error('Invalid credentials');
    }

    const token = generate_token(user.id, user.role);

    return {
      user: {
        id: user.id,
        email: user.email,
        first_name: user.first_name,
        last_name: user.last_name,
        role: user.role
      },
      token
    };
  }

  static async get_user_profile(user_id) {
    const user = await UserModel.find_by_id(user_id);
    if (!user) {
      throw new Error('User not found');
    }

    const stats = await UserModel.get_user_stats(user_id);
    const recent_vouchers = await UserModel.get_recent_vouchers(user_id);

    return {
      user,
      stats,
      recent_vouchers
    };
  }

  static async update_user_profile(user_id, update_data) {
    const user = await UserModel.update(user_id, update_data);
    return user;
  }

  static async change_password(user_id, current_password, new_password) {
    const user = await UserModel.find_by_id(user_id);
    if (!user) {
      throw new Error('User not found');
    }

    const user_with_password = await UserModel.find_by_email(user.email);
    const current_password_valid = await bcrypt.compare(current_password, user_with_password.password_hash);

    if (!current_password_valid) {
      throw new Error('Current password is incorrect');
    }

    const new_password_hash = await bcrypt.hash(new_password, 12);
    await UserModel.update_password(user_id, new_password_hash);
  }

  static async delete_user_account(user_id, password) {
    const user = await UserModel.find_by_id(user_id);
    if (!user) {
      throw new Error('User not found');
    }

    const user_with_password = await UserModel.find_by_email(user.email);
    const password_valid = await bcrypt.compare(password, user_with_password.password_hash);

    if (!password_valid) {
      throw new Error('Password is incorrect');
    }

    const active_vouchers = await UserModel.check_active_vouchers(user_id);
    if (active_vouchers > 0) {
      throw new Error('Cannot delete account with active vouchers');
    }

    await UserModel.deactivate(user_id);
  }

  static async get_user_venues(user_id) {
    const venues = await UserModel.get_venues_for_user(user_id);
    return venues;
  }
}