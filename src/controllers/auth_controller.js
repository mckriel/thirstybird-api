import { AuthService } from '../services/auth_service.js';
import { register_schema, login_schema, user_update_schema } from '../validation/schemas.js';

export class AuthController {
  static async register(req, res, next) {
    try {
      const { error, value } = register_schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
          }))
        });
      }

      const result = await AuthService.register_user(value);

      res.status(201).json({
        message: 'Account created successfully',
        ...result
      });
    } catch (error) {
      if (error.message === 'Email already registered') {
        return res.status(400).json({
          error: 'Email already registered',
          message: 'An account with this email already exists'
        });
      }
      next(error);
    }
  }

  static async login(req, res, next) {
    try {
      const { error, value } = login_schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
          }))
        });
      }

      const { email, password } = value;
      const result = await AuthService.login_user(email, password);

      res.json({
        message: 'Login successful',
        ...result
      });
    } catch (error) {
      if (error.message === 'Invalid credentials') {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect'
        });
      }
      if (error.message === 'Account deactivated') {
        return res.status(401).json({
          error: 'Account deactivated',
          message: 'Your account has been deactivated. Please contact support.'
        });
      }
      next(error);
    }
  }

  static async get_profile(req, res, next) {
    try {
      const result = await AuthService.get_user_profile(req.user.id);
      res.json(result);
    } catch (error) {
      if (error.message === 'User not found') {
        return res.status(404).json({
          error: 'User not found'
        });
      }
      next(error);
    }
  }

  static async logout(req, res) {
    res.json({
      message: 'Logout successful'
    });
  }
}

export class UserController {
  static async get_profile(req, res, next) {
    try {
      const result = await AuthService.get_user_profile(req.user.id);
      res.json(result);
    } catch (error) {
      if (error.message === 'User not found') {
        return res.status(404).json({
          error: 'User not found'
        });
      }
      next(error);
    }
  }

  static async update_profile(req, res, next) {
    try {
      const { error, value } = user_update_schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
          }))
        });
      }

      const user = await AuthService.update_user_profile(req.user.id, value);

      res.json({
        message: 'Profile updated successfully',
        user
      });
    } catch (error) {
      if (error.message === 'No fields to update') {
        return res.status(400).json({
          error: 'No valid fields to update'
        });
      }
      next(error);
    }
  }

  static async change_password(req, res, next) {
    try {
      const { current_password, new_password } = req.body;

      if (!current_password || !new_password) {
        return res.status(400).json({
          error: 'Current password and new password are required'
        });
      }

      if (new_password.length < 8) {
        return res.status(400).json({
          error: 'New password must be at least 8 characters long'
        });
      }

      await AuthService.change_password(req.user.id, current_password, new_password);

      res.json({
        message: 'Password changed successfully'
      });
    } catch (error) {
      if (error.message === 'Current password is incorrect') {
        return res.status(400).json({
          error: 'Current password is incorrect'
        });
      }
      next(error);
    }
  }

  static async get_venues(req, res, next) {
    try {
      const venues = await AuthService.get_user_venues(req.user.id);
      res.json({
        venues
      });
    } catch (error) {
      next(error);
    }
  }

  static async get_venue_dashboard(req, res, next) {
    try {
      const { venue_id } = req.params;
      const dashboard_data = await VenueService.get_venue_dashboard(venue_id);

      res.json({
        ...dashboard_data,
        permissions: req.venue_profile?.permissions || []
      });
    } catch (error) {
      next(error);
    }
  }

  static async delete_account(req, res, next) {
    try {
      const { password } = req.body;

      if (!password) {
        return res.status(400).json({
          error: 'Password confirmation required'
        });
      }

      await AuthService.delete_user_account(req.user.id, password);

      res.json({
        message: 'Account deactivated successfully'
      });
    } catch (error) {
      if (error.message === 'Password is incorrect') {
        return res.status(400).json({
          error: 'Password is incorrect'
        });
      }
      if (error.message === 'Cannot delete account with active vouchers') {
        return res.status(400).json({
          error: 'Cannot delete account',
          message: 'You have active vouchers. Please use or request refunds for all vouchers before deleting your account.'
        });
      }
      next(error);
    }
  }
}