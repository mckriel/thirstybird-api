import Joi from 'joi';

// Environment variable validation schema
const env_schema = Joi.object({
  // Database
  DATABASE_URL: Joi.string().uri().required()
    .messages({
      'any.required': 'DATABASE_URL is required for database connection',
      'string.uri': 'DATABASE_URL must be a valid PostgreSQL connection string'
    }),
  
  // Redis (optional but recommended)
  REDIS_URL: Joi.string().uri().optional()
    .messages({
      'string.uri': 'REDIS_URL must be a valid Redis connection string'
    }),
  REDIS_ENABLED: Joi.boolean().default(false),
  
  // JWT Authentication (critical security)
  JWT_SECRET: Joi.string().min(32).required()
    .messages({
      'any.required': 'JWT_SECRET is required for authentication',
      'string.min': 'JWT_SECRET must be at least 32 characters for security'
    }),
  JWT_EXPIRES_IN: Joi.string().default('7d')
    .pattern(/^\d+[hdwmy]$/)
    .messages({
      'string.pattern.base': 'JWT_EXPIRES_IN must be in format like "7d", "24h", "30m"'
    }),
  
  // Server Configuration
  NODE_ENV: Joi.string().valid('development', 'production', 'test').default('development'),
  PORT: Joi.number().port().default(3000),
  API_URL: Joi.string().uri().required()
    .messages({
      'any.required': 'API_URL is required for proper CORS and redirects'
    }),
  FRONTEND_URL: Joi.string().uri().required()
    .messages({
      'any.required': 'FRONTEND_URL is required for CORS configuration'
    }),
  PORTAL_URL: Joi.string().uri().required()
    .messages({
      'any.required': 'PORTAL_URL is required for venue management CORS'
    }),
  
  // Email Configuration (required for voucher delivery)
  SMTP_HOST: Joi.string().hostname().required()
    .messages({
      'any.required': 'SMTP_HOST is required for email delivery'
    }),
  SMTP_PORT: Joi.number().port().default(587),
  SMTP_USER: Joi.string().email().required()
    .messages({
      'any.required': 'SMTP_USER (email address) is required for authentication'
    }),
  SMTP_PASS: Joi.string().min(8).required()
    .messages({
      'any.required': 'SMTP_PASS is required for email authentication',
      'string.min': 'SMTP_PASS should be at least 8 characters'
    }),
  FROM_EMAIL: Joi.string().email().required()
    .messages({
      'any.required': 'FROM_EMAIL is required for sending vouchers'
    }),
  
  // Payment Configuration (critical for production)
  PAYFAST_MERCHANT_ID: Joi.string().when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'any.required': 'PAYFAST_MERCHANT_ID is required in production'
  }),
  PAYFAST_MERCHANT_KEY: Joi.string().when('NODE_ENV', {
    is: 'production', 
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'any.required': 'PAYFAST_MERCHANT_KEY is required in production'
  }),
  PAYFAST_PASSPHRASE: Joi.string().min(10).when('NODE_ENV', {
    is: 'production',
    then: Joi.required(),
    otherwise: Joi.optional()
  }).messages({
    'any.required': 'PAYFAST_PASSPHRASE is required in production',
    'string.min': 'PAYFAST_PASSPHRASE should be at least 10 characters for security'
  }),
  PAYFAST_SANDBOX: Joi.boolean().default(true),
  
  // Alternative Payment Provider
  PEACH_USER_ID: Joi.string().optional(),
  PEACH_PASSWORD: Joi.string().optional(),
  PEACH_ENTITY_ID: Joi.string().optional(),
  PEACH_SANDBOX: Joi.boolean().default(true),
  
  // Security & Monitoring (optional)
  SECURITY_REPORT_URI: Joi.string().uri().optional(),
  SECURITY_WEBHOOK_URL: Joi.string().uri().optional(),
  
  // Rate Limiting Configuration
  RATE_LIMIT_WINDOW_MS: Joi.number().positive().default(900000), // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: Joi.number().positive().default(100),
  AUTH_RATE_LIMIT_MAX: Joi.number().positive().default(10),
  PAYMENT_RATE_LIMIT_MAX: Joi.number().positive().default(5)
}).unknown(); // Allow other environment variables

