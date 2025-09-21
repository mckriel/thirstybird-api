import express from 'express';
import { AuthController } from '../controllers/auth_controller.js';
import { authenticate_token } from '../middleware/auth.js';
import { auth_rate_limit } from '../middleware/rate_limiter.js';

const router = express.Router();

router.post('/register', auth_rate_limit, AuthController.register);
router.post('/login', auth_rate_limit, AuthController.login);
router.get('/me', authenticate_token, AuthController.get_profile);
router.post('/logout', authenticate_token, AuthController.logout);

export default router;