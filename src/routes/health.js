import express from 'express';

const router = express.Router();

router.get('/', (req, res) => {
  res.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    environment: process.env.NODE_ENV,
    architecture: '3-Layer (Controllers → Services → Models)'
  });
});

export default router;