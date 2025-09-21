import express from 'express';
import { PaymentController } from '../controllers/payment_controller.js';
import { authenticate_token, require_role } from '../middleware/auth.js';
import { payment_rate_limit } from '../middleware/rate_limiter.js';

const router = express.Router();

// Customer payment management
router.get('/', authenticate_token, PaymentController.get_user_payments);
router.get('/:id', authenticate_token, PaymentController.get_by_id);
router.get('/:id/status', authenticate_token, PaymentController.get_status);

// Payment creation
router.post('/payfast', authenticate_token, payment_rate_limit, PaymentController.create_payfast_payment);

// Payment webhooks (no authentication - external service)
router.post('/webhook/payfast', PaymentController.handle_payfast_webhook);

// Payment management
router.post('/:id/retry', authenticate_token, PaymentController.retry_payment);

// Venue payment management
router.get('/venue/:venue_id', authenticate_token, require_role('venue'), PaymentController.get_venue_payments);
router.get('/venue/:venue_id/analytics', authenticate_token, require_role('venue'), PaymentController.get_analytics);

// Admin payment management
router.post('/:id/refund', authenticate_token, require_role('admin'), PaymentController.refund_payment);
router.get('/admin/failed', authenticate_token, require_role('admin'), PaymentController.get_failed_payments);
router.get('/admin/pending', authenticate_token, require_role('admin'), PaymentController.get_pending_payments);
router.get('/admin/analytics', authenticate_token, require_role('admin'), PaymentController.get_global_analytics);

// Alternative payment methods (future)
router.post('/peach', authenticate_token, payment_rate_limit, PaymentController.create_peach_payment);
router.post('/recurring', authenticate_token, PaymentController.create_recurring_payment);

export default router;