import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { schemas, sanitize_html, sanitize_sql } from '../src/middleware/validation.js';

describe('Validation Tests', () => {
  beforeAll(async () => {
    // Clean before this test file starts
    await test_utils.clean_test_data();
  });
  
  afterAll(async () => {
    // Clean after this test file ends
    await test_utils.clean_test_data();
  });

  describe('Login Schema Validation', () => {
    it('should validate correct login data', () => {
      const valid_login = {
        email: 'test@example.com',
        password: 'password123'
      };
      
      const { error } = schemas.login.validate(valid_login);
      expect(error).toBeUndefined();
    });

    it('should reject invalid email', () => {
      const invalid_login = {
        email: 'invalid-email',
        password: 'password123'
      };
      
      const { error } = schemas.login.validate(invalid_login);
      expect(error).toBeDefined();
      expect(error.details[0].path).toEqual(['email']);
    });

    it('should reject short password', () => {
      const invalid_login = {
        email: 'test@example.com',
        password: 'short'
      };
      
      const { error } = schemas.login.validate(invalid_login);
      expect(error).toBeDefined();
      expect(error.details[0].path).toEqual(['password']);
    });
  });

  describe('Register Schema Validation', () => {
    it('should validate correct registration data', () => {
      const valid_register = {
        email: 'test@example.com',
        password: 'Password123!',
        first_name: 'John',
        last_name: 'Doe'
      };
      
      const { error } = schemas.register.validate(valid_register);
      expect(error).toBeUndefined();
    });

    it('should reject weak password', () => {
      const weak_password_register = {
        email: 'test@example.com',
        password: 'weakpassword',
        first_name: 'John',
        last_name: 'Doe'
      };
      
      const { error } = schemas.register.validate(weak_password_register);
      expect(error).toBeDefined();
    });

    it('should require all mandatory fields', () => {
      const incomplete_register = {
        email: 'test@example.com'
      };
      
      const { error } = schemas.register.validate(incomplete_register);
      expect(error).toBeDefined();
      expect(error.details.length).toBeGreaterThanOrEqual(1);
    });
  });

  describe('Deal Schema Validation', () => {
    it('should validate correct deal data', () => {
      const valid_deal = {
        venue_id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Great Deal',
        description: 'This is a great deal with lots of savings',
        original_price: 100.00,
        discounted_price: 50.00,
        discount_percentage: 50,
        valid_from: new Date(Date.now() + 86400000).toISOString(), // Tomorrow
        valid_until: new Date(Date.now() + 7 * 86400000).toISOString(), // Next week
        max_vouchers: 100,
        terms_conditions: 'Terms and conditions apply for this deal',
        category: 'drinks'
      };
      
      const { error } = schemas.create_deal.validate(valid_deal);
      expect(error).toBeUndefined();
    });

    it('should reject invalid category', () => {
      const invalid_deal = {
        venue_id: '550e8400-e29b-41d4-a716-446655440000',
        title: 'Great Deal',
        description: 'This is a great deal with lots of savings',
        original_price: 100.00,
        discounted_price: 50.00,
        discount_percentage: 50,
        valid_from: new Date(Date.now() + 86400000).toISOString(),
        valid_until: new Date(Date.now() + 7 * 86400000).toISOString(),
        max_vouchers: 100,
        terms_conditions: 'Terms and conditions apply for this deal',
        category: 'invalid_category'
      };
      
      const { error } = schemas.create_deal.validate(invalid_deal);
      expect(error).toBeDefined();
      expect(error.details[0].path).toEqual(['category']);
    });
  });

  describe('Sanitization Functions', () => {
    it('should sanitize HTML correctly', () => {
      const html_input = '<script>alert("xss")</script>';
      const sanitized = sanitize_html(html_input);
      expect(sanitized).not.toContain('<script>');
      expect(sanitized).toContain('&lt;script&gt;');
    });

    it('should sanitize SQL correctly', () => {
      const sql_input = "'; DROP TABLE users; --";
      const sanitized = sanitize_sql(sql_input);
      expect(sanitized).not.toContain("'");
      expect(sanitized).not.toContain(';');
    });

    it('should handle null and undefined inputs', () => {
      expect(sanitize_html(null)).toBeNull();
      expect(sanitize_html(undefined)).toBeUndefined();
      expect(sanitize_sql(null)).toBeNull();
      expect(sanitize_sql(undefined)).toBeUndefined();
    });
  });
});