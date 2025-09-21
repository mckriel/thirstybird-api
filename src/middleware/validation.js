import Joi from 'joi';

export const validate_schema = (schema, property = 'body') => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req[property], {
      abortEarly: false,
      stripUnknown: true,
      convert: true
    });

    if (error) {
      const validation_errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message,
        value: detail.context?.value
      }));

      return res.status(400).json({
        error: 'Validation failed',
        message: 'Invalid input data provided',
        validation_errors
      });
    }

    req[property] = value;
    next();
  };
};

// Common validation schemas
export const schemas = {
  // Authentication schemas
  login: Joi.object({
    email: Joi.string().email().required().lowercase().trim(),
    password: Joi.string().min(8).max(128).required()
  }),

  register: Joi.object({
    email: Joi.string().email().required().lowercase().trim(),
    password: Joi.string()
      .min(8)
      .max(128)
      .pattern(/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/)
      .required()
      .messages({
        'string.pattern.base': 'Password must contain at least one uppercase letter, lowercase letter, number, and special character'
      }),
    first_name: Joi.string().min(1).max(50).trim().required(),
    last_name: Joi.string().min(1).max(50).trim().required(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional()
  }),

  // Deal schemas
  create_deal: Joi.object({
    venue_id: Joi.string().uuid().required(),
    title: Joi.string().min(3).max(100).trim().required(),
    description: Joi.string().min(10).max(1000).trim().required(),
    original_price: Joi.number().positive().precision(2).required(),
    discounted_price: Joi.number().positive().precision(2).required(),
    discount_percentage: Joi.number().min(1).max(99).integer().required(),
    valid_from: Joi.date().iso().min('now').required(),
    valid_until: Joi.date().iso().greater(Joi.ref('valid_from')).required(),
    max_vouchers: Joi.number().integer().min(1).max(10000).required(),
    terms_conditions: Joi.string().min(10).max(2000).trim().required(),
    category: Joi.string().valid('drinks', 'food', 'experience', 'combo').required()
  }),

  update_deal: Joi.object({
    title: Joi.string().min(3).max(100).trim().optional(),
    description: Joi.string().min(10).max(1000).trim().optional(),
    original_price: Joi.number().positive().precision(2).optional(),
    discounted_price: Joi.number().positive().precision(2).optional(),
    discount_percentage: Joi.number().min(1).max(99).integer().optional(),
    valid_from: Joi.date().iso().optional(),
    valid_until: Joi.date().iso().optional(),
    max_vouchers: Joi.number().integer().min(1).max(10000).optional(),
    terms_conditions: Joi.string().min(10).max(2000).trim().optional(),
    category: Joi.string().valid('drinks', 'food', 'experience', 'combo').optional(),
    is_active: Joi.boolean().optional()
  }),

  // Voucher schemas
  purchase_voucher: Joi.object({
    deal_id: Joi.string().uuid().required(),
    quantity: Joi.number().integer().min(1).max(10).required(),
    recipient_email: Joi.string().email().lowercase().trim().optional(),
    recipient_name: Joi.string().min(1).max(100).trim().optional(),
    gift_message: Joi.string().max(500).trim().optional()
  }),

  // Payment schemas
  create_payment: Joi.object({
    amount: Joi.number().positive().precision(2).required(),
    currency: Joi.string().valid('ZAR').default('ZAR'),
    description: Joi.string().min(1).max(200).trim().required(),
    return_url: Joi.string().uri().required(),
    cancel_url: Joi.string().uri().required(),
    notify_url: Joi.string().uri().required()
  }),

  // User profile schemas
  update_profile: Joi.object({
    first_name: Joi.string().min(1).max(50).trim().optional(),
    last_name: Joi.string().min(1).max(50).trim().optional(),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).optional(),
    preferences: Joi.object({
      email_notifications: Joi.boolean().optional(),
      sms_notifications: Joi.boolean().optional(),
      marketing_emails: Joi.boolean().optional()
    }).optional()
  }),

  // Venue schemas
  create_venue: Joi.object({
    name: Joi.string().min(2).max(100).trim().required(),
    description: Joi.string().min(10).max(1000).trim().required(),
    address: Joi.string().min(10).max(200).trim().required(),
    city: Joi.string().min(2).max(50).trim().required(),
    province: Joi.string().min(2).max(50).trim().required(),
    postal_code: Joi.string().min(4).max(10).trim().required(),
    country: Joi.string().valid('South Africa').default('South Africa'),
    phone: Joi.string().pattern(/^\+?[1-9]\d{1,14}$/).required(),
    email: Joi.string().email().lowercase().trim().required(),
    website: Joi.string().uri().optional(),
    latitude: Joi.number().min(-90).max(90).precision(8).optional(),
    longitude: Joi.number().min(-180).max(180).precision(8).optional(),
    category: Joi.string().valid('restaurant', 'bar', 'club', 'lounge', 'brewery', 'other').required(),
    opening_hours: Joi.object().pattern(
      Joi.string().valid('monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'),
      Joi.object({
        open: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        close: Joi.string().pattern(/^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/).required(),
        closed: Joi.boolean().default(false)
      })
    ).optional()
  })
};

// Parameter validation schemas
export const param_schemas = {
  uuid: Joi.object({
    id: Joi.string().uuid().required()
  }),
  
  venue_id: Joi.object({
    venue_id: Joi.string().uuid().required()
  }),
  
  deal_id: Joi.object({
    deal_id: Joi.string().uuid().required()
  }),
  
  voucher_id: Joi.object({
    voucher_id: Joi.string().uuid().required()
  }),
  
  payment_id: Joi.object({
    payment_id: Joi.string().uuid().required()
  })
};

// Query parameter schemas
export const query_schemas = {
  pagination: Joi.object({
    page: Joi.number().integer().min(1).default(1),
    limit: Joi.number().integer().min(1).max(100).default(20)
  }),
  
  venue_search: Joi.object({
    city: Joi.string().min(2).max(50).trim().optional(),
    category: Joi.string().valid('restaurant', 'bar', 'club', 'lounge', 'brewery', 'other').optional(),
    latitude: Joi.number().min(-90).max(90).optional(),
    longitude: Joi.number().min(-180).max(180).optional(),
    radius: Joi.number().min(1).max(50).default(10).optional()
  }).with('latitude', 'longitude'),
  
  deal_search: Joi.object({
    category: Joi.string().valid('drinks', 'food', 'experience', 'combo').optional(),
    min_discount: Joi.number().min(0).max(99).optional(),
    max_price: Joi.number().positive().optional(),
    venue_id: Joi.string().uuid().optional(),
    active_only: Joi.boolean().default(true)
  })
};

// Sanitization helpers
export const sanitize_html = (str) => {
  if (!str || typeof str !== 'string') return str;
  
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
    .replace(/\//g, '&#x2F;');
};

export const sanitize_sql = (str) => {
  if (!str || typeof str !== 'string') return str;
  
  return str.replace(/['";\\]/g, '');
};