export const validate_environment = () => {
  const { error, value } = env_schema.validate(process.env, {
    abortEarly: false,
    stripUnknown: false
  });
  
  if (error) {
    const validation_errors = error.details.map(detail => ({
      variable: detail.path.join('.'),
      message: detail.message,
      value: detail.context?.value ? '[REDACTED]' : undefined
    }));
    
    console.error('❌ Environment validation failed:');
    validation_errors.forEach(err => {
      console.error(`  • ${err.variable}: ${err.message}`);
    });
    
    console.error('\n📋 Required environment variables:');
    console.error('  DATABASE_URL, JWT_SECRET, API_URL, FRONTEND_URL, PORTAL_URL');
    console.error('  SMTP_HOST, SMTP_USER, SMTP_PASS, FROM_EMAIL');
    console.error('\n💡 Check your .env file against .env.example');
    
    throw new Error(`Environment validation failed: ${validation_errors.length} errors found`);
  }
  
  // Security warnings
  const warnings = [];
  
  if (value.NODE_ENV === 'production') {
    if (!value.PAYFAST_MERCHANT_ID) {
      warnings.push('PayFast not configured - payments will fail');
    }
    
    if (value.JWT_SECRET.length < 64) {
      warnings.push('JWT_SECRET should be 64+ characters in production');
    }
    
    if (value.PAYFAST_SANDBOX === true) {
      warnings.push('PAYFAST_SANDBOX=true in production - payments will use sandbox');
    }
    
    if (!value.REDIS_ENABLED) {
      warnings.push('Redis disabled - rate limiting will use memory (not recommended)');
    }
  }
  
  if (value.NODE_ENV === 'development') {
    if (value.JWT_SECRET === 'your-super-secret-jwt-key-here-make-it-long-and-random-min-32-chars') {
      warnings.push('Using default JWT_SECRET - change this for security');
    }
  }
  
  // Show warnings
  if (warnings.length > 0) {
    console.warn('⚠️  Environment warnings:');
    warnings.forEach(warning => {
      console.warn(`  • ${warning}`);
    });
    console.warn('');
  }
  
  return {
    validated_env: value,
    warnings,
    is_production: value.NODE_ENV === 'production'
  };
};

export const get_security_config = () => {
  const env = process.env;
  
  return {
    jwt: {
      secret: env.JWT_SECRET,
      expires_in: env.JWT_EXPIRES_IN || '7d'
    },
    rate_limiting: {
      window_ms: parseInt(env.RATE_LIMIT_WINDOW_MS) || 900000,
      max_requests: parseInt(env.RATE_LIMIT_MAX_REQUESTS) || 100,
      auth_max: parseInt(env.AUTH_RATE_LIMIT_MAX) || 10,
      payment_max: parseInt(env.PAYMENT_RATE_LIMIT_MAX) || 5
    },
    security: {
      report_uri: env.SECURITY_REPORT_URI,
      webhook_url: env.SECURITY_WEBHOOK_URL
    },
    cors: {
      origins: [
        env.FRONTEND_URL,
        env.PORTAL_URL,
        ...(env.NODE_ENV === 'development' ? [
          'http://localhost:5173',
          'http://localhost:5174'
        ] : [])
      ]
    }
  };
};

// Validate critical secrets aren't using defaults
export const validate_production_secrets = () => {
  if (process.env.NODE_ENV !== 'production') return true;
  
  const default_values = [
    'your-super-secret-jwt-key-here-make-it-long-and-random-min-32-chars',
    'your-merchant-id',
    'your-merchant-key', 
    'your-passphrase',
    'dev_password_123',
    'dev_redis_pass',
    'your-email@gmail.com',
    'your-email-password'
  ];
  
  const critical_vars = [
    process.env.JWT_SECRET,
    process.env.PAYFAST_MERCHANT_ID,
    process.env.PAYFAST_MERCHANT_KEY,
    process.env.PAYFAST_PASSPHRASE,
    process.env.SMTP_USER,
    process.env.SMTP_PASS
  ];
  
  const using_defaults = critical_vars.some(value => 
    default_values.includes(value)
  );
  
  if (using_defaults) {
    throw new Error('🚨 SECURITY CRITICAL: Default secrets detected in production environment');
  }
  
  return true;
};