const MasterDataModel = require('../models/MasterDataModel');
const fs = require('fs');
const path = require('path');

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

  static async getCompanyConfig() {
    return MasterDataModel.getCompanyConfig();
  }

  static async updateCompanyConfig(data) {
    return MasterDataModel.updateCompanyConfig(data);
  }

  static async uploadCompanyLogo(data) {
    const match = String(data?.fileData || '').match(/^data:(image\/png|image\/jpe?g);base64,(.+)$/);
    if (!match) {
      const error = new Error('Logo invalido. Usa PNG o JPG.');
      error.status = 400;
      throw error;
    }

    const extension = match[1].includes('png') ? 'png' : 'jpeg';
    const buffer = Buffer.from(match[2], 'base64');
    const targetDir = path.join(__dirname, '..', 'public', 'imagenes');
    fs.mkdirSync(targetDir, { recursive: true });

    for (const fileName of ['logo.png', 'logo.jpg', 'logo.jpeg']) {
      const filePath = path.join(targetDir, fileName);
      if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
    }

    const targetFile = `logo.${extension}`;
    fs.writeFileSync(path.join(targetDir, targetFile), buffer);
    const current = await MasterDataModel.getCompanyConfig();
    return MasterDataModel.updateCompanyConfig({
      ...(current || {}),
      logoPath: `/imagenes/${targetFile}`,
    });
  }
}

module.exports = MasterDataService;
