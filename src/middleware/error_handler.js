export const error_handler = (error, req, res, next) => {
  console.error('API Error:', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    body: req.body,
    params: req.params,
    query: req.query
  });

  if (error.code === '23505') {
    return res.status(400).json({ 
      error: 'Duplicate entry', 
      field: error.detail 
    });
  }

  if (error.code === '23503') {
    return res.status(400).json({ 
      error: 'Referenced record not found' 
    });
  }

  if (error.isJoi) {
    return res.status(400).json({ 
      error: 'Validation failed',
      details: error.details.map(d => ({
        field: d.path.join('.'),
        message: d.message
      }))
    });
  }

  if (error.name === 'JsonWebTokenError') {
    return res.status(401).json({ error: 'Invalid token' });
  }

  if (error.name === 'TokenExpiredError') {
    return res.status(401).json({ error: 'Token expired' });
  }

  if (error.type === 'payment_error') {
    return res.status(402).json({ 
      error: 'Payment failed', 
      message: error.message 
    });
  }

  const status = error.statusCode || error.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error'
    : error.message;

  res.status(status).json({ 
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { 
      stack: error.stack 
    })
  });
};