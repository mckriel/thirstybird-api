import express from 'express';
import { VoucherController } from '../controllers/voucher_controller.js';
import { authenticate_token, require_role } from '../middleware/auth.js';

const router = express.Router();

// Customer voucher management
router.get('/', authenticate_token, VoucherController.get_user_vouchers);
router.get('/:id', authenticate_token, VoucherController.get_by_id);
router.get('/:id/qr', authenticate_token, VoucherController.get_qr_code);

// Voucher purchasing
router.post('/purchase', authenticate_token, VoucherController.purchase);

// Voucher redemption (for venue staff)
router.post('/redeem', authenticate_token, require_role('venue'), VoucherController.redeem);

// Venue voucher management
router.get('/venue/:venue_id', authenticate_token, require_role('venue'), VoucherController.get_venue_vouchers);
router.get('/venue/:venue_id/analytics', authenticate_token, require_role('venue'), VoucherController.get_analytics);

// Admin/system routes
router.get('/admin/expiring', authenticate_token, require_role('admin'), VoucherController.get_expiring);
router.post('/admin/expire', authenticate_token, require_role('admin'), VoucherController.expire_old);
router.get('/admin/analytics', authenticate_token, require_role('admin'), VoucherController.get_global_analytics);

// Future features
router.post('/:id/transfer', authenticate_token, VoucherController.transfer);
router.post('/:id/refund', authenticate_token, require_role('admin'), VoucherController.refund);

export default router;