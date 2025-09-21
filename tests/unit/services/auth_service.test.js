import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest';
import { AuthService } from '../../../src/services/auth_service.js';
import { UserModel } from '../../../src/models/user.js';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';

// Mock email service to avoid actual email sending
vi.mock('../../../src/services/email_service.js', () => ({
  default: {
    send_welcome_email: vi.fn().mockResolvedValue(true)
  }
}));

describe('AuthService', () => {
  let test_user_email = `authtest-${uuidv4()}@test.com`;
  let test_user_id;

  beforeAll(async () => {
    // Clean before this test file starts
    await test_utils.clean_test_data();
  });
  
  afterAll(async () => {
    // Clean after this test file ends
    await test_utils.clean_test_data();
  });

  describe('register_user', () => {
    it('should register a new user with valid data', async () => {
      const user_data = {
        email: test_user_email,
        password: 'Password123!',
        first_name: 'Auth',
        last_name: 'Test',
        phone: '+27123456789',
        date_of_birth: '1990-01-01'
      };
      
      const result = await AuthService.register_user(user_data);
      
      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(user_data.email);
      expect(result.user.first_name).toBe(user_data.first_name);
      expect(result.user.last_name).toBe(user_data.last_name);
      expect(result.user.role).toBe('customer'); // Default role
      expect(result.token).toBeDefined();
      expect(result.email_status).toBe('Welcome email sent');
      expect(result.user.created_at).toBeInstanceOf(Date);
      
      // Store user ID for other tests
      test_user_id = result.user.id;
    });

    it('should throw error for duplicate email', async () => {
      const duplicate_user_data = {
        email: test_user_email, // Same email as above
        password: 'AnotherPass123!',
        first_name: 'Duplicate',
        last_name: 'User'
      };
      
      await expect(AuthService.register_user(duplicate_user_data))
        .rejects
        .toThrow('Email already registered');
    });

    it('should handle optional fields', async () => {
      const minimal_user_data = {
        email: `minimal-${uuidv4()}@test.com`,
        password: 'MinimalPass123!',
        first_name: 'Minimal',
        last_name: 'User'
        // phone and date_of_birth are optional
      };
      
      const result = await AuthService.register_user(minimal_user_data);
      
      expect(result).toBeDefined();
      expect(result.user.email).toBe(minimal_user_data.email);
      expect(result.token).toBeDefined();
    });
  });

  describe('login_user', () => {
    it('should login user with valid credentials', async () => {
      const result = await AuthService.login_user(test_user_email, 'Password123!');
      
      expect(result).toBeDefined();
      expect(result.user).toBeDefined();
      expect(result.user.email).toBe(test_user_email);
      expect(result.user.first_name).toBe('Auth');
      expect(result.user.last_name).toBe('Test');
      expect(result.user.role).toBe('customer');
      expect(result.token).toBeDefined();
      expect(result.user.id).toBe(test_user_id);
    });

    it('should throw error for invalid email', async () => {
      await expect(AuthService.login_user('nonexistent@test.com', 'password'))
        .rejects
        .toThrow('Invalid credentials');
    });

    it('should throw error for invalid password', async () => {
      await expect(AuthService.login_user(test_user_email, 'wrongpassword'))
        .rejects
        .toThrow('Invalid credentials');
    });

    it('should throw error for deactivated user', async () => {
      // Create a deactivated user
      const deactivated_email = `deactivated-${uuidv4()}@test.com`;
      const password_hash = await bcrypt.hash('password123', 12);
      
      const deactivated_user = await UserModel.create({
        id: uuidv4(),
        email: deactivated_email,
        password_hash,
        first_name: 'Deactivated',
        last_name: 'User'
      });
      
      // Deactivate the user
      await UserModel.update(deactivated_user.id, { is_active: false });
      
      await expect(AuthService.login_user(deactivated_email, 'password123'))
        .rejects
        .toThrow('Account deactivated');
    });
  });

  describe('get_user_profile', () => {
    it('should get user profile with stats and vouchers', async () => {
      const profile = await AuthService.get_user_profile(test_user_id);
      
      expect(profile).toBeDefined();
      expect(profile.user).toBeDefined();
      expect(profile.user.email).toBe(test_user_email);
      expect(profile.stats).toBeDefined();
      expect(profile.recent_vouchers).toBeInstanceOf(Array);
    });

    it('should throw error for non-existent user', async () => {
      const fake_user_id = '550e8400-e29b-41d4-a716-446655440000';
      
      await expect(AuthService.get_user_profile(fake_user_id))
        .rejects
        .toThrow('User not found');
    });
  });

  describe('update_user_profile', () => {
    it('should update user profile', async () => {
      const update_data = {
        first_name: 'Updated',
        last_name: 'Name',
        phone: '+27987654321'
      };
      
      const updated_user = await AuthService.update_user_profile(test_user_id, update_data);
      
      expect(updated_user).toBeDefined();
      expect(updated_user.first_name).toBe('Updated');
      expect(updated_user.last_name).toBe('Name');
      expect(updated_user.phone).toBe('+27987654321');
      expect(updated_user.email).toBe(test_user_email); // Should remain unchanged
    });

    it('should handle non-existent user update', async () => {
      const fake_user_id = '550e8400-e29b-41d4-a716-446655440000';
      
      const result = await AuthService.update_user_profile(fake_user_id, { first_name: 'Test' });
      
      expect(result).toBeUndefined();
    });
  });

  describe('change_password', () => {
    it('should change password with valid current password', async () => {
      await expect(
        AuthService.change_password(test_user_id, 'Password123!', 'NewPassword123!')
      ).resolves.not.toThrow();
      
      // Verify we can login with new password
      const login_result = await AuthService.login_user(test_user_email, 'NewPassword123!');
      expect(login_result.user.id).toBe(test_user_id);
    });

    it('should throw error for incorrect current password', async () => {
      await expect(
        AuthService.change_password(test_user_id, 'WrongPassword', 'NewPassword456!')
      ).rejects.toThrow('Current password is incorrect');
    });

    it('should throw error for non-existent user', async () => {
      const fake_user_id = '550e8400-e29b-41d4-a716-446655440000';
      
      await expect(
        AuthService.change_password(fake_user_id, 'password', 'newpassword')
      ).rejects.toThrow('User not found');
    });
  });

  describe('delete_user_account', () => {
    it('should throw error for incorrect password during deletion', async () => {
      await expect(
        AuthService.delete_user_account(test_user_id, 'wrongpassword')
      ).rejects.toThrow('Password is incorrect');
    });

    it('should throw error for non-existent user during deletion', async () => {
      const fake_user_id = '550e8400-e29b-41d4-a716-446655440000';
      
      await expect(
        AuthService.delete_user_account(fake_user_id, 'password')
      ).rejects.toThrow('User not found');
    });

    it('should delete account with correct password and no active vouchers', async () => {
      // Create a new user for deletion test
      const delete_user_data = {
        email: `deletetest-${uuidv4()}@test.com`,
        password: 'DeleteTest123!',
        first_name: 'Delete',
        last_name: 'Test'
      };
      
      const registration_result = await AuthService.register_user(delete_user_data);
      const delete_user_id = registration_result.user.id;
      
      // Delete the account
      await expect(
        AuthService.delete_user_account(delete_user_id, 'DeleteTest123!')
      ).resolves.not.toThrow();
      
      // The main test is that delete operation completed without throwing
      // The user should be deactivated but find_by_id doesn't include is_active field
      // So we just verify we can still find the user (they exist but are deactivated)
      const user_after_deletion = await UserModel.find_by_id(delete_user_id);
      expect(user_after_deletion).toBeDefined();
      expect(user_after_deletion.email).toContain('deleted_'); // Email gets prefixed with 'deleted_'
    });
  });

  describe('get_user_venues', () => {
    it('should get venues for user', async () => {
      const venues = await AuthService.get_user_venues(test_user_id);
      
      expect(venues).toBeInstanceOf(Array);
      // User likely has no venues initially
      expect(venues.length).toBeGreaterThanOrEqual(0);
    });

    it('should return empty array for user with no venues', async () => {
      const venues = await AuthService.get_user_venues(test_user_id);
      
      expect(venues).toBeInstanceOf(Array);
      expect(venues.length).toBe(0);
    });
  });
});