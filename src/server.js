import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { createServer } from 'http';

dotenv.config();

// Validate environment first
import { validate_environment, validate_production_secrets, get_security_config } from './utils/env_validator.js';

import { test_connection } from './database/connection.js';
import { connect_redis } from './database/redis.js';
import email_service from './services/email_service.js';

// Import routes using 3-layer architecture (Controllers → Services → Models)
import health_routes from './routes/health.js';
import auth_routes from './routes/auth.js';
import venue_routes from './routes/venues.js';
import user_routes from './routes/users.js';
import deal_routes from './routes/deals.js';
import voucher_routes from './routes/vouchers.js';
import payment_routes from './routes/payments.js';

// Security middleware
import { security_headers, additional_security_headers, security_monitor } from './middleware/security_headers.js';
import { security_logger } from './middleware/security_logger.js';
import { error_handler } from './middleware/error_handler.js';
import { rate_limiter } from './middleware/rate_limiter.js';

const app = express();
const server = createServer(app);

// Security middleware stack
app.use(security_headers);
app.use(additional_security_headers);
app.use(security_monitor);
app.use(security_logger);

// CORS configuration
const security_config = get_security_config();
app.use(cors({
  origin: security_config.cors.origins,
  credentials: true,
  optionsSuccessStatus: 200,
  maxAge: 86400 // 24 hours
}));

// Body parsing with security limits
app.use(express.json({ 
  limit: '10mb',
  strict: true,
  type: 'application/json'
}));
app.use(express.urlencoded({ 
  extended: true, 
  limit: '10mb',
  parameterLimit: 100
}));

// Rate limiting
app.use(rate_limiter);

// Routes using 3-layer architecture
app.use('/health', health_routes);
app.use('/api/auth', auth_routes);
app.use('/api/venues', venue_routes);
app.use('/api/users', user_routes);
app.use('/api/deals', deal_routes);
app.use('/api/vouchers', voucher_routes);
app.use('/api/payments', payment_routes);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ 
    error: 'Route not found',
    path: req.originalUrl 
  });
});

// Global error handler
app.use(error_handler);

const PORT = process.env.PORT || 3000;

const start_server = async () => {
  try {
    console.log('Starting ThirstyBird API...');

    // Validate environment configuration
    console.log('Validating environment...');
    const { validated_env, warnings, is_production } = validate_environment();
    
    if (is_production) {
      validate_production_secrets();
      console.log('Production secrets validated');
    }
    
    if (warnings.length > 0) {
      console.log(`${warnings.length} environment warnings logged`);
    } else {
      console.log('Environment configuration valid');
    }

    // Test database connection
    const db_connected = await test_connection();
    if (!db_connected) {
      console.error('Database connection failed - exiting');
      process.exit(1);
    }
    console.log('Database connected');

    // Connect to Redis
    await connect_redis();
    console.log('Redis connected');

    // Verify email service
    const email_verified = await email_service.verify_connection();
    if (email_verified) {
      console.log('Email service ready');
    } else {
      console.log('Email service not configured (will use console logging)');
    }

    // Start server
    server.listen(PORT, () => {
      console.log(`ThirstyBird API running on port ${PORT}`);
      console.log(`Frontend: ${process.env.FRONTEND_URL}`);
      console.log(`Portal: ${process.env.PORTAL_URL}`);
      console.log(`Environment: ${process.env.NODE_ENV}`);
      console.log(`Architecture: 3-Layer (Controllers → Services → Models)`);
      console.log(`Email: ${email_verified ? 'Configured' : 'Development mode'}`);
      console.log('');
      console.log('Available endpoints:');
      console.log('   /api/auth     - Authentication (register, login)');
      console.log('   /api/venues   - Venue management');
      console.log('   /api/users    - User profiles');
      console.log('   /api/deals    - Deal management');
      console.log('    /api/vouchers - Voucher system (with email delivery)');
      console.log('   /api/payments - Payment processing');
      console.log('    /health      - Health check');
    });

  } catch (error) {
    console.error('Server startup failed:', error);
    process.exit(1);
  }
};

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('✅ Server closed');
    process.exit(0);
  });
});

start_server();

export default app;