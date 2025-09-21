import helmet from 'helmet';

// Content Security Policy configuration
const csp_config = {
  directives: {
    defaultSrc: ["'self'"],
    styleSrc: [
      "'self'", 
      "'unsafe-inline'", // Allow inline styles for email templates
      "https://fonts.googleapis.com"
    ],
    scriptSrc: [
      "'self'",
      // Only allow specific trusted domains for scripts
      "https://www.payfast.co.za", // PayFast payment scripts
      "https://sandbox.payfast.co.za" // PayFast sandbox
    ],
    fontSrc: [
      "'self'",
      "https://fonts.gstatic.com"
    ],
    imgSrc: [
      "'self'", 
      "data:", // Allow data URIs for QR codes
      "https:", // Allow HTTPS images
      "http:" // Allow HTTP images in development only
    ],
    connectSrc: [
      "'self'",
      "https://www.payfast.co.za",
      "https://sandbox.payfast.co.za",
      ...(process.env.NODE_ENV === 'development' ? [
        "ws://localhost:*", // WebSocket for development
        "http://localhost:*" // Local development
      ] : [])
    ],
    frameSrc: [
      "'self'",
      "https://www.payfast.co.za",
      "https://sandbox.payfast.co.za"
    ],
    objectSrc: ["'none'"],
    upgradeInsecureRequests: process.env.NODE_ENV === 'production' ? [] : null
  },
  reportOnly: process.env.NODE_ENV === 'development'
};

// HTTP Strict Transport Security
const hsts_config = {
  maxAge: 31536000, // 1 year
  includeSubDomains: true,
  preload: true
};

// Expect-CT header
const expect_ct_config = {
  maxAge: 86400, // 24 hours
  enforce: process.env.NODE_ENV === 'production',
  reportUri: process.env.SECURITY_REPORT_URI || undefined
};

// Permission Policy configuration
const permissions_policy = {
  camera: [],
  microphone: [],
  geolocation: process.env.NODE_ENV === 'production' ? [] : ['self'], // Location for venue finding
  notifications: ['self'],
  push: ['self'],
  syncXhr: [],
  fullscreen: [],
  payment: ['self', 'https://www.payfast.co.za', 'https://sandbox.payfast.co.za']
};

export const security_headers = helmet({
  // Content Security Policy
  contentSecurityPolicy: csp_config,
  
  // HTTP Strict Transport Security
  hsts: process.env.NODE_ENV === 'production' ? hsts_config : false,
  
  // Expect-CT
  expectCt: process.env.NODE_ENV === 'production' ? expect_ct_config : false,
  
  // X-Content-Type-Options
  noSniff: true,
  
  // X-Frame-Options
  frameguard: { 
    action: 'sameorigin' // Allow framing from same origin for payment iframes
  },
  
  // X-XSS-Protection
  xssFilter: true,
  
  // Referrer Policy
  referrerPolicy: {
    policy: ['same-origin', 'strict-origin-when-cross-origin']
  },
  
  // X-Permitted-Cross-Domain-Policies
  permittedCrossDomainPolicies: false,
  
  // X-Download-Options
  ieNoOpen: true,
  
  // X-DNS-Prefetch-Control
  dnsPrefetchControl: {
    allow: false
  },
  
  // Remove X-Powered-By header
  hidePoweredBy: true,
  
  // Cross-Origin-Embedder-Policy
  crossOriginEmbedderPolicy: false, // Disabled for payment integrations
  
  // Cross-Origin-Opener-Policy
  crossOriginOpenerPolicy: {
    policy: 'same-origin-allow-popups' // Allow payment popups
  },
  
  // Cross-Origin-Resource-Policy
  crossOriginResourcePolicy: {
    policy: 'cross-origin' // Allow cross-origin requests for API
  }
});

// Additional custom security headers
export const additional_security_headers = (req, res, next) => {
  // Permissions Policy
  const permissions_header = Object.entries(permissions_policy)
    .map(([feature, allowlist]) => {
      if (allowlist.length === 0) {
        return `${feature}=()`;
      }
      return `${feature}=(${allowlist.map(origin => origin === 'self' ? 'self' : `"${origin}"`).join(' ')})`;
    })
    .join(', ');
  
  res.setHeader('Permissions-Policy', permissions_header);
  
  // Custom security headers
  res.setHeader('X-API-Version', process.env.npm_package_version || '1.0.0');
  res.setHeader('X-Rate-Limit-By', 'IP');
  
  // Prevent caching of sensitive endpoints
  if (req.originalUrl.includes('/api/auth') || 
      req.originalUrl.includes('/api/payments') ||
      req.originalUrl.includes('/api/admin')) {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
  
  // Add security token for API requests (prevents CSRF)
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    const csrf_token = req.get('X-CSRF-Token') || (req.body && req.body.csrf_token);
    if (!csrf_token && !req.originalUrl.includes('/api/payments/webhook')) {
      // Allow webhook endpoints to skip CSRF check
      req.security_flags = req.security_flags || {};
      req.security_flags.csrf_missing = true;
    }
  }
  
  next();
};

// Security monitoring middleware
export const security_monitor = (req, res, next) => {
  const start_time = Date.now();
  
  // Monitor for suspicious patterns
  const suspicious_patterns = [
    /\.\./,                    // Path traversal
    /<script|javascript:/i,    // XSS attempts
    /union.*select|drop.*table/i, // SQL injection
    /\beval\b|\balert\b/i,    // Code injection
    /\.\.\/|\.\.\\|\.\.\%2f/i // Path traversal variants
  ];
  
  const request_string = req.originalUrl + JSON.stringify(req.body) + JSON.stringify(req.query);
  const is_suspicious = suspicious_patterns.some(pattern => pattern.test(request_string));
  
  if (is_suspicious) {
    console.warn('🚨 Suspicious request detected:', {
      ip: req.ip,
      url: req.originalUrl,
      method: req.method,
      user_agent: req.get('user-agent'),
      timestamp: new Date().toISOString()
    });
    
    // Add security flag for logging
    req.security_flags = req.security_flags || {};
    req.security_flags.suspicious = true;
  }
  
  // Monitor response time for potential DoS attacks
  res.on('finish', () => {
    const response_time = Date.now() - start_time;
    if (response_time > 5000) { // 5 second threshold
      console.warn('⏱️  Slow response detected:', {
        ip: req.ip,
        url: req.originalUrl,
        response_time,
        status: res.statusCode
      });
    }
  });
  
  next();
};