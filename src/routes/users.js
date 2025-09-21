import express from 'express';
import { UserController } from '../controllers/auth_controller.js';
import { authenticate_token, require_role } from '../middleware/auth.js';

const router = express.Router();

router.get('/profile', authenticate_token, UserController.get_profile);
router.put('/profile', authenticate_token, UserController.update_profile);
router.put('/change-password', authenticate_token, UserController.change_password);
router.get('/venues', authenticate_token, require_role('venue'), UserController.get_venues);
router.get('/venues/:venue_id/dashboard', authenticate_token, require_role('venue'), UserController.get_venue_dashboard);
router.delete('/account', authenticate_token, UserController.delete_account);

export default router;