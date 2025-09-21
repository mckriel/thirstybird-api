import nodemailer from 'nodemailer';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmailService {
  constructor() {
    this.transporter = null;
    this.init_transporter();
  }

  init_transporter() {
    // Configure nodemailer transporter based on environment
    const config = {
      host: process.env.SMTP_HOST || 'localhost',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_PORT === '465', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    };

    // For development, use ethereal email or log to console
    if (process.env.NODE_ENV === 'development' && !process.env.SMTP_USER) {
      console.log('📧 Email service: Using console logging for development');
      this.transporter = this.create_development_transporter();
    } else if (process.env.NODE_ENV === 'test') {
      console.log('📧 Email service: Using test mode');
      this.transporter = this.create_test_transporter();
    } else {
      this.transporter = nodemailer.createTransport(config);
    }
  }

  create_development_transporter() {
    // Create a transporter that logs emails to console instead of sending
    return {
      sendMail: async (mail_options) => {
        console.log('🔍 Development Email (not sent):');
        console.log('To:', mail_options.to);
        console.log('Subject:', mail_options.subject);
        console.log('HTML Content:', mail_options.html);
        console.log('Text Content:', mail_options.text);
        console.log('---');
        
        return {
          messageId: 'dev-' + Date.now(),
          accepted: [mail_options.to],
          rejected: [],
          response: 'Development mode - email logged to console'
        };
      }
    };
  }

  create_test_transporter() {
    // Create a mock transporter for testing
    return {
      sendMail: async (mail_options) => {
        return {
          messageId: 'test-' + Date.now(),
          accepted: [mail_options.to],
          rejected: [],
          response: 'Test mode - email mocked'
        };
      }
    };
  }

  async send_email(to, subject, html_content, text_content) {
    try {
      const mail_options = {
        from: process.env.FROM_EMAIL || 'noreply@thirstybird.co.za',
        to,
        subject,
        html: html_content,
        text: text_content || html_content.replace(/<[^>]*>/g, '') // Strip HTML for text version
      };

      const result = await this.transporter.sendMail(mail_options);
      console.log('✅ Email sent successfully:', result.messageId);
      return result;
    } catch (error) {
      console.error('❌ Email sending failed:', error);
      throw new Error(`Email sending failed: ${error.message}`);
    }
  }

  async load_template(template_name) {
    try {
      const template_path = path.join(__dirname, '../templates/email', `${template_name}.html`);
      const template_content = await fs.readFile(template_path, 'utf-8');
      return template_content;
    } catch (error) {
      console.error(`❌ Failed to load email template: ${template_name}`, error);
      throw new Error(`Email template not found: ${template_name}`);
    }
  }

  replace_template_variables(template, variables) {
    let processed_template = template;
    
    for (const [key, value] of Object.entries(variables)) {
      const placeholder = `{{${key}}}`;
      processed_template = processed_template.replace(new RegExp(placeholder, 'g'), value);
    }
    
    return processed_template;
  }

  async send_welcome_email(user_email, user_name) {
    try {
      const template = await this.load_template('welcome');
      const html_content = this.replace_template_variables(template, {
        user_name,
        frontend_url: process.env.FRONTEND_URL || 'http://localhost:5173'
      });

      return await this.send_email(
        user_email,
        'Welcome to ThirstyBird! 🐦',
        html_content
      );
    } catch (error) {
      console.error('❌ Failed to send welcome email:', error);
      throw error;
    }
  }

  async send_voucher_email(user_email, user_name, voucher_data) {
    try {
      const template = await this.load_template('voucher');
      const html_content = this.replace_template_variables(template, {
        user_name,
        voucher_code: voucher_data.voucher_code,
        deal_title: voucher_data.deal_title,
        venue_name: voucher_data.venue_name,
        purchase_price: voucher_data.purchase_price,
        expires_at: new Date(voucher_data.expires_at).toLocaleDateString(),
        qr_code_url: `${process.env.API_URL}/api/vouchers/${voucher_data.id}/qr`,
        frontend_url: process.env.FRONTEND_URL || 'http://localhost:5173'
      });

      return await this.send_email(
        user_email,
        `Your ThirstyBird Voucher: ${voucher_data.deal_title} 🎟️`,
        html_content
      );
    } catch (error) {
      console.error('❌ Failed to send voucher email:', error);
      throw error;
    }
  }

  async send_password_reset_email(user_email, user_name, reset_token) {
    try {
      const template = await this.load_template('password-reset');
      const reset_url = `${process.env.FRONTEND_URL}/reset-password?token=${reset_token}`;
      
      const html_content = this.replace_template_variables(template, {
        user_name,
        reset_url,
        frontend_url: process.env.FRONTEND_URL || 'http://localhost:5173'
      });

      return await this.send_email(
        user_email,
        'Reset Your ThirstyBird Password 🔐',
        html_content
      );
    } catch (error) {
      console.error('❌ Failed to send password reset email:', error);
      throw error;
    }
  }

  async send_purchase_confirmation_email(user_email, user_name, order_data) {
    try {
      const template = await this.load_template('purchase-confirmation');
      const html_content = this.replace_template_variables(template, {
        user_name,
        order_id: order_data.payment_id,
        total_amount: order_data.amount,
        voucher_count: order_data.vouchers.length,
        deal_titles: order_data.vouchers.map(v => v.deal_title).join(', '),
        frontend_url: process.env.FRONTEND_URL || 'http://localhost:5173'
      });

      return await this.send_email(
        user_email,
        `Purchase Confirmation - Order #${order_data.payment_id} 🛒`,
        html_content
      );
    } catch (error) {
      console.error('❌ Failed to send purchase confirmation email:', error);
      throw error;
    }
  }

  // Verify email service configuration
  async verify_connection() {
    try {
      if (process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test') {
        console.log('📧 Email service: Development/Test mode - verification skipped');
        return true;
      }

      await this.transporter.verify();
      console.log('✅ Email service: Connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email service: Connection verification failed', error);
      return false;
    }
  }
}

// Create singleton instance
const email_service = new EmailService();

export default email_service;