const fs = require('fs');
const path = require('path');
const OperationModel = require('../models/OperationModel');
const QuotationModel = require('../models/QuotationModel');

const VALID_STATUSES = OperationModel.OPERATION_STATUSES;
const MIME_BY_EXTENSION = {
  '.pdf': 'application/pdf',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.doc': 'application/msword',
  '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  '.xls': 'application/vnd.ms-excel',
  '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  '.csv': 'text/csv',
  '.txt': 'text/plain',
  '.xml': 'application/xml',
  '.zip': 'application/zip',
};

function detectMimeType(fileName, mimeType) {
  if (mimeType) return mimeType;
  return MIME_BY_EXTENSION[path.extname(fileName || '').toLowerCase()] || 'application/octet-stream';
}

class OperationService {
  static async getAll(filters = {}) {
    return OperationModel.getAll(filters);
  }

  static async getById(id) {
    const operation = await OperationModel.getById(id);
    if (!operation) {
      const error = new Error('Operacion no encontrada');
      error.status = 404;
      throw error;
    }
    return operation;
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

    return OperationModel.create({
      ...data,
      status: data.status || 'CREATED',
      commercialUserId: data.commercialUserId || user?.id || null,
      operativeUserId: data.operativeUserId || data.responsibleUserId || null,
      createdBy: user?.id || null,
    });
  }

  static async createFromQuotation(quotationId, data = {}, user) {
    const quotation = await QuotationModel.getById(quotationId);
    if (!quotation) {
      const error = new Error('Cotizacion no encontrada');
      error.status = 404;
      throw error;
    }
    if (quotation.status !== 'aceptada') {
      const error = new Error('Solo una cotizacion aprobada puede convertirse en operacion');
      error.status = 400;
      throw error;
    }

    const existing = await OperationModel.findByQuotationId(quotationId);
    if (existing) return existing;

    return OperationModel.create({
      quotationId: quotation.id,
      customerId: quotation.customerId,
      operationType: quotation.operationType,
      transportMode: quotation.transportMode,
      cargoType: data.cargoType || quotation.serviceName || null,
      commodity: quotation.commodity || null,
      quantity: quotation.quantity || null,
      quantityUnitId: quotation.quantityUnitId || null,
      grossWeight: quotation.grossWeight || null,
      weightUnitId: quotation.weightUnitId || null,
      volume: quotation.volume || null,
      volumeUnitId: quotation.volumeUnitId || null,
      origin: quotation.origin,
      destination: quotation.destination,
      etd: data.etd || null,
      eta: data.eta || null,
      estimatedDeliveryDate: data.estimatedDeliveryDate || null,
      status: data.operativeUserId ? 'ASSIGNED' : 'CREATED',
      commercialUserId: quotation.createdBy || user?.id || null,
      operativeUserId: data.operativeUserId || null,
      createdBy: user?.id || null,
    });
  }

  static async assign(operationId, data, user) {
    await this.getById(operationId);
    if (!data.operativeUserId) {
      const error = new Error('operativeUserId es obligatorio');
      error.status = 400;
      throw error;
    }
    return OperationModel.updateAssignment(operationId, {
      ...data,
      userId: user?.id || null,
    });
  }

  static async updateDates(operationId, data) {
    await this.getById(operationId);
    return OperationModel.updateDates(operationId, data);
  }

  static async saveBooking(operationId, data, user, bookingId = null) {
    await this.getById(operationId);
    return OperationModel.upsertBooking(operationId, {
      ...data,
      createdBy: user?.id || null,
    }, bookingId);
  }

  static async saveBookingHbl(operationId, bookingId, data, user, hblId = null) {
    const operation = await this.getById(operationId);
    const belongsToOperation = (operation.bookings || []).some((booking) => Number(booking.id) === Number(bookingId));
    if (!belongsToOperation) {
      const error = new Error('El booking no pertenece a la operacion');
      error.status = 400;
      throw error;
    }
    if (!data.hblNumber) {
      const error = new Error('HBL es obligatorio');
      error.status = 400;
      throw error;
    }
    return OperationModel.upsertBookingHbl(operationId, bookingId, {
      ...data,
      userId: user?.id || null,
    }, hblId);
  }

  static async addTracking(operationId, data, user) {
    const operation = await this.getById(operationId);
    if (!data.bookingId) {
      const error = new Error('bookingId es obligatorio para registrar tracking');
      error.status = 400;
      throw error;
    }
    const belongsToOperation = (operation.bookings || []).some((booking) => Number(booking.id) === Number(data.bookingId));
    if (!belongsToOperation) {
      const error = new Error('El booking no pertenece a la operacion');
      error.status = 400;
      throw error;
    }
    if (!data.status) {
      const error = new Error('status es obligatorio');
      error.status = 400;
      throw error;
    }
    if (!VALID_STATUSES.includes(data.status)) {
      const error = new Error('Estado operativo invalido');
      error.status = 400;
      throw error;
    }
    return OperationModel.addTracking(operationId, {
      ...data,
      userId: user?.id || null,
    });
  }

