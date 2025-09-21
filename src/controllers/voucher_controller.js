import QRCode from 'qrcode';
import { VoucherService } from '../services/voucher_service.js';
import { voucher_purchase_schema, voucher_redeem_schema } from '../validation/schemas.js';

export class VoucherController {
  static async get_user_vouchers(req, res, next) {
    try {
      const filters = {
        status: req.query.status,
        page: req.query.page,
        limit: req.query.limit
      };

      const result = await VoucherService.get_user_vouchers(req.user.id, filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async get_by_id(req, res, next) {
    try {
      const { id } = req.params;
      const voucher = await VoucherService.get_voucher_by_id(id, req.user.id);
      res.json({ voucher });
    } catch (error) {
      if (error.message === 'Voucher not found') {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }

  static async get_qr_code(req, res, next) {
    try {
      const { id } = req.params;
      const qr_data = await VoucherService.get_voucher_qr(id, req.user.id);

      // Generate QR code image
      const qr_code_url = await QRCode.toDataURL(qr_data.qr_code_data, {
        width: 400,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      res.json({
        qr_code: qr_code_url,
        voucher_code: qr_data.voucher_code
      });
    } catch (error) {
      if (error.message === 'Voucher not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('only available')) {
        return res.status(400).json({ 
          error: 'Voucher not active',
          message: error.message
        });
      }
      next(error);
    }
  }

  static async purchase(req, res, next) {
    try {
      const { error, value } = voucher_purchase_schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
          }))
        });
      }

      const result = await VoucherService.purchase_vouchers(req.user.id, value);
      res.status(201).json(result);
    } catch (error) {
      if (error.message.includes('not found') || 
          error.message.includes('not active') ||
          error.message.includes('not available') ||
          error.message.includes('Insufficient') ||
          error.message.includes('exceeded') ||
          error.message.includes('verification') ||
          error.message.includes('18 or older')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }

  static async redeem(req, res, next) {
    try {
      const { error, value } = voucher_redeem_schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
          }))
        });
      }

      const { voucher_code } = value;
      const result = await VoucherService.redeem_voucher(voucher_code, req.user.id);
      res.json(result);
    } catch (error) {
      if (error.message === 'Invalid voucher code') {
        return res.status(404).json({
          error: 'Voucher not found',
          message: error.message
        });
      }
      if (error.message.includes('has been') || error.message.includes('expired')) {
        return res.status(400).json({
          error: 'Voucher not valid',
          message: error.message
        });
      }
      next(error);
    }
  }

  static async get_venue_vouchers(req, res, next) {
    try {
      const { venue_id } = req.params;
      const filters = {
        status: req.query.status,
        page: req.query.page,
        limit: req.query.limit
      };

      const vouchers = await VoucherService.get_venue_vouchers(venue_id, filters);
      res.json({ vouchers });
    } catch (error) {
      next(error);
    }
  }

  static async get_expiring(req, res, next) {
    try {
      const { days = 7 } = req.query;
      const vouchers = await VoucherService.get_expiring_vouchers(parseInt(days));
      res.json({ 
        vouchers,
        days_ahead: parseInt(days)
      });
    } catch (error) {
      next(error);
    }
  }

  static async expire_old(req, res, next) {
    try {
      const expired_vouchers = await VoucherService.expire_old_vouchers();
      res.json({
        message: `Expired ${expired_vouchers.length} vouchers`,
        expired_vouchers
      });
    } catch (error) {
      next(error);
    }
  }

  static async get_analytics(req, res, next) {
    try {
      const { venue_id } = req.params;
      const { period_days = 30 } = req.query;
      
      const analytics = await VoucherService.get_voucher_analytics(
        venue_id, 
        parseInt(period_days)
      );
      
      res.json(analytics);
    } catch (error) {
      next(error);
    }
  }

  static async get_global_analytics(req, res, next) {
    try {
      const { period_days = 30 } = req.query;
      
      const analytics = await VoucherService.get_voucher_analytics(
        null, // Global analytics
        parseInt(period_days)
      );
      
      res.json(analytics);
    } catch (error) {
      next(error);
    }
  }

  // Future features - not yet implemented in service
  static async transfer(req, res, next) {
    try {
      const { id } = req.params;
      const { to_email } = req.body;
      
      const result = await VoucherService.transfer_voucher(id, req.user.id, to_email);
      res.json(result);
    } catch (error) {
      if (error.message.includes('not yet implemented')) {
        return res.status(501).json({
          error: 'Feature not available',
          message: 'Voucher transfer feature coming soon'
        });
      }
      next(error);
    }
  }

  static async refund(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;
      
      const result = await VoucherService.refund_voucher(id, reason);
      res.json(result);
    } catch (error) {
      if (error.message.includes('not yet implemented')) {
        return res.status(501).json({
          error: 'Feature not available',
          message: 'Voucher refund feature coming soon'
        });
      }
      next(error);
    }
  }
}