const QuotationService = require('../services/QuotationService');

class QuotationController {
  static async getAll(req, res, next) {
    try {
      res.json(await QuotationService.getAll(req.user));
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      res.json(await QuotationService.getById(parseInt(req.params.id, 10), req.user));
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      res.status(201).json(await QuotationService.create(req.body, req.user));
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      res.json(await QuotationService.update(parseInt(req.params.id, 10), req.body, req.user));
    } catch (err) {
      next(err);
    }
  }

  static async updateStatus(req, res, next) {
    try {
      res.json(await QuotationService.updateStatus(parseInt(req.params.id, 10), req.body.status, req.user));
    } catch (err) {
      next(err);
    }
  }

  static async convertToOperation(req, res, next) {
    try {
      res.status(201).json(await QuotationService.convertToOperation(parseInt(req.params.id, 10), req.body, req.user));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = QuotationController;
