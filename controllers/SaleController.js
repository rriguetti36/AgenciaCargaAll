const SaleService = require('../services/SaleService');

class SaleController {
  static async getAll(req, res, next) {
    try {
      res.json(await SaleService.getAll());
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      res.json(await SaleService.getById(parseInt(req.params.id, 10)));
    } catch (err) {
      next(err);
    }
  }

  static async issue(req, res, next) {
    try {
      res.status(201).json(await SaleService.issue(parseInt(req.params.operationId, 10), req.body, req.user));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = SaleController;
