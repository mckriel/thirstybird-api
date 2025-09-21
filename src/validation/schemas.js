import Joi from 'joi';

export const register_schema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().min(8).required(),
  first_name: Joi.string().max(100).required(),
  last_name: Joi.string().max(100).required(),
  phone: Joi.string().pattern(/^\+27[0-9]{9}$/).optional(),
  date_of_birth: Joi.date().max('now').optional()
});

export const login_schema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required()
});

export const venue_schema = Joi.object({
  name: Joi.string().max(255).required(),
  description: Joi.string().optional(),
  address: Joi.string().required(),
  city: Joi.string().max(100).required(),
  postal_code: Joi.string().max(10).required(),
  latitude: Joi.number().min(-90).max(90).optional(),
  longitude: Joi.number().min(-180).max(180).optional(),
  phone: Joi.string().pattern(/^\+27[0-9]{9}$/).optional(),
  email: Joi.string().email().optional(),
  website: Joi.string().uri().optional(),
  logo_url: Joi.string().uri().optional(),
  cover_image_url: Joi.string().uri().optional(),
  opening_hours: Joi.object().optional(),
  requires_age_verification: Joi.boolean().default(false)
});

export const deal_schema = Joi.object({
  venue_id: Joi.string().uuid().required(),
  title: Joi.string().max(255).required(),
  description: Joi.string().optional(),
  terms_and_conditions: Joi.string().required(),
  original_price: Joi.number().positive().precision(2).required(),
  deal_price: Joi.number().positive().precision(2).required(),
  max_vouchers: Joi.number().integer().min(1).default(1000),
  max_per_customer: Joi.number().integer().min(1).default(10),
  deal_image_url: Joi.string().uri().optional(),
  start_date: Joi.date().required(),
  end_date: Joi.date().greater(Joi.ref('start_date')).required(),
  requires_age_verification: Joi.boolean().default(false)
});

export const voucher_purchase_schema = Joi.object({
  deal_id: Joi.string().uuid().required(),
  quantity: Joi.number().integer().min(1).max(10).default(1)
});

export const voucher_redeem_schema = Joi.object({
  voucher_code: Joi.string().required()
});

export const payment_schema = Joi.object({
  deal_id: Joi.string().uuid().required(),
  quantity: Joi.number().integer().min(1).max(10).required(),
  payment_method: Joi.string().valid('payfast', 'peach').default('payfast')
});

export const user_update_schema = Joi.object({
  first_name: Joi.string().max(100).optional(),
  last_name: Joi.string().max(100).optional(),
  phone: Joi.string().pattern(/^\+27[0-9]{9}$/).optional(),
  date_of_birth: Joi.date().max('now').optional()
});

export const venue_update_schema = venue_schema.fork(['name', 'address', 'city', 'postal_code'], (schema) => schema.optional());

export const deal_update_schema = deal_schema.fork(['venue_id', 'title', 'terms_and_conditions', 'original_price', 'deal_price', 'start_date', 'end_date'], (schema) => schema.optional());