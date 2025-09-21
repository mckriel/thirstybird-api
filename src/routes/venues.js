import express from 'express';
import { VenueController } from '../controllers/venue_controller.js';
import { authenticate_token, require_role, verify_venue_access } from '../middleware/auth.js';

const router = express.Router();

router.get('/', VenueController.get_venues);
router.get('/:id', VenueController.get_venue);
router.post('/', authenticate_token, require_role('venue'), VenueController.create_venue);
router.put('/:id', authenticate_token, require_role('venue'), verify_venue_access, VenueController.update_venue);
router.get('/:id/analytics', authenticate_token, require_role('venue'), verify_venue_access, VenueController.get_analytics);

export default router;