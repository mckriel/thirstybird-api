import { v4 as uuidv4 } from 'uuid';
import { VoucherModel } from '../models/voucher.js';
import { DealModel } from '../models/deal.js';
import { UserModel } from '../models/user.js';
import { PaymentModel } from '../models/payment.js';
import email_service from './email_service.js';

export class VoucherService {
  static generate_voucher_code() {
    return `TB-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
  }

  static async get_user_vouchers(user_id, filters = {}) {
    const vouchers = await VoucherModel.find_by_user(user_id, filters);
    const total = await VoucherModel.count_by_user(user_id, filters.status);
    
    const page = parseInt(filters.page || 1);
    const limit = parseInt(filters.limit || 20);
    
    return {
      vouchers,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit)
      }
    };
  }

  static async get_voucher_by_id(voucher_id, user_id = null) {
    const voucher = await VoucherModel.find_by_id(voucher_id, user_id);
    if (!voucher) {
      throw new Error('Voucher not found');
    }
    return voucher;
  }

  static async get_voucher_qr(voucher_id, user_id) {
    const qr_data = await VoucherModel.get_qr_data(voucher_id, user_id);
    if (!qr_data) {
      throw new Error('Voucher not found');
    }

    if (qr_data.status !== 'active') {
      throw new Error('QR code only available for active vouchers');
    }

    return {
      qr_code_data: qr_data.qr_code_data,
      voucher_code: qr_data.voucher_code
    };
  }

  static async purchase_vouchers(user_id, purchase_data) {
    const { deal_id, quantity = 1 } = purchase_data;

    // Get deal information with venue details
    const deal = await DealModel.find_by_id(deal_id);
    if (!deal) {
      throw new Error('Deal not found');
    }

    // Validate deal status and timing
    if (deal.status !== 'active') {
      throw new Error('Deal not active');
    }

    const now = new Date();
    if (now < new Date(deal.start_date) || now > new Date(deal.end_date)) {
      throw new Error('Deal not available');
    }

    // Check voucher availability
    const availability = await DealModel.check_availability(deal_id, quantity);
    if (!availability.available) {
      throw new Error(availability.reason);
    }

    // Check user purchase limits
    const user_voucher_count = await VoucherModel.check_user_purchase_limit(user_id, deal_id);
    if (user_voucher_count + quantity > deal.max_per_customer) {
      throw new Error(`Maximum ${deal.max_per_customer} vouchers per customer. You have ${user_voucher_count}.`);
    }

    // Age verification if required
    if (deal.requires_age_verification) {
      const user = await UserModel.find_by_id(user_id);
      if (!user.date_of_birth) {
        throw new Error('Age verification required. Please update your date of birth.');
      }

      const age = Math.floor((new Date() - new Date(user.date_of_birth)) / (365.25 * 24 * 60 * 60 * 1000));
      if (age < 18) {
        throw new Error('You must be 18 or older to purchase this deal');
      }
    }

    // Calculate total amount
    const total_amount = deal.deal_price * quantity;

    // Begin transaction - create vouchers and payment
    const vouchers = [];
    const voucher_ids = [];

    try {
      // Create vouchers
      for (let i = 0; i < quantity; i++) {
        const voucher_id = uuidv4();
        const voucher_code = this.generate_voucher_code();
        const expires_at = new Date(Date.now() + (90 * 24 * 60 * 60 * 1000)); // 90 days

        const qr_data = JSON.stringify({
          voucher_id,
          deal_id,
          venue_id: deal.venue_id,
          code: voucher_code
        });

        const voucher = await VoucherModel.create({
          id: voucher_id,
          user_id,
          deal_id,
          venue_id: deal.venue_id,
          voucher_code,
          qr_code_data: qr_data,
          purchase_price: deal.deal_price,
          expires_at
        });

        vouchers.push(voucher);
        voucher_ids.push(voucher_id);
      }

      // Create payment record
      const payment_id = uuidv4();
      const payment = await PaymentModel.create({
        id: payment_id,
        user_id,
        deal_id,
        venue_id: deal.venue_id,
        amount: total_amount,
        voucher_ids
      });

      // Update payment to completed (for direct purchases)
      await PaymentModel.update_status(payment_id, 'completed');

      // Send emails
      await this.send_purchase_emails(user_id, vouchers, deal, payment_id, total_amount);

      return {
        vouchers,
        payment_id,
        total_amount,
        message: 'Vouchers purchased successfully'
      };

    } catch (error) {
      // Clean up created vouchers on error
      // Note: In a real implementation, this should be wrapped in a database transaction
      console.error('Error during voucher purchase:', error);
      throw error;
    }
  }

  static async send_purchase_emails(user_id, vouchers, deal, payment_id, total_amount) {
    try {
      const user = await UserModel.find_by_id(user_id);
      const user_name = `${user.first_name} ${user.last_name}`;

      // Send purchase confirmation email
      const order_data = {
        payment_id,
        amount: total_amount,
        vouchers: vouchers.map(v => ({
          deal_title: deal.title,
          voucher_code: v.voucher_code
        }))
      };

      await email_service.send_purchase_confirmation_email(
        user.email,
        user_name,
        order_data
      );

      // Send individual voucher emails
      for (const voucher of vouchers) {
        const voucher_data = {
          id: voucher.id,
          voucher_code: voucher.voucher_code,
          deal_title: deal.title,
          venue_name: deal.venue_name,
          purchase_price: voucher.purchase_price,
          expires_at: voucher.expires_at
        };

        await email_service.send_voucher_email(
          user.email,
          user_name,
          voucher_data
        );
      }

      console.log(`✅ Purchase and voucher emails sent for ${vouchers.length} vouchers`);
    } catch (email_error) {
      console.error('❌ Failed to send purchase emails:', email_error.message);
      // Don't fail the purchase if emails fail
    }
  }

  static async redeem_voucher(voucher_code, redeemed_by_user_id) {
    const voucher = await VoucherModel.find_by_code(voucher_code);
    if (!voucher) {
      throw new Error('Invalid voucher code');
    }

    if (voucher.status !== 'active') {
      throw new Error(`This voucher has been ${voucher.status}`);
    }

    // Check expiry
    if (voucher.expires_at && new Date() > new Date(voucher.expires_at)) {
      await VoucherModel.update_status(voucher.id, 'expired');
      throw new Error('This voucher has expired');
    }

    // Update voucher status to redeemed
    const updated_voucher = await VoucherModel.update_status(
      voucher.id, 
      'redeemed', 
      redeemed_by_user_id
    );

    return {
      message: 'Voucher redeemed successfully',
      voucher: updated_voucher,
      customer_info: {
        name: `${voucher.first_name} ${voucher.last_name}`,
        email: voucher.email
      },
      deal_info: {
        title: voucher.deal_title,
        terms: voucher.terms_and_conditions
      }
    };
  }

  static async get_venue_vouchers(venue_id, filters = {}) {
    return await VoucherModel.get_venue_vouchers(venue_id, filters);
  }

  static async get_expiring_vouchers(days_ahead = 7) {
    const vouchers = await VoucherModel.get_expiring_vouchers(days_ahead);
    
    // Send expiry notification emails
    try {
      for (const voucher of vouchers) {
        // In a real implementation, you'd want to track which notifications have been sent
        // to avoid sending multiple reminders
        console.log(`📧 Voucher ${voucher.voucher_code} expires in ${days_ahead} days`);
      }
    } catch (error) {
      console.error('Error sending expiry notifications:', error);
    }

    return vouchers;
  }

  static async expire_old_vouchers() {
    const expired = await VoucherModel.expire_old_vouchers();
    console.log(`⏰ Expired ${expired.length} old vouchers`);
    return expired;
  }

  static async get_voucher_analytics(venue_id = null, period_days = 30) {
    const analytics = await VoucherModel.get_analytics(venue_id, period_days);
    
    // Calculate additional metrics
    const redemption_rate = analytics.total_vouchers > 0 
      ? ((analytics.redeemed_vouchers / analytics.total_vouchers) * 100).toFixed(2)
      : 0;
    
    const expiry_rate = analytics.total_vouchers > 0
      ? ((analytics.expired_vouchers / analytics.total_vouchers) * 100).toFixed(2)
      : 0;

    return {
      ...analytics,
      redemption_rate: parseFloat(redemption_rate),
      expiry_rate: parseFloat(expiry_rate),
      period_days
    };
  }

  static async transfer_voucher(voucher_id, from_user_id, to_email) {
    // This would be a future feature for transferring vouchers between users
    throw new Error('Voucher transfer feature not yet implemented');
  }

  static async refund_voucher(voucher_id, reason) {
    // This would be a future feature for refunding vouchers
    throw new Error('Voucher refund feature not yet implemented');
  }
}