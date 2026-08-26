const QuotationModel = require('../models/QuotationModel');
const OperationService = require('./OperationService');
const OperationModel = require('../models/OperationModel');
const ProfitabilityModel = require('../models/ProfitabilityModel');

const QUOTATION_STATUSES = ['solicitada_pricing', 'pricing_completado', 'enviada', 'aceptada', 'rechazada', 'borrador'];
const PRICING_ROLES = ['admin', 'pricing'];
const COMMERCIAL_ROLES = ['admin', 'asesor', 'user', 'customer_service'];

function buildNumber(prefix) {
  const now = new Date();
  const stamp = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, '0'),
    String(now.getDate()).padStart(2, '0'),
    String(now.getHours()).padStart(2, '0'),
    String(now.getMinutes()).padStart(2, '0'),
    String(now.getSeconds()).padStart(2, '0'),
  ].join('');
  return `${prefix}-${stamp}`;
}

class QuotationService {
  static async getAll(user) {
    return QuotationModel.getAll(user);
  }

  static async getById(id, user = null) {
    const quotation = await QuotationModel.getById(id);
    if (!quotation) {
      const error = new Error('Cotizacion no encontrada');
      error.status = 404;
      throw error;
    }
    const canSeeAll = PRICING_ROLES.includes(user?.role);
    if (user?.id && quotation.createdBy && quotation.createdBy !== user.id && !canSeeAll) {
      const error = new Error('No tienes acceso a esta cotizacion');
      error.status = 403;
      throw error;
    }
    return quotation;
  }

  static async create(data, user) {
    const required = ['customerId', 'operationType', 'transportMode'];
    for (const field of required) {
      if (!data[field]) {
        const error = new Error(`${field} es obligatorio`);
        error.status = 400;
        throw error;
      }
    }

    return QuotationModel.create({
      ...data,
      origin: data.origin || 'Origen pendiente',
      destination: data.destination || 'Destino pendiente',
      quotationNumber: data.quotationNumber || buildNumber('COT'),
      status: data.status || 'solicitada_pricing',
      createdBy: user?.id || null,
      charges: (PRICING_ROLES.includes(user?.role) || COMMERCIAL_ROLES.includes(user?.role)) ? (data.charges || []) : [],
    });
  }

  static async update(id, data, user) {
    const quotation = await this.getById(id, user);
    const isPricing = PRICING_ROLES.includes(user?.role);
    const isOwner = quotation.createdBy === user?.id;
    const canUpdateRequestDetails = isPricing || (isOwner && quotation.status === 'solicitada_pricing');
    if (!isPricing && !isOwner) {
      const error = new Error('Solo el comercial creador o Pricing pueden editar esta cotizacion');
      error.status = 403;
      throw error;
    }
    if (!isPricing && quotation.status !== 'solicitada_pricing') {
      const error = new Error('La solicitud ya fue tomada por Pricing y solo puede consultarse');
      error.status = 403;
      throw error;
    }

    const required = ['customerId', 'operationType', 'transportMode'];
    for (const field of required) {
      if (!data[field]) {
        const error = new Error(`${field} es obligatorio`);
        error.status = 400;
        throw error;
      }
    }

    const updated = await QuotationModel.update(id, {
      ...data,
      origin: data.origin || 'Origen pendiente',
      destination: data.destination || 'Destino pendiente',
      status: quotation.status,
      charges: canUpdateRequestDetails ? (data.charges || []) : (quotation.charges || []),
    });
    const operation = await OperationModel.findByQuotationId(id);
    if (operation) {
      await ProfitabilityModel.syncQuotedCosts(operation.id, id, user?.id || null);
    }
    return updated;
  }

  static async updateStatus(id, status, user) {
    if (!QUOTATION_STATUSES.includes(status)) {
      const error = new Error('Estado de cotizacion invalido');
      error.status = 400;
      throw error;
    }
    const quotation = await this.getById(id, user);
    const isPricing = PRICING_ROLES.includes(user?.role);
    const isCommercial = COMMERCIAL_ROLES.includes(user?.role) && quotation.createdBy === user?.id;

    if (status === 'pricing_completado' && !isPricing) {
      const error = new Error('Solo Pricing puede completar el calculo de costos y margen');
      error.status = 403;
      throw error;
    }
    if (['enviada', 'aceptada', 'rechazada'].includes(status) && !isCommercial && user?.role !== 'admin') {
      const error = new Error('Solo el comercial responsable puede enviar o registrar respuesta del cliente');
      error.status = 403;
      throw error;
    }
    if (status === 'enviada' && !['pricing_completado', 'enviada', 'aceptada'].includes(quotation.status)) {
      const error = new Error('Pricing debe completar costos y margen antes de enviar al cliente');
      error.status = 400;
      throw error;
    }
    if (status === 'aceptada' && !['enviada', 'aceptada'].includes(quotation.status)) {
      const error = new Error('La cotizacion debe estar enviada al cliente antes de aprobarse');
      error.status = 400;
      throw error;
    }
    return QuotationModel.updateStatus(id, status, user?.id || null);
  }

  static async convertToOperation(id, data, user) {
    const quotation = await this.getById(id, user);
    if (quotation.status !== 'aceptada') {
      const error = new Error('Solo una cotizacion aprobada por el cliente puede pasar a operaciones');
      error.status = 400;
      throw error;
    }
    return OperationService.createFromQuotation(id, data, user);
  }
}

module.exports = QuotationService;