  static async addDocument(operationId, data, user) {
    const operation = await this.getById(operationId);
    if (!data.documentType || !data.fileName || !data.contentBase64) {
      const error = new Error('documentType y archivo son obligatorios');
      error.status = 400;
      throw error;
    }
    if (data.bookingId && !(operation.bookings || []).some((booking) => Number(booking.id) === Number(data.bookingId))) {
      const error = new Error('El booking no pertenece a la operacion');
      error.status = 400;
      throw error;
    }

    const uploadRoot = path.join(__dirname, '..', 'uploads', 'documents', String(operationId));
    fs.mkdirSync(uploadRoot, { recursive: true });
    const safeName = data.fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    const targetPath = path.join(uploadRoot, `${Date.now()}-${safeName}`);
    fs.writeFileSync(targetPath, Buffer.from(data.contentBase64, 'base64'));
    const filePath = path.relative(path.join(__dirname, '..'), targetPath);

    return OperationModel.addDocument(operationId, {
      ...data,
      filePath,
      mimeType: detectMimeType(data.fileName, data.mimeType),
      uploadedBy: user?.id || null,
    });
  }

  static async deactivateDocument(documentId) {
    return OperationModel.deactivateDocument(documentId);
  }

  static async saveCustoms(operationId, data, user) {
    const operation = await this.getById(operationId);
    if (!data.bookingId || !(operation.bookings || []).some((booking) => Number(booking.id) === Number(data.bookingId))) {
      const error = new Error('bookingId es obligatorio para aduanas');
      error.status = 400;
      throw error;
    }
    return OperationModel.upsertCustoms(operationId, {
      ...data,
      createdBy: user?.id || null,
    });
  }

  static async saveLocalTransport(operationId, data, user) {
    const operation = await this.getById(operationId);
    if (!data.bookingId || !(operation.bookings || []).some((booking) => Number(booking.id) === Number(data.bookingId))) {
      const error = new Error('bookingId es obligatorio para transporte');
      error.status = 400;
      throw error;
    }
    return OperationModel.upsertLocalTransport(operationId, {
      ...data,
      createdBy: user?.id || null,
    });
  }

  static async saveBilling(operationId, data, user) {
    await this.getById(operationId);
    const billingStatus = (data.billingStatus || 'PENDIENTE').toUpperCase();
    if (!['PENDIENTE', 'PARCIAL', 'FACTURADO'].includes(billingStatus)) {
      const error = new Error('Estado de facturacion invalido');
      error.status = 400;
      throw error;
    }
    return OperationModel.upsertBilling(operationId, {
      ...data,
      billingStatus,
      createdBy: user?.id || null,
    });
  }

  static async close(operationId, data, user) {
    const operation = await this.getById(operationId);
    if (operation.status !== 'DELIVERED' && operation.status !== 'INVOICED') {
      const error = new Error('Solo se puede cerrar una operacion entregada');
      error.status = 400;
      throw error;
    }
    if (operation.billing?.billingStatus !== 'FACTURADO') {
      const error = new Error('La operacion debe estar facturada para cerrarse');
      error.status = 400;
      throw error;
    }
    const pendingCustomerCosts = (operation.costs || []).filter((cost) => (
      cost.status !== 'CANCELLED'
      && cost.costResponsibility === 'CLIENT'
      && cost.customerPaymentStatus !== 'PAID'
    ));
    if (pendingCustomerCosts.length) {
      const pendingAmount = pendingCustomerCosts.reduce((sum, cost) => sum + Number(cost.realCost || 0), 0);
      const creditApplied = Number(operation.profitability?.customerCreditApplied || 0);
      const pendingAfterCredit = Math.max(pendingAmount - creditApplied, 0);

      if (pendingAfterCredit > 0) {
        const error = new Error(`No se puede cerrar: el credito cubre ${creditApplied.toFixed(2)} y queda pendiente de pago ${pendingAfterCredit.toFixed(2)}`);
        error.status = 400;
        throw error;
      }
    }
    return OperationModel.closeOperation(operationId, {
      closeObservation: data.closeObservation,
      closedBy: user?.id || null,
    });
  }

  static async addFinanceItem(operationId, data) {
    await this.getById(operationId);
    if (!data.itemType || !data.category) {
      const error = new Error('itemType y category son obligatorios');
      error.status = 400;
      throw error;
    }
    return OperationModel.addFinanceItem(operationId, data);
  }
}

module.exports = OperationService;

