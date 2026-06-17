const ProfitabilityService = require('../services/ProfitabilityService');

class ProfitabilityController {
  static async dashboard(req, res, next) {
    try {
      res.json(await ProfitabilityService.getDashboard());
    } catch (err) {
      next(err);
    }
  }

  static async getCosts(req, res, next) {
    try {
      res.json(await ProfitabilityService.getCosts(parseInt(req.params.id, 10)));
    } catch (err) {
      next(err);
    }
  }

  static async createCost(req, res, next) {
    try {
      res.status(201).json(await ProfitabilityService.createCost(parseInt(req.params.id, 10), req.body, req.user));
    } catch (err) {
      next(err);
    }
  }

  static async updateCost(req, res, next) {
    try {
      res.json(await ProfitabilityService.updateCost(parseInt(req.params.costId, 10), req.body, req.user));
    } catch (err) {
      next(err);
    }
  }

  static async cancelCost(req, res, next) {
    try {
      res.json(await ProfitabilityService.cancelCost(parseInt(req.params.costId, 10), req.user));
    } catch (err) {
      next(err);
    }
  }

  static async getSummary(req, res, next) {
    try {
      res.json(await ProfitabilityService.getSummary(parseInt(req.params.id, 10)));
    } catch (err) {
      next(err);
    }
  }

  static async getCommissions(req, res, next) {
    try {
      res.json(await ProfitabilityService.getCommissions(parseInt(req.params.id, 10)));
    } catch (err) {
      next(err);
    }
  }

  static async updateCommissionStatus(req, res, next) {
    try {
      res.json(await ProfitabilityService.updateCommissionStatus(parseInt(req.params.commissionId, 10), req.body.status, req.user));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ProfitabilityController;
