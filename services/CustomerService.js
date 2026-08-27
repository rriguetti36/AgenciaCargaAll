const CustomerModel = require('../models/CustomerModel');

class CustomerService {
  static resolveCreatedBy(data, user, existingCustomer = null) {
    if (user?.role === 'admin') {
      return data.createdBy === '' || data.createdBy === undefined
        ? existingCustomer?.createdBy || user?.id || null
        : Number(data.createdBy || 0) || null;
    }
    return existingCustomer?.createdBy || user?.id || null;
  }

  static async getAll(user) {
    return CustomerModel.getAll(user);
  }

  static async getById(id, user) {
    const customer = await CustomerModel.getById(id, user);
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

  static async create(data, user) {
    if (!data.companyName) {
      const error = new Error('companyName es obligatorio');
      error.status = 400;
      throw error;
    }
    return CustomerModel.create({
      ...this.normalize(data),
      createdBy: this.resolveCreatedBy(data, user),
    });
  }

  static async update(id, data, user) {
    const existingCustomer = await this.getById(id, user);
    if (!data.companyName) {
      const error = new Error('companyName es obligatorio');
      error.status = 400;
      throw error;
    }
    return CustomerModel.update(id, {
      ...this.normalize(data),
      createdBy: this.resolveCreatedBy(data, user, existingCustomer),
    });
  }

  static async createContact(customerId, data, user) {
    await this.getById(customerId, user);
    if (!data.name) {
      const error = new Error('El nombre del contacto es obligatorio');
      error.status = 400;
      throw error;
    }
    return CustomerModel.createContact(customerId, data);
  }
}

module.exports = CustomerService;
