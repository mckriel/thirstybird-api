import { DealService } from '../services/deal_service.js';
import { deal_schema, deal_update_schema } from '../validation/schemas.js';

export class DealController {
  static async get_all(req, res, next) {
    try {
      const filters = {
        city: req.query.city,
        venue_id: req.query.venue_id,
        search: req.query.search,
        min_savings: req.query.min_savings,
        max_price: req.query.max_price,
        page: req.query.page,
        limit: req.query.limit
      };

      const result = await DealService.get_deals(filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async get_by_id(req, res, next) {
    try {
      const { id } = req.params;
      const deal = await DealService.get_deal_by_id(id);
      res.json({ deal });
    } catch (error) {
      if (error.message === 'Deal not found') {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }

  static async create(req, res, next) {
    try {
      const { error, value } = deal_schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
          }))
        });
      }

      const deal = await DealService.create_deal(req.user.id, value);
      res.status(201).json({
        message: 'Deal created successfully',
        deal
      });
    } catch (error) {
      if (error.message.includes('not found') || error.message.includes('must be')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }

  static async update(req, res, next) {
    try {
      const { id } = req.params;
      const { error, value } = deal_update_schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
          }))
        });
      }

      const deal = await DealService.update_deal(id, req.user.id, value);
      res.json({
        message: 'Deal updated successfully',
        deal
      });
    } catch (error) {
      if (error.message === 'Deal not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('must be')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }

  static async delete(req, res, next) {
    try {
      const { id } = req.params;
      const result = await DealService.end_deal(id, req.user.id);
      res.json(result);
    } catch (error) {
      if (error.message === 'Deal not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('Only')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }

  static async activate(req, res, next) {
    try {
      const { id } = req.params;
      const deal = await DealService.activate_deal(id, req.user.id);
      res.json({
        message: 'Deal activated successfully',
        deal
      });
    } catch (error) {
      if (error.message === 'Deal not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('Only') || error.message.includes('Cannot')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }

  static async pause(req, res, next) {
    try {
      const { id } = req.params;
      const deal = await DealService.pause_deal(id, req.user.id);
      res.json({
        message: 'Deal paused successfully',
        deal
      });
    } catch (error) {
      if (error.message === 'Deal not found') {
        return res.status(404).json({ error: error.message });
      }
      if (error.message.includes('Only')) {
        return res.status(400).json({ error: error.message });
      }
      next(error);
    }
  }

  static async check_availability(req, res, next) {
    try {
      const { id } = req.params;
      const { quantity = 1 } = req.query;
      
      const availability = await DealService.check_deal_availability(id, parseInt(quantity));
      res.json({
        deal_id: id,
        quantity: parseInt(quantity),
        ...availability
      });
    } catch (error) {
      if (error.message === 'Deal not found') {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }

  static async get_analytics(req, res, next) {
    try {
      const { id } = req.params;
      const { period_days = 30 } = req.query;
      
      const analytics = await DealService.get_deal_analytics(id, parseInt(period_days));
      res.json(analytics);
    } catch (error) {
      if (error.message === 'Deal not found') {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }

  static async get_venue_deals(req, res, next) {
    try {
      const { venue_id } = req.params;
      const { status } = req.query;
      
      const deals = await DealService.get_deals_by_venue(venue_id, status);
      res.json({ deals });
    } catch (error) {
      if (error.message === 'Venue not found') {
        return res.status(404).json({ error: error.message });
      }
      next(error);
    }
  }

  static async search(req, res, next) {
    try {
      const search_params = {
        query: req.query.q,
        city: req.query.city,
        min_savings: req.query.min_savings,
        max_price: req.query.max_price,
        category: req.query.category,
        page: req.query.page,
        limit: req.query.limit
      };

      const result = await DealService.search_deals(search_params);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async get_trending(req, res, next) {
    try {
      const { limit = 10 } = req.query;
      const deals = await DealService.get_trending_deals(parseInt(limit));
      res.json({ deals });
    } catch (error) {
      next(error);
    }
  }

  static async get_expiring(req, res, next) {
    try {
      const { days = 7 } = req.query;
      const deals = await DealService.get_expiring_deals(parseInt(days));
      res.json({ deals });
    } catch (error) {
      next(error);
    }
  }
}