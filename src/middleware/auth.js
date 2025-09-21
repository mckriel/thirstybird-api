import jwt from 'jsonwebtoken';
import { db } from '../database/connection.js';

export const authenticate_token = async (req, res, next) => {
  const auth_header = req.headers['authorization'];
  const token = auth_header && auth_header.split(' ')[1];

  if (!token) {
    return res.status(401).json({ 
      error: 'Access token required',
      message: 'Please provide a valid authentication token'
    });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    const query = `
      SELECT 
        id, 
        email, 
        role, 
        is_active, 
        created_at,
        updated_at 
      FROM users 
      WHERE id = $1
    `;
    const result = await db.query(query, [decoded.user_id]);
    
    if (!result.rows[0]) {
      return res.status(401).json({ 
        error: 'User not found',
        message: 'The token refers to a user that no longer exists'
      });
    }

    const user = result.rows[0];
    
    if (!user.is_active) {
      return res.status(401).json({ 
        error: 'Account deactivated',
        message: 'Your account has been deactivated. Please contact support.'
      });
    }

    req.user = user;
    next();

  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ 
        error: 'Token expired',
        message: 'Your session has expired. Please log in again.'
      });
    }
    
    if (error.name === 'JsonWebTokenError') {
      return res.status(403).json({ 
        error: 'Invalid token',
        message: 'The provided token is invalid or malformed'
      });
    }
    
    console.error('Auth middleware error:', error);
    return res.status(500).json({ 
      error: 'Authentication error',
      message: 'An error occurred during authentication'
    });
  }
};

export const require_role = (required_role) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ 
        error: 'Authentication required',
        message: 'Please log in to access this resource'
      });
    }

    if (req.user.role === 'admin') {
      return next();
    }

    if (req.user.role !== required_role) {
      return res.status(403).json({ 
        error: 'Insufficient permissions',
        message: `This action requires ${required_role} role. You have ${req.user.role} role.`,
        required_role,
        current_role: req.user.role
      });
    }

    next();
  };
};

export const optional_auth = async (req, res, next) => {
  const auth_header = req.headers['authorization'];
  const token = auth_header && auth_header.split(' ')[1];

  if (!token) {
    req.user = null;
    return next();
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const query = `
      SELECT 
        id, 
        email, 
        role, 
        is_active, 
        created_at,
        updated_at 
      FROM users 
      WHERE id = $1 AND is_active = true
    `;
    const result = await db.query(query, [decoded.user_id]);
    
    req.user = result.rows[0] || null;
  } catch (error) {
    req.user = null;
  }

  next();
};

export const verify_venue_access = async (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ 
      error: 'Authentication required' 
    });
  }

  const venue_id = req.params.venue_id || req.body.venue_id;
  
  if (!venue_id) {
    return res.status(400).json({ 
      error: 'Venue ID required',
      message: 'Please provide a valid venue ID'
    });
  }

  try {
    if (req.user.role === 'admin') {
      return next();
    }

    const query = `
      SELECT vp.id, vp.permissions, v.name as venue_name
      FROM venue_profiles vp
      JOIN venues v ON v.id = vp.venue_id
      WHERE vp.user_id = $1 AND vp.venue_id = $2
    `;
    const result = await db.query(query, [req.user.id, venue_id]);
    
    if (!result.rows[0]) {
      return res.status(403).json({ 
        error: 'Venue access denied',
        message: 'You do not have access to this venue'
      });
    }

    req.venue_profile = result.rows[0];
    next();

  } catch (error) {
    console.error('Venue access verification error:', error);
    return res.status(500).json({ 
      error: 'Venue access verification failed' 
    });
  }
};

export const generate_token = (user_id, role = 'customer') => {
  return jwt.sign(
    { 
      user_id, 
      role,
      iat: Math.floor(Date.now() / 1000)
    },
    process.env.JWT_SECRET,
    { 
      expiresIn: process.env.JWT_EXPIRES_IN || '7d'
    }
  );
};

export const verify_token_only = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    return null;
  }
};