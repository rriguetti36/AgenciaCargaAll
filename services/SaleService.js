const SaleModel = require('../models/SaleModel');

class SaleService {
  static async getAll() {
    return SaleModel.getAll();
  }

  static async getById(id) {
    const sale = await SaleModel.getById(id);
    if (!sale) {
      const error = new Error('Venta no encontrada');
      error.status = 404;
      throw error;
    }
    return sale;
  }

  static async issue(operationId, data, user) {
    if (!['FACTURA', 'BOLETA'].includes(data.documentType || 'FACTURA')) {
      const error = new Error('Tipo de comprobante invalido');
      error.status = 400;
      throw error;
    }
    return SaleModel.issue(operationId, data, user?.id || null);
  }
}

module.exports = SaleService;
