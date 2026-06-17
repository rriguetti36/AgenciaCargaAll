const MasterDataService = require('../services/MasterDataService');

class MasterDataController {
  static async list(req, res, next) {
    try {
      res.json(await MasterDataService.list(req.params.type));
    } catch (err) {
      next(err);
    }
  }

  static async create(req, res, next) {
    try {
      res.status(201).json(await MasterDataService.create(req.params.type, req.body));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = MasterDataController;
