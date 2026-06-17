const OperationService = require('../services/OperationService');

class OperationController {
  static async getAll(req, res, next) {
    try {
      res.json(await OperationService.getAll(req.query));
    } catch (err) {
      next(err);
    }
  }

  static async getById(req, res, next) {
    try {
      res.json(await OperationService.getById(parseInt(req.params.id, 10)));
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      res.status(201).json(await OperationService.create(req.body, req.user));
    } catch (err) {
      next(err);
    }
  }

  static async createFromQuotation(req, res, next) {
    try {
      res.status(201).json(await OperationService.createFromQuotation(parseInt(req.params.quotationId, 10), req.body, req.user));
    } catch (err) {
      next(err);
    }
  }

  static async assign(req, res, next) {
    try {
      res.json(await OperationService.assign(parseInt(req.params.id, 10), req.body, req.user));
    } catch (err) {
      next(err);
    }
  }

  static async updateDates(req, res, next) {
    try {
      res.json(await OperationService.updateDates(parseInt(req.params.id, 10), req.body));
    } catch (err) {
      next(err);
    }
  }

  static async saveBooking(req, res, next) {
    try {
      res.json(await OperationService.saveBooking(
        parseInt(req.params.id, 10),
        req.body,
        req.user,
        req.params.bookingId ? parseInt(req.params.bookingId, 10) : null
      ));
    } catch (err) {
      next(err);
    }
  }

  static async saveBookingHbl(req, res, next) {
    try {
      res.json(await OperationService.saveBookingHbl(
        parseInt(req.params.id, 10),
        parseInt(req.params.bookingId, 10),
        req.body,
        req.user,
        req.params.hblId ? parseInt(req.params.hblId, 10) : null
      ));
    } catch (err) {
      next(err);
    }
  }

  static async addTracking(req, res, next) {
    try {
      res.status(201).json(await OperationService.addTracking(parseInt(req.params.id, 10), req.body, req.user));
    } catch (err) {
      next(err);
    }
  }

  static async addDocument(req, res, next) {
    try {
      res.status(201).json(await OperationService.addDocument(parseInt(req.params.id, 10), req.body, req.user));
    } catch (err) {
      next(err);
    }
  }

  static async deactivateDocument(req, res, next) {
    try {
      res.json(await OperationService.deactivateDocument(parseInt(req.params.documentId, 10)));
    } catch (err) {
      next(err);
    }
  }

  static async saveCustoms(req, res, next) {
    try {
      res.json(await OperationService.saveCustoms(parseInt(req.params.id, 10), req.body, req.user));
    } catch (err) {
      next(err);
    }
  }

  static async saveLocalTransport(req, res, next) {
    try {
      res.json(await OperationService.saveLocalTransport(parseInt(req.params.id, 10), req.body, req.user));
    } catch (err) {
      next(err);
    }
  }

  static async saveBilling(req, res, next) {
    try {
      res.json(await OperationService.saveBilling(parseInt(req.params.id, 10), req.body, req.user));
    } catch (err) {
      next(err);
    }
  }

  static async close(req, res, next) {
    try {
      res.json(await OperationService.close(parseInt(req.params.id, 10), req.body, req.user));
    } catch (err) {
      next(err);
    }
  }

  static async addFinanceItem(req, res, next) {
    try {
      res.status(201).json(await OperationService.addFinanceItem(parseInt(req.params.id, 10), req.body));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = OperationController;

