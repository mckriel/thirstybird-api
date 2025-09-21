import { v4 as uuidv4 } from 'uuid';
import { PaymentModel } from '../models/payment.js';
import { VoucherModel } from '../models/voucher.js';
import { UserModel } from '../models/user.js';
import { DealModel } from '../models/deal.js';

export class PaymentService {
  static async create_payment(user_id, payment_data) {
    const {
      deal_id, venue_id, amount, payment_method = 'payfast',
      external_payment_id, voucher_ids, payment_metadata = {}
    } = payment_data;

    const payment_id = uuidv4();

    const payment = await PaymentModel.create({
      id: payment_id,
      user_id,
      deal_id,
      venue_id,
      payment_method,
      amount,
      external_payment_id,
      payment_data: payment_metadata,
      voucher_ids
    });

    return payment;
  }

  static async get_payment_by_id(payment_id, user_id = null) {
    const payment = await PaymentModel.find_by_id(payment_id, user_id);
    if (!payment) {
      throw new Error('Payment not found');
    }
    return payment;
  }

  static async get_user_payments(user_id, filters = {}) {
    const payments = await PaymentModel.find_by_user(user_id, filters);
    const total = await PaymentModel.count_by_user(user_id, filters.status);
    
    const page = parseInt(filters.page || 1);
    const limit = parseInt(filters.limit || 20);
    
    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async process_payfast_webhook(webhook_data) {
    const {
      payment_id, payment_status, amount_gross, amount_fee,
      amount_net, custom_str1, signature
    } = webhook_data;

    // Verify PayFast signature (implementation depends on your PayFast setup)
    // This is a simplified version - you'd need proper signature verification
    
    const payment = await PaymentModel.find_by_external_id(payment_id);
    if (!payment) {
      throw new Error('Payment not found for external ID: ' + payment_id);
    }

    let new_status;
    switch (payment_status) {
      case 'COMPLETE':
        new_status = 'completed';
        break;
      case 'FAILED':
      case 'CANCELLED':
        new_status = 'failed';
        break;
      default:
        new_status = 'pending';
    }

    const webhook_payment_data = {
      payfast_data: webhook_data,
      amount_fee: amount_fee || 0,
      amount_net: amount_net || amount_gross,
      processed_at: new Date()
    };

    const updated_payment = await PaymentModel.update_status(
      payment.id, 
      new_status, 
      webhook_payment_data
    );

    // If payment completed, ensure vouchers are active
    if (new_status === 'completed' && payment.voucher_ids) {
      for (const voucher_id of payment.voucher_ids) {
        // Vouchers should already be created and active from purchase
        // This is just a safety check
        const voucher = await VoucherModel.find_by_id(voucher_id);
        if (voucher && voucher.status === 'pending') {
          await VoucherModel.update_status(voucher_id, 'active');
        }
      }
    }

    // If payment failed, mark vouchers as failed/refunded
    if (new_status === 'failed' && payment.voucher_ids) {
      for (const voucher_id of payment.voucher_ids) {
        await VoucherModel.update_status(voucher_id, 'refunded');
      }
    }

    return {
      payment: updated_payment,
      status: new_status,
      message: `Payment ${new_status}`
    };
  }

  static async get_payment_status(payment_id, user_id = null) {
    const payment = await this.get_payment_by_id(payment_id, user_id);
    
    return {
      payment_id: payment.id,
      external_payment_id: payment.external_payment_id,
      status: payment.status,
      amount: payment.amount,
      currency: payment.currency,
      payment_method: payment.payment_method,
      created_at: payment.created_at,
      processed_at: payment.processed_at,
      deal_title: payment.deal_title,
      venue_name: payment.venue_name
    };
  }

  static async get_venue_payments(venue_id, filters = {}) {
    const payments = await PaymentModel.get_venue_payments(venue_id, filters);
    
    return {
      payments,
      summary: {
        total_payments: payments.length,
        // Additional summary calculations could be added here
      }
    };
  }

  static async retry_failed_payment(payment_id, user_id) {
    const payment = await PaymentModel.find_by_id(payment_id, user_id);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'failed') {
      throw new Error('Only failed payments can be retried');
    }

    // Reset payment status to pending for retry
    const updated_payment = await PaymentModel.update_status(payment_id, 'pending');

    return {
      payment: updated_payment,
      message: 'Payment queued for retry',
      // Return new payment URL/instructions for user
    };
  }

  static async refund_payment(payment_id, refund_reason) {
    const payment = await PaymentModel.find_by_id(payment_id);
    if (!payment) {
      throw new Error('Payment not found');
    }

    if (payment.status !== 'completed') {
      throw new Error('Only completed payments can be refunded');
    }

    const refunded_payment = await PaymentModel.refund(payment_id, refund_reason);

    return {
      payment: refunded_payment,
      message: 'Payment refunded successfully'
    };
  }

  static async get_payment_analytics(venue_id = null, period_days = 30) {
    const analytics = await PaymentModel.get_analytics(venue_id, period_days);
    const daily_revenue = await PaymentModel.get_daily_revenue(venue_id, period_days);
    
    // Calculate success rate
    const success_rate = analytics.total_payments > 0
      ? ((analytics.completed_payments / analytics.total_payments) * 100).toFixed(2)
      : 0;

    return {
      ...analytics,
      success_rate: parseFloat(success_rate),
      daily_revenue,
      period_days
    };
  }

  static async get_failed_payments(hours_ago = 24) {
    return await PaymentModel.get_failed_payments(hours_ago);
  }

  static async get_pending_payments(hours_ago = 2) {
    return await PaymentModel.get_pending_payments(hours_ago);
  }

  static async process_recurring_payment(user_id, subscription_data) {
    // Future feature for subscription/recurring payments
    throw new Error('Recurring payments not yet implemented');
  }

  static async validate_payment_webhook(webhook_data, signature) {
    // Implement PayFast signature validation
    // This is a critical security feature for production
    
    const { 
      PAYFAST_MERCHANT_ID, 
      PAYFAST_MERCHANT_KEY, 
      PAYFAST_PASSPHRASE 
    } = process.env;

    // Simplified validation - implement proper PayFast signature check
    if (process.env.NODE_ENV === 'production') {
      // TODO: Implement proper PayFast signature validation
      // This should verify the MD5 signature against the webhook data
      console.warn('⚠️  PayFast signature validation not implemented');
    }

    return true; // For development
  }

  static async generate_payment_url(payment_data) {
    // Generate PayFast payment URL
    const {
      payment_id, amount, item_name, return_url, cancel_url, notify_url
    } = payment_data;

    const payfast_data = {
      merchant_id: process.env.PAYFAST_MERCHANT_ID,
      merchant_key: process.env.PAYFAST_MERCHANT_KEY,
      return_url: return_url || `${process.env.FRONTEND_URL}/payment/success`,
      cancel_url: cancel_url || `${process.env.FRONTEND_URL}/payment/cancel`,
      notify_url: notify_url || `${process.env.API_URL}/api/payments/webhook/payfast`,
      name_first: 'ThirstyBird',
      name_last: 'Customer',
      email_address: 'customer@example.com', // This should come from user data
      m_payment_id: payment_id,
      amount: amount.toFixed(2),
      item_name: item_name || 'ThirstyBird Voucher Purchase'
    };

    const base_url = process.env.PAYFAST_SANDBOX === 'true' 
      ? 'https://sandbox.payfast.co.za/eng/process'
      : 'https://www.payfast.co.za/eng/process';

    const params = new URLSearchParams(payfast_data).toString();
    
    return `${base_url}?${params}`;
  }
}