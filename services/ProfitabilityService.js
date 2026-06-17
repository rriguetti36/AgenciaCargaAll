const ProfitabilityModel = require('../models/ProfitabilityModel');

const VALID_STATUSES = ['PENDING', 'APPROVED', 'PAID', 'CANCELLED'];
const VALID_RESPONSIBILITIES = ['COMPANY', 'CLIENT'];
const VALID_CUSTOMER_PAYMENT_STATUSES = ['PAID', 'UNPAID'];

class ProfitabilityService {
  static async getCosts(operationId) {
    return ProfitabilityModel.getCosts(operationId);
  }

  static async createCost(operationId, data, user) {
    const costScope = data.costScope === 'BOOKING' ? 'BOOKING' : 'OPERATION';
    if (!String(data.concept || '').trim()) {
      const error = new Error('El concepto del costo es obligatorio');
      error.status = 400;
      throw error;
    }
    if (costScope === 'BOOKING' && !data.bookingId) {
      const error = new Error('Selecciona un booking para este costo');
      error.status = 400;
      throw error;
    }
    if (!VALID_STATUSES.includes(data.status || 'PENDING')) {
      const error = new Error('Estado de costo invalido');
      error.status = 400;
      throw error;
    }
    if (!VALID_RESPONSIBILITIES.includes(data.costResponsibility || 'COMPANY')) {
      const error = new Error('Responsable del costo invalido');
      error.status = 400;
      throw error;
    }
    if (!VALID_CUSTOMER_PAYMENT_STATUSES.includes(data.customerPaymentStatus || 'UNPAID')) {
      const error = new Error('Estado de pago del cliente invalido');
      error.status = 400;
      throw error;
    }

    return ProfitabilityModel.createCost(operationId, {
      ...data,
      costScope,
      bookingId: costScope === 'BOOKING' ? Number(data.bookingId) : null,
      concept: String(data.concept).trim(),
      estimatedCost: Number(data.estimatedCost || 0),
      realCost: Number(data.realCost || 0),
      saleAmount: Number(data.saleAmount || 0),
      currency: String(data.currency || 'USD').slice(0, 3).toUpperCase(),
      costResponsibility: data.costResponsibility || 'COMPANY',
      customerPaymentStatus: data.costResponsibility === 'CLIENT' ? (data.customerPaymentStatus || 'UNPAID') : 'UNPAID',
    }, user?.id || null);
  }

  static async updateCost(costId, data, user) {
    const costScope = data.costScope === 'BOOKING' ? 'BOOKING' : 'OPERATION';
    if (!String(data.concept || '').trim()) {
      const error = new Error('El concepto del costo es obligatorio');
      error.status = 400;
      throw error;
    }
    if (costScope === 'BOOKING' && !data.bookingId) {
      const error = new Error('Selecciona un booking para este costo');
      error.status = 400;
      throw error;
    }
    if (!VALID_STATUSES.includes(data.status || 'PENDING')) {
      const error = new Error('Estado de costo invalido');
      error.status = 400;
      throw error;
    }
    if (!VALID_RESPONSIBILITIES.includes(data.costResponsibility || 'COMPANY')) {
      const error = new Error('Responsable del costo invalido');
      error.status = 400;
      throw error;
    }
    if (!VALID_CUSTOMER_PAYMENT_STATUSES.includes(data.customerPaymentStatus || 'UNPAID')) {
      const error = new Error('Estado de pago del cliente invalido');
      error.status = 400;
      throw error;
    }
    return ProfitabilityModel.updateCost(costId, {
      ...data,
      costScope,
      bookingId: costScope === 'BOOKING' ? Number(data.bookingId) : null,
      concept: String(data.concept).trim(),
      estimatedCost: Number(data.estimatedCost || 0),
      realCost: Number(data.realCost || 0),
      saleAmount: Number(data.saleAmount || 0),
      currency: String(data.currency || 'USD').slice(0, 3).toUpperCase(),
      costResponsibility: data.costResponsibility || 'COMPANY',
      customerPaymentStatus: data.costResponsibility === 'CLIENT' ? (data.customerPaymentStatus || 'UNPAID') : 'UNPAID',
    }, user?.id || null);
  }

  static async cancelCost(costId, user) {
    const cost = await ProfitabilityModel.cancelCost(costId, user?.id || null);
    if (!cost) {
      const error = new Error('Costo no encontrado');
      error.status = 404;
      throw error;
    }
    return cost;
  }

  static async getSummary(operationId) {
    return ProfitabilityModel.getSummary(operationId);
  }

  static async getCommissions(operationId) {
    return ProfitabilityModel.getCommissions(operationId);
  }

  static async updateCommissionStatus(commissionId, status, user) {
    if (!VALID_STATUSES.includes(status)) {
      const error = new Error('Estado de comision invalido');
      error.status = 400;
      throw error;
    }
    return ProfitabilityModel.updateCommissionStatus(commissionId, status, user?.id || null);
  }

  static async getDashboard() {
    return ProfitabilityModel.getDashboard();
  }
}

module.exports = ProfitabilityService;
