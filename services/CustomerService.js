const CustomerModel = require('../models/CustomerModel');

class CustomerService {
  static async getAll() {
    return CustomerModel.getAll();
  }

  static async getById(id) {
    const customer = await CustomerModel.getById(id);
    if (!customer) {
      const error = new Error('Cliente no encontrado');
      error.status = 404;
      throw error;
    }
    const usedCredit = await CustomerModel.getCreditExposure(id);
    return {
      ...customer,
      usedCredit,
      availableCredit: Math.max(Number(customer.creditLimit || 0) - usedCredit, 0),
    };
  }

  static normalize(data) {
    return {
      ...data,
      creditEnabled: data.creditEnabled ? 1 : 0,
      creditLimit: Number(data.creditLimit || 0),
      creditDays: Number(data.creditDays || 0),
      creditCurrency: String(data.creditCurrency || 'USD').slice(0, 3).toUpperCase(),
    };
  }

  static async create(data) {
    if (!data.companyName) {
      const error = new Error('companyName es obligatorio');
      error.status = 400;
      throw error;
    }
    return CustomerModel.create(this.normalize(data));
  }

  static async update(id, data) {
    await this.getById(id);
    if (!data.companyName) {
      const error = new Error('companyName es obligatorio');
      error.status = 400;
      throw error;
    }
    return CustomerModel.update(id, this.normalize(data));
  }

  static async createContact(customerId, data) {
    await this.getById(customerId);
    if (!data.name) {
      const error = new Error('El nombre del contacto es obligatorio');
      error.status = 400;
      throw error;
    }
    return CustomerModel.createContact(customerId, data);
  }
}

module.exports = CustomerService;
