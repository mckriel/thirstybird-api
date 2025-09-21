import { VenueService } from '../services/venue_service.js';
import { venue_schema, venue_update_schema } from '../validation/schemas.js';

export class VenueController {
  static async get_venues(req, res, next) {
    try {
      const filters = {
        city: req.query.city,
        search: req.query.search,
        page: req.query.page,
        limit: req.query.limit
      };

      const result = await VenueService.get_venues(filters);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }

  static async get_venue(req, res, next) {
    try {
      const { id } = req.params;
      const result = await VenueService.get_venue_details(id);
      res.json(result);
    } catch (error) {
      if (error.message === 'Venue not found') {
        return res.status(404).json({
          error: 'Venue not found'
        });
      }
      next(error);
    }
  }

  static async create_venue(req, res, next) {
    try {
      const { error, value } = venue_schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
          }))
        });
      }

      const venue = await VenueService.create_venue(req.user.id, value);

      res.status(201).json({
        message: 'Venue created successfully',
        venue
      });
    } catch (error) {
      next(error);
    }
  }

  static async update_venue(req, res, next) {
    try {
      const { error, value } = venue_update_schema.validate(req.body);
      if (error) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.details.map(d => ({
            field: d.path.join('.'),
            message: d.message
          }))
        });
      }

      const { id } = req.params;
      const venue = await VenueService.update_venue(id, value);

      res.json({
        message: 'Venue updated successfully',
        venue
      });
    } catch (error) {
      if (error.message === 'Venue not found') {
        return res.status(404).json({
          error: 'Venue not found'
        });
      }
      if (error.message === 'No fields to update') {
        return res.status(400).json({
          error: 'No valid fields to update'
        });
      }
      next(error);
    }
  }

  static async get_analytics(req, res, next) {
    try {
      const { id } = req.params;
      const { period = '30' } = req.query;

      const result = await VenueService.get_venue_analytics(id, period);
      res.json(result);
    } catch (error) {
      next(error);
    }
  }
}