const CustomerService = require('../services/CustomerService');

class CustomerController {
  static async getAll(req, res, next) {
    try {
      res.json(await CustomerService.getAll());
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      res.json(await CustomerService.getById(parseInt(req.params.id, 10)));
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      res.status(201).json(await CustomerService.create(req.body));
    } catch (err) {
      next(err);
    }
  }

  static async update(req, res, next) {
    try {
      res.json(await CustomerService.update(parseInt(req.params.id, 10), req.body));
    } catch (err) {
      next(err);
    }
  }

  static async createContact(req, res, next) {
    try {
      res.status(201).json(await CustomerService.createContact(parseInt(req.params.id, 10), req.body));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = CustomerController;
