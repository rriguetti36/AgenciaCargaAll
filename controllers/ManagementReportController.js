const ManagementReportService = require('../services/ManagementReportService');

class ManagementReportController {
  static async overview(req, res, next) {
    try {
      res.json(await ManagementReportService.getOverview(req.query));
    } catch (err) {
      next(err);
    }
  }
}

module.exports = ManagementReportController;
