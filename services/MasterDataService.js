const MasterDataModel = require('../models/MasterDataModel');

const requiredByType = {
  operations: ['name'],
  modalities: ['name'],
  services: ['name'],
  countries: ['name'],
  ports: ['countryId', 'name'],
  conditions: ['conditionType', 'description'],
  documents: ['name'],
  tariffs: ['tariffType', 'concept', 'currency', 'amount'],
  internationalFreight: ['name', 'currency', 'amount'],
  internationalInsurance: ['name', 'currency', 'amount'],
  customsService: ['name', 'currency', 'amount'],
  localTransport: ['name', 'currency', 'amount'],
};

class MasterDataService {
  static async list(type) {
    return MasterDataModel.list(type);
  }

  static async create(type, data) {
    for (const field of requiredByType[type] || []) {
      if (data[field] === undefined || data[field] === null || data[field] === '') {
        const error = new Error(`${field} es obligatorio`);
        error.status = 400;
        throw error;
      }
    }
    return MasterDataModel.create(type, data);
  }
}

module.exports = MasterDataService;
