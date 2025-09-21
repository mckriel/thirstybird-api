import { redis } from '../database/redis.js';

const security_events = {
  LOGIN_SUCCESS: 'login_success',
  LOGIN_FAILED: 'login_failed', 
  LOGIN_BLOCKED: 'login_blocked',
  TOKEN_EXPIRED: 'token_expired',
  TOKEN_INVALID: 'token_invalid',
  ACCESS_DENIED: 'access_denied',
  RATE_LIMIT_HIT: 'rate_limit_hit',
  SUSPICIOUS_REQUEST: 'suspicious_request',
  PAYMENT_ATTEMPT: 'payment_attempt',
  VOUCHER_REDEMPTION: 'voucher_redemption',
  ADMIN_ACTION: 'admin_action'
};

const get_client_info = (req) => {
  return {
    ip: req.ip || req.connection.remoteAddress,
    user_agent: req.get('user-agent') || 'unknown',
    forwarded_for: req.get('x-forwarded-for') || null,
    real_ip: req.get('x-real-ip') || null,
    timestamp: new Date().toISOString(),
    method: req.method,
    url: req.originalUrl,
    referrer: req.get('referrer') || null
  };
};

const should_log_request = (req) => {
  const sensitive_paths = [
    '/api/auth',
    '/api/payments', 
    '/api/admin',
    '/api/users'
  ];
  
  const suspicious_patterns = [
    /\.\./,  // Path traversal
    /[<>'"]/,  // XSS attempts
    /union|select|insert|update|delete|drop/i,  // SQL injection
    /script|javascript|vbscript/i  // Script injection
  ];
  
  return sensitive_paths.some(path => req.originalUrl.startsWith(path)) ||
         suspicious_patterns.some(pattern => pattern.test(req.originalUrl + JSON.stringify(req.body || {})));
};

const log_security_event = async (event_type, data) => {
  const log_entry = {
    event: event_type,
    timestamp: new Date().toISOString(),
    ...data
  };
  
  try {
    // Log to console for development
    if (process.env.NODE_ENV === 'development') {
      console.log('🔐 Security Event:', JSON.stringify(log_entry, null, 2));
    }
    
    // Store in Redis for analysis
    if (redis.is_connected()) {
      const key = `security_log:${Date.now()}:${Math.random().toString(36).substr(2, 9)}`;
      await redis.setex(key, 86400 * 30, JSON.stringify(log_entry)); // 30 days retention
      
      // Maintain event counters for monitoring
      const counter_key = `security_counter:${event_type}:${new Date().toISOString().slice(0, 10)}`;
      await redis.incr(counter_key);
      await redis.expire(counter_key, 86400 * 30);
    }
    
    // In production, you might want to send to external logging service
    if (process.env.NODE_ENV === 'production' && process.env.SECURITY_WEBHOOK_URL) {
      // Send critical events to external monitoring
      const critical_events = [
        security_events.LOGIN_BLOCKED,
        security_events.ACCESS_DENIED,
        security_events.SUSPICIOUS_REQUEST
      ];
      
      if (critical_events.includes(event_type)) {
        // Implementation for webhook/external service would go here
      }
    }
    
  } catch (error) {
    console.error('Security logging error:', error.message);
  }
};

export const security_logger = (req, res, next) => {
  const client_info = get_client_info(req);
  
  // Log sensitive requests
  if (should_log_request(req)) {
    log_security_event(security_events.SUSPICIOUS_REQUEST, {
      ...client_info,
      body_size: JSON.stringify(req.body || {}).length,
      headers: {
        authorization: req.get('authorization') ? 'Bearer [REDACTED]' : 'none',
        'content-type': req.get('content-type'),
        'accept': req.get('accept')
      }
    });
  }
  
  // Track failed authentication attempts
  const original_json = res.json;
  res.json = function(body) {
    if (res.statusCode === 401 || res.statusCode === 403) {
      const event_type = res.statusCode === 401 ? 
        security_events.LOGIN_FAILED : 
        security_events.ACCESS_DENIED;
        
      log_security_event(event_type, {
        ...client_info,
        status_code: res.statusCode,
        error: body.error || 'unknown',
        user_id: req.user?.id || null
      });
    }
    
    // Track successful authentications
    if (req.originalUrl.includes('/api/auth/login') && res.statusCode === 200) {
      log_security_event(security_events.LOGIN_SUCCESS, {
        ...client_info,
        user_id: body.user?.id || null,
        user_email: body.user?.email || null
      });
    }
    
    // Track rate limit hits
    if (res.statusCode === 429) {
      log_security_event(security_events.RATE_LIMIT_HIT, {
        ...client_info,
        limit_type: body.error === 'Too many authentication attempts' ? 'auth' : 'general'
      });
    }
    
    return original_json.call(this, body);
  };
  
  next();
};

export const log_admin_action = async (req, action, details = {}) => {
  if (!req.user || req.user.role !== 'admin') {
    return;
  }
  
  await log_security_event(security_events.ADMIN_ACTION, {
    ...get_client_info(req),
    admin_id: req.user.id,
    admin_email: req.user.email,
    action,
    details
  });
};

export const log_payment_attempt = async (req, payment_data) => {
  await log_security_event(security_events.PAYMENT_ATTEMPT, {
    ...get_client_info(req),
    user_id: req.user?.id || null,
    amount: payment_data.amount,
    currency: payment_data.currency,
    payment_method: payment_data.method || 'payfast'
  });
};

export const log_voucher_redemption = async (req, voucher_data) => {
  await log_security_event(security_events.VOUCHER_REDEMPTION, {
    ...get_client_info(req),
    user_id: req.user?.id || null,
    voucher_id: voucher_data.id,
    venue_id: voucher_data.venue_id,
    deal_id: voucher_data.deal_id
  });
};

// Get security stats for monitoring dashboard
export const get_security_stats = async (days = 7) => {
  if (!redis.is_connected()) {
    return { error: 'Redis not available' };
  }
  
  try {
    const stats = {};
    const today = new Date();
    
    for (let i = 0; i < days; i++) {
      const date = new Date(today.getTime() - i * 24 * 60 * 60 * 1000)
        .toISOString().slice(0, 10);
      
      stats[date] = {};
      
      for (const [key, event_type] of Object.entries(security_events)) {
        const counter_key = `security_counter:${event_type}:${date}`;
        const count = await redis.get(counter_key) || 0;
        stats[date][event_type] = parseInt(count);
      }
    }
    
    return stats;
  } catch (error) {
    console.error('Error getting security stats:', error);
    return { error: error.message };
  }
};

export { security_events };