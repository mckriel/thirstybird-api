import express from 'express';
import { DealController } from '../controllers/deal_controller.js';
import { authenticate_token, require_role, verify_venue_access } from '../middleware/auth.js';

const router = express.Router();

// Public routes
router.get('/', DealController.get_all);
router.get('/search', DealController.search);
router.get('/trending', DealController.get_trending);
router.get('/expiring', DealController.get_expiring);
router.get('/:id', DealController.get_by_id);
router.get('/:id/availability', DealController.check_availability);

// Venue management routes
router.post('/', authenticate_token, require_role('venue'), DealController.create);
router.put('/:id', authenticate_token, require_role('venue'), DealController.update);
router.delete('/:id', authenticate_token, require_role('venue'), DealController.delete);

// Deal status management
router.post('/:id/activate', authenticate_token, require_role('venue'), DealController.activate);
router.post('/:id/pause', authenticate_token, require_role('venue'), DealController.pause);

// Analytics
router.get('/:id/analytics', authenticate_token, require_role('venue'), DealController.get_analytics);

// Venue-specific deals
router.get('/venue/:venue_id', DealController.get_venue_deals);

export default router;