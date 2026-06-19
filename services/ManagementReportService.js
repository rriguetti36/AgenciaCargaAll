const ManagementReportModel = require('../models/ManagementReportModel');

class ManagementReportService {
  static async getOverview(filters) {
    return ManagementReportModel.getOverview(filters);
  }
}

module.exports = ManagementReportService;
