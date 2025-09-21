import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { UserModel } from '../../../src/models/user.js';
import { create_user_factory, create_admin_user_factory } from '../../helpers/factories.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

describe('UserModel', () => {
  beforeEach(async () => {
    // Clean users table specifically for this test
    await test_utils.clean_tables(['users']);
  });

  describe('create', () => {
    it('should create a new user with valid data', async () => {
      const user_data = {
        id: uuidv4(),
        email: 'test@example.com',
        password_hash: await bcrypt.hash('password123', 12),
        first_name: 'Test',
        last_name: 'User',
        phone: '+27123456789',
        date_of_birth: '1990-01-01'
      };
      
      const result = await UserModel.create(user_data);
      
      expect(result).toBeDefined();
      expect(result.id).toBe(user_data.id);
      expect(result.email).toBe(user_data.email);
      expect(result.first_name).toBe(user_data.first_name);
      expect(result.last_name).toBe(user_data.last_name);
      expect(result.role).toBe('customer'); // Default role
      expect(result.created_at).toBeInstanceOf(Date);
    });

    it('should throw error for duplicate email', async () => {
      const user_data = {
        id: uuidv4(),
        email: 'duplicate@example.com',
        password_hash: await bcrypt.hash('password123', 12),
        first_name: 'Test',
        last_name: 'User'
      };
      
      await UserModel.create(user_data);
      
      const duplicate_user = {
        ...user_data,
        id: uuidv4() // Different ID, same email
      };
      
      await expect(UserModel.create(duplicate_user))
        .rejects
        .toThrow();
    });

    it('should handle missing optional fields', async () => {
      const user_data = {
        id: uuidv4(),
        email: 'minimal@example.com',
        password_hash: await bcrypt.hash('password123', 12),
        first_name: 'Min',
        last_name: 'User'
        // phone and date_of_birth are optional
      };
      
      const result = await UserModel.create(user_data);
      
      expect(result).toBeDefined();
      expect(result.email).toBe(user_data.email);
    });
  });

  describe('find_by_email', () => {
    it('should find user by email', async () => {
      const user_data = {
        id: uuidv4(),
        email: 'findme@example.com',
        password_hash: await bcrypt.hash('password123', 12),
        first_name: 'Find',
        last_name: 'Me'
      };
      
      await UserModel.create(user_data);
      const found_user = await UserModel.find_by_email(user_data.email);
      
      expect(found_user).toBeDefined();
      expect(found_user.id).toBe(user_data.id);
      expect(found_user.email).toBe(user_data.email);
      expect(found_user.password_hash).toBeDefined();
      expect(found_user.first_name).toBe(user_data.first_name);
      expect(found_user.is_active).toBe(true);
    });

    it('should return undefined for non-existent email', async () => {
      const result = await UserModel.find_by_email('nonexistent@test.com');
      
      expect(result).toBeUndefined();
    });
  });

  describe('find_by_id', () => {
    it('should find user by ID', async () => {
      const user_data = {
        id: uuidv4(),
        email: 'findbyid@example.com',
        password_hash: await bcrypt.hash('password123', 12),
        first_name: 'Find',
        last_name: 'ById'
      };
      
      await UserModel.create(user_data);
      const found_user = await UserModel.find_by_id(user_data.id);
      
      expect(found_user).toBeDefined();
      expect(found_user.id).toBe(user_data.id);
      expect(found_user.email).toBe(user_data.email);
      expect(found_user.email_verified).toBe(false);
    });

    it('should return undefined for non-existent ID', async () => {
      const fake_id = '550e8400-e29b-41d4-a716-446655440000';
      
      const result = await UserModel.find_by_id(fake_id);
      
      expect(result).toBeUndefined();
    });

    it('should throw error for invalid UUID format', async () => {
      await expect(UserModel.find_by_id('invalid-uuid'))
        .rejects
        .toThrow();
    });
  });

  describe('update', () => {
    it('should update user profile fields', async () => {
      const user_data = {
        id: uuidv4(),
        email: 'update@example.com',
        password_hash: await bcrypt.hash('password123', 12),
        first_name: 'Original',
        last_name: 'Name'
      };
      
      const created_user = await UserModel.create(user_data);
      
      const updates = {
        first_name: 'Updated',
        last_name: 'Name',
        phone: '+27123456789'
      };
      
      const updated_user = await UserModel.update(created_user.id, updates);
      
      expect(updated_user.first_name).toBe('Updated');
      expect(updated_user.last_name).toBe('Name');
      expect(updated_user.phone).toBe('+27123456789');
      expect(updated_user.email).toBe(user_data.email); // Should remain unchanged
      expect(updated_user.updated_at).toBeInstanceOf(Date);
    });

    it('should throw error for no fields to update', async () => {
      const user_data = {
        id: uuidv4(),
        email: 'noupdate@example.com',
        password_hash: await bcrypt.hash('password123', 12),
        first_name: 'No',
        last_name: 'Update'
      };
      
      const created_user = await UserModel.create(user_data);
      
      await expect(UserModel.update(created_user.id, {}))
        .rejects
        .toThrow('No fields to update');
    });

    it('should return undefined for non-existent user', async () => {
      const fake_id = '550e8400-e29b-41d4-a716-446655440000';
      
      const result = await UserModel.update(fake_id, { first_name: 'Test' });
      
      expect(result).toBeUndefined();
    });
  });

  describe('update_password', () => {
    it('should update password hash', async () => {
      const user_data = {
        id: uuidv4(),
        email: 'password@example.com',
        password_hash: await bcrypt.hash('oldpassword', 12),
        first_name: 'Password',
        last_name: 'Test'
      };
      
      await UserModel.create(user_data);
      
      const new_password_hash = await bcrypt.hash('newpassword', 12);
      await UserModel.update_password(user_data.id, new_password_hash);
      
      const updated_user = await UserModel.find_by_email(user_data.email);
      expect(updated_user.password_hash).toBe(new_password_hash);
    });
  });

  describe('deactivate', () => {
    it('should deactivate user and anonymize email', async () => {
      const user_data = {
        id: uuidv4(),
        email: 'deactivate@example.com',
        password_hash: await bcrypt.hash('password123', 12),
        first_name: 'Deactivate',
        last_name: 'Me'
      };
      
      await UserModel.create(user_data);
      await UserModel.deactivate(user_data.id);
      
      const deactivated_user = await UserModel.find_by_email(`deleted_${user_data.id}@deleted.thirstybird.co.za`);
      expect(deactivated_user).toBeDefined();
      expect(deactivated_user.is_active).toBe(false);
    });
  });

  describe('get_user_stats', () => {
    it('should return user statistics', async () => {
      const user_data = {
        id: uuidv4(),
        email: 'stats@example.com',
        password_hash: await bcrypt.hash('password123', 12),
        first_name: 'Stats',
        last_name: 'User'
      };
      
      await UserModel.create(user_data);
      const stats = await UserModel.get_user_stats(user_data.id);
      
      expect(stats).toBeDefined();
      expect(stats.total_vouchers).toBe('0');
      expect(stats.active_vouchers).toBe('0');
      expect(stats.redeemed_vouchers).toBe('0');
      expect(parseInt(stats.total_spent)).toBe(0);
    });
  });

  describe('get_recent_vouchers', () => {
    it('should return empty array for user with no vouchers', async () => {
      const user_data = {
        id: uuidv4(),
        email: 'novouchers@example.com',
        password_hash: await bcrypt.hash('password123', 12),
        first_name: 'No',
        last_name: 'Vouchers'
      };
      
      await UserModel.create(user_data);
      const vouchers = await UserModel.get_recent_vouchers(user_data.id);
      
      expect(vouchers).toEqual([]);
    });
  });

  describe('check_active_vouchers', () => {
    it('should return 0 for user with no active vouchers', async () => {
      const user_data = {
        id: uuidv4(),
        email: 'noactive@example.com',
        password_hash: await bcrypt.hash('password123', 12),
        first_name: 'No',
        last_name: 'Active'
      };
      
      await UserModel.create(user_data);
      const count = await UserModel.check_active_vouchers(user_data.id);
      
      expect(count).toBe(0);
    });
  });

  describe('get_venues_for_user', () => {
    it('should return empty array for user with no venues', async () => {
      const user_data = {
        id: uuidv4(),
        email: 'novenues@example.com',
        password_hash: await bcrypt.hash('password123', 12),
        first_name: 'No',
        last_name: 'Venues'
      };
      
      await UserModel.create(user_data);
      const venues = await UserModel.get_venues_for_user(user_data.id);
      
      expect(venues).toEqual([]);
    });
  });
});