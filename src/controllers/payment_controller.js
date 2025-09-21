import { PaymentService } from '../services/payment_service.js';

export class PaymentController {
  static async get_user_payments(req, res, next) {
    try {
      const filters = {
        status: req.query.status,
        page: req.query.page,
        limit: req.query.limit
      };

      const result = await PaymentService.get_user_payments(req.user.id, filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async get_by_id(req, res, next) {
    try {
      const { id } = req.params;
      const payment = await PaymentService.get_payment_by_id(id, req.user.id);
      res.json({ payment });
    } catch (error) {
      if (error.message === 'Payment not found') {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }

  static async get_status(req, res, next) {
    try {
      const { id } = req.params;
      const status = await PaymentService.get_payment_status(id, req.user.id);
      res.json(status);
    } catch (error) {
      if (error.message === 'Payment not found') {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }

  static async create_payfast_payment(req, res, next) {
    try {
      const {
        deal_id,
        venue_id,
        amount,
        voucher_ids,
        return_url,
        cancel_url
      } = req.body;

      // Create payment record
      const payment = await PaymentService.create_payment(req.user.id, {
        deal_id,
        venue_id,
        amount,
        payment_method: 'payfast',
        voucher_ids
      });

      // Generate PayFast URL
      const payment_url = await PaymentService.generate_payment_url({
        payment_id: payment.id,
        amount: payment.amount,
        item_name: 'ThirstyBird Voucher Purchase',
        return_url,
        cancel_url
      });

      res.status(201).json({
        payment_id: payment.id,
        payment_url,
        amount: payment.amount,
        status: payment.status
      });
    } catch (error) {
      next(error);
    }
  }

  static async handle_payfast_webhook(req, res, next) {
    try {
      const webhook_data = req.body;
      const signature = req.headers['x-signature'] || req.body.signature;

      // Validate webhook (important for production)
      const is_valid = await PaymentService.validate_payment_webhook(webhook_data, signature);
      if (!is_valid && process.env.NODE_ENV === 'production') {
        return res.status(400).json({ error: 'Invalid webhook signature' });
      }

      const result = await PaymentService.process_payfast_webhook(webhook_data);
      
      res.json({
        message: 'Webhook processed successfully',
        payment_id: result.payment.id,
        status: result.status
      });
    } catch (error) {
      console.error('PayFast webhook error:', error);
      
      // Return success even if processing fails to avoid PayFast retries
      // But log the error for investigation
      res.json({ 
        message: 'Webhook received',
        error: error.message 
      });
    }
  }

  static async retry_payment(req, res, next) {
    try {
      const { id } = req.params;
      const result = await PaymentService.retry_failed_payment(id, req.user.id);
      res.json(result);
    } catch (error) {
      if (error.message === 'Payment not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('Only failed payments')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }

  static async get_venue_payments(req, res, next) {
    try {
      const { venue_id } = req.params;
      const filters = {
        status: req.query.status,
        page: req.query.page,
        limit: req.query.limit
      };

      const result = await PaymentService.get_venue_payments(venue_id, filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async refund_payment(req, res, next) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      if (!reason) {
        return res.status(400).json({
          error: 'Validation failed',
          message: 'Refund reason is required'
        });
      }

      const result = await PaymentService.refund_payment(id, reason);
      res.json(result);
    } catch (error) {
      if (error.message === 'Payment not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('Only completed payments')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }

  static async get_analytics(req, res, next) {
    try {
      const { venue_id } = req.params;
      const { period_days = 30 } = req.query;
      
      const analytics = await PaymentService.get_payment_analytics(
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
      
      const analytics = await PaymentService.get_payment_analytics(
        null, // Global analytics
        parseInt(period_days)
      );
      
      res.json(analytics);
    } catch (error) {
      next(error);
    }
  }

  static async get_failed_payments(req, res, next) {
    try {
      const { hours = 24 } = req.query;
      const failed_payments = await PaymentService.get_failed_payments(parseInt(hours));
      
      res.json({
        failed_payments,
        hours_ago: parseInt(hours),
        count: failed_payments.length
      });
    } catch (error) {
      next(error);
    }
  }

  static async get_pending_payments(req, res, next) {
    try {
      const { hours = 2 } = req.query;
      const pending_payments = await PaymentService.get_pending_payments(parseInt(hours));
      
      res.json({
        pending_payments,
        hours_ago: parseInt(hours),
        count: pending_payments.length
      });
    } catch (error) {
      next(error);
    }
  }

  // Alternative payment methods (future)
  static async create_peach_payment(req, res, next) {
    try {
      res.status(501).json({
        error: 'Feature not available',
        message: 'Peach Payments integration coming soon'
      });
    } catch (error) {
      next(error);
    }
  }

  static async create_recurring_payment(req, res, next) {
    try {
      res.status(501).json({
        error: 'Feature not available',
        message: 'Recurring payments coming soon'
      });
    } catch (error) {
      next(error);
    }
  }
}