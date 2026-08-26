const { poolPromise, sql } = require('../config/db');

class QuotationModel {
  static async getAll(user = {}) {
    const pool = await poolPromise;
    const canSeeAll = ['admin', 'pricing'].includes(user?.role);
    const result = await pool
      .request()
      .input('createdBy', sql.Int, user?.id || null)
      .input('canSeeAll', sql.Bit, canSeeAll ? 1 : 0)
      .query(`
      SELECT
        q.id,
        q.quotationNumber,
        q.customerId,
        c.companyName AS customerName,
        q.operationType,
        q.transportMode,
        q.operationCatalogId,
        oc.name AS operationName,
        q.modalityCatalogId,
        mc.name AS modalityName,
        q.serviceCatalogId,
        sc.name AS serviceName,
        q.commodityCatalogId,
        cc.name AS commodityName,
        q.origin,
        q.originCountryId,
        oco.name AS originCountryName,
        q.originPortId,
        op.name AS originPortName,
        q.destination,
        q.destinationCountryId,
        dco.name AS destinationCountryName,
        q.destinationPortId,
        dp.name AS destinationPortName,
        COALESCE(cc.name, q.commodity) AS commodity,
        q.quantity,
        q.quantityUnitId,
        quantityUnit.code AS quantityUnitCode,
        quantityUnit.name AS quantityUnitName,
        q.grossWeight,
        q.weightUnitId,
        weightUnit.code AS weightUnitCode,
        weightUnit.name AS weightUnitName,
        q.volume,
        q.volumeUnitId,
        volumeUnit.code AS volumeUnitCode,
        volumeUnit.name AS volumeUnitName,
        q.incoterm,
        q.transitTime,
        q.frequency,
        q.currency,
        q.profitMargin,
        q.status,
        q.createdBy,
        creator.name AS createdByName,
        q.pricingUserId,
        pricing.name AS pricingUserName,
        q.pricingSubmittedAt,
        q.sentToCustomerAt,
        q.customerApprovedAt,
        q.createdAt,
        q.updatedAt,
        opx.id AS operationId,
        opx.operationNumber,
        COALESCE(SUM(ch.costAmount * COALESCE(ch.quantity, 1)), 0) AS totalCost,
        COALESCE(SUM((ch.saleAmount * COALESCE(ch.quantity, 1)) + COALESCE(ch.igvAmount, 0)), 0) AS totalSale,
        COALESCE(SUM((ch.saleAmount - ch.costAmount) * COALESCE(ch.quantity, 1)), 0) AS estimatedProfit
      FROM dbo.Quotations AS q
      INNER JOIN dbo.Customers AS c ON c.id = q.customerId
      LEFT JOIN dbo.Users AS creator ON creator.id = q.createdBy
      LEFT JOIN dbo.Users AS pricing ON pricing.id = q.pricingUserId
      LEFT JOIN dbo.OperationCatalog AS oc ON oc.id = q.operationCatalogId
      LEFT JOIN dbo.ModalityCatalog AS mc ON mc.id = q.modalityCatalogId
      LEFT JOIN dbo.ServiceCatalog AS sc ON sc.id = q.serviceCatalogId
      LEFT JOIN dbo.CommodityCatalog AS cc ON cc.id = q.commodityCatalogId
      LEFT JOIN dbo.Countries AS oco ON oco.id = q.originCountryId
      LEFT JOIN dbo.Ports AS op ON op.id = q.originPortId
      LEFT JOIN dbo.Countries AS dco ON dco.id = q.destinationCountryId
      LEFT JOIN dbo.Ports AS dp ON dp.id = q.destinationPortId
      LEFT JOIN dbo.MeasurementUnits AS quantityUnit ON quantityUnit.id = q.quantityUnitId
      LEFT JOIN dbo.MeasurementUnits AS weightUnit ON weightUnit.id = q.weightUnitId
      LEFT JOIN dbo.MeasurementUnits AS volumeUnit ON volumeUnit.id = q.volumeUnitId
      LEFT JOIN dbo.QuotationCharges AS ch ON ch.quotationId = q.id
      LEFT JOIN dbo.Operations AS opx ON opx.quotationId = q.id
      WHERE (@canSeeAll = 1 OR q.createdBy = @createdBy)
      GROUP BY q.id, q.quotationNumber, q.customerId, c.companyName, q.operationType, q.transportMode,
               q.operationCatalogId, oc.name, q.modalityCatalogId, mc.name, q.serviceCatalogId, sc.name,
               q.commodityCatalogId, cc.name,
               q.origin, q.originCountryId, oco.name, q.originPortId, op.name,
               q.destination, q.destinationCountryId, dco.name, q.destinationPortId, dp.name,
               q.commodity, q.quantity, q.quantityUnitId, quantityUnit.code, quantityUnit.name,
               q.grossWeight, q.weightUnitId, weightUnit.code, weightUnit.name,
               q.volume, q.volumeUnitId, volumeUnit.code, volumeUnit.name, q.incoterm, q.transitTime, q.frequency,
               q.currency, q.profitMargin, q.status, q.createdBy, creator.name,
               q.pricingUserId, pricing.name, q.pricingSubmittedAt, q.sentToCustomerAt, q.customerApprovedAt,
               q.createdAt, q.updatedAt,
               opx.id, opx.operationNumber
      ORDER BY q.createdAt DESC
    `);
    return result.recordset;
  }

  static async getById(id) {
    const pool = await poolPromise;
    const quotationResult = await pool
      .request()
      .input('id', sql.Int, id)
      .query(`
        SELECT
          q.*,
          c.companyName AS customerName,
          cc.name AS commodityName,
          oco.name AS originCountryName,
          op.name AS originPortName,
          dco.name AS destinationCountryName,
          dp.name AS destinationPortName,
          creator.name AS createdByName,
          creator.phone AS createdByPhone,
          pricing.name AS pricingUserName,
          quantityUnit.code AS quantityUnitCode,
          quantityUnit.name AS quantityUnitName,
          weightUnit.code AS weightUnitCode,
          weightUnit.name AS weightUnitName,
          volumeUnit.code AS volumeUnitCode,
          volumeUnit.name AS volumeUnitName
        FROM dbo.Quotations AS q
        INNER JOIN dbo.Customers AS c ON c.id = q.customerId
        LEFT JOIN dbo.Users AS creator ON creator.id = q.createdBy
        LEFT JOIN dbo.Users AS pricing ON pricing.id = q.pricingUserId
        LEFT JOIN dbo.CommodityCatalog AS cc ON cc.id = q.commodityCatalogId
        LEFT JOIN dbo.Countries AS oco ON oco.id = q.originCountryId
        LEFT JOIN dbo.Ports AS op ON op.id = q.originPortId
        LEFT JOIN dbo.Countries AS dco ON dco.id = q.destinationCountryId
        LEFT JOIN dbo.Ports AS dp ON dp.id = q.destinationPortId
        LEFT JOIN dbo.MeasurementUnits AS quantityUnit ON quantityUnit.id = q.quantityUnitId
        LEFT JOIN dbo.MeasurementUnits AS weightUnit ON weightUnit.id = q.weightUnitId
        LEFT JOIN dbo.MeasurementUnits AS volumeUnit ON volumeUnit.id = q.volumeUnitId
        WHERE q.id = @id
      `);

    const quotation = quotationResult.recordset[0];
    if (!quotation) return null;

    const chargesResult = await pool
      .request()
      .input('quotationId', sql.Int, id)
      .query('SELECT * FROM dbo.QuotationCharges WHERE quotationId = @quotationId ORDER BY id ASC');

    return { ...quotation, charges: chargesResult.recordset };
  }

  static async create(data) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const request = new sql.Request(transaction);
      const quotationResult = await request
        .input('quotationNumber', sql.NVarChar(30), data.quotationNumber)
        .input('customerId', sql.Int, data.customerId)
        .input('operationType', sql.NVarChar(20), data.operationType)
        .input('transportMode', sql.NVarChar(20), data.transportMode)
        .input('operationCatalogId', sql.Int, data.operationCatalogId || null)
        .input('modalityCatalogId', sql.Int, data.modalityCatalogId || null)
        .input('serviceCatalogId', sql.Int, data.serviceCatalogId || null)
        .input('commodityCatalogId', sql.Int, data.commodityCatalogId || null)
        .input('origin', sql.NVarChar(150), data.origin)
        .input('originCountryId', sql.Int, data.originCountryId || null)
        .input('originPortId', sql.Int, data.originPortId || null)
        .input('destination', sql.NVarChar(150), data.destination)
        .input('destinationCountryId', sql.Int, data.destinationCountryId || null)
        .input('destinationPortId', sql.Int, data.destinationPortId || null)
        .input('commodity', sql.NVarChar(180), data.commodity || null)
        .input('quantity', sql.Decimal(18, 3), data.quantity || null)
        .input('quantityUnitId', sql.Int, data.quantityUnitId || null)
        .input('grossWeight', sql.Decimal(18, 3), data.grossWeight || null)
        .input('weightUnitId', sql.Int, data.weightUnitId || null)
        .input('volume', sql.Decimal(18, 3), data.volume || null)
        .input('volumeUnitId', sql.Int, data.volumeUnitId || null)
        .input('incoterm', sql.NVarChar(20), data.incoterm || null)
        .input('transitTime', sql.NVarChar(80), data.transitTime || null)
        .input('frequency', sql.NVarChar(120), data.frequency || null)
        .input('currency', sql.NVarChar(3), data.currency || 'USD')
        .input('profitMargin', sql.Decimal(9, 2), data.profitMargin ?? 0)
        .input('status', sql.NVarChar(30), data.status || 'solicitada_pricing')
        .input('notes', sql.NVarChar(500), data.notes || null)
        .input('includesText', sql.NVarChar(sql.MAX), data.includesText || null)
        .input('excludesText', sql.NVarChar(sql.MAX), data.excludesText || null)
        .input('requiredDocumentsText', sql.NVarChar(sql.MAX), data.requiredDocumentsText || null)
        .input('createdBy', sql.Int, data.createdBy || null)
        .query(`
          INSERT INTO dbo.Quotations
            (quotationNumber, customerId, operationType, transportMode, operationCatalogId, modalityCatalogId, serviceCatalogId, commodityCatalogId,
             origin, originCountryId, originPortId, destination, destinationCountryId, destinationPortId,
             commodity, quantity, quantityUnitId, grossWeight, weightUnitId, volume, volumeUnitId, incoterm, transitTime, frequency, currency, profitMargin, status, notes,
             includesText, excludesText, requiredDocumentsText, createdBy)
          OUTPUT INSERTED.*
          VALUES
            (@quotationNumber, @customerId, @operationType, @transportMode, @operationCatalogId, @modalityCatalogId, @serviceCatalogId, @commodityCatalogId,
             @origin, @originCountryId, @originPortId, @destination, @destinationCountryId, @destinationPortId,
             @commodity, @quantity, @quantityUnitId, @grossWeight, @weightUnitId, @volume, @volumeUnitId, @incoterm, @transitTime, @frequency, @currency, @profitMargin, @status, @notes,
             @includesText, @excludesText, @requiredDocumentsText, @createdBy)
        `);

      const quotation = quotationResult.recordset[0];
      for (const charge of data.charges || []) {
        await new sql.Request(transaction)
          .input('quotationId', sql.Int, quotation.id)
          .input('chargeType', sql.NVarChar(30), charge.chargeType || charge.section || 'otros')
          .input('section', sql.NVarChar(50), charge.section || charge.chargeType || 'otros')
          .input('description', sql.NVarChar(200), charge.description || null)
          .input('currency', sql.NVarChar(3), charge.currency || data.currency || 'USD')
          .input('quantity', sql.Decimal(18, 3), charge.quantity || 1)
          .input('costAmount', sql.Decimal(18, 2), charge.costAmount ?? 0)
          .input('saleAmount', sql.Decimal(18, 2), charge.saleAmount ?? charge.amount ?? 0)
          .input('igvRate', sql.Decimal(9, 4), charge.igvRate ?? 0)
          .input('igvAmount', sql.Decimal(18, 2), charge.igvAmount ?? 0)
          .query(`
            INSERT INTO dbo.QuotationCharges (quotationId, chargeType, section, description, currency, quantity, costAmount, saleAmount, igvRate, igvAmount)
            VALUES (@quotationId, @chargeType, @section, @description, @currency, @quantity, @costAmount, @saleAmount, @igvRate, @igvAmount)
          `);
      }

      await transaction.commit();
      return await this.getById(quotation.id);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  static async update(id, data) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const request = new sql.Request(transaction);
      await request
        .input('id', sql.Int, id)
        .input('customerId', sql.Int, data.customerId)
        .input('operationType', sql.NVarChar(20), data.operationType)
        .input('transportMode', sql.NVarChar(20), data.transportMode)
        .input('operationCatalogId', sql.Int, data.operationCatalogId || null)
        .input('modalityCatalogId', sql.Int, data.modalityCatalogId || null)
        .input('serviceCatalogId', sql.Int, data.serviceCatalogId || null)
        .input('commodityCatalogId', sql.Int, data.commodityCatalogId || null)
        .input('origin', sql.NVarChar(150), data.origin)
        .input('originCountryId', sql.Int, data.originCountryId || null)
        .input('originPortId', sql.Int, data.originPortId || null)
        .input('destination', sql.NVarChar(150), data.destination)
        .input('destinationCountryId', sql.Int, data.destinationCountryId || null)
        .input('destinationPortId', sql.Int, data.destinationPortId || null)
        .input('commodity', sql.NVarChar(180), data.commodity || null)
        .input('quantity', sql.Decimal(18, 3), data.quantity || null)
        .input('quantityUnitId', sql.Int, data.quantityUnitId || null)
        .input('grossWeight', sql.Decimal(18, 3), data.grossWeight || null)
        .input('weightUnitId', sql.Int, data.weightUnitId || null)
        .input('volume', sql.Decimal(18, 3), data.volume || null)
        .input('volumeUnitId', sql.Int, data.volumeUnitId || null)
        .input('incoterm', sql.NVarChar(20), data.incoterm || null)
        .input('transitTime', sql.NVarChar(80), data.transitTime || null)
        .input('frequency', sql.NVarChar(120), data.frequency || null)
        .input('currency', sql.NVarChar(3), data.currency || 'USD')
        .input('profitMargin', sql.Decimal(9, 2), data.profitMargin ?? 0)
        .input('status', sql.NVarChar(30), data.status || 'solicitada_pricing')
        .input('notes', sql.NVarChar(500), data.notes || null)
        .input('includesText', sql.NVarChar(sql.MAX), data.includesText || null)
        .input('excludesText', sql.NVarChar(sql.MAX), data.excludesText || null)
        .input('requiredDocumentsText', sql.NVarChar(sql.MAX), data.requiredDocumentsText || null)
        .query(`
          UPDATE dbo.Quotations
          SET customerId = @customerId,
              operationType = @operationType,
              transportMode = @transportMode,
              operationCatalogId = @operationCatalogId,
              modalityCatalogId = @modalityCatalogId,
              serviceCatalogId = @serviceCatalogId,
              commodityCatalogId = @commodityCatalogId,
              origin = @origin,
              originCountryId = @originCountryId,
              originPortId = @originPortId,
              destination = @destination,
              destinationCountryId = @destinationCountryId,
              destinationPortId = @destinationPortId,
              commodity = @commodity,
              quantity = @quantity,
              quantityUnitId = @quantityUnitId,
              grossWeight = @grossWeight,
              weightUnitId = @weightUnitId,
              volume = @volume,
              volumeUnitId = @volumeUnitId,
              incoterm = @incoterm,
              transitTime = @transitTime,
              frequency = @frequency,
              currency = @currency,
              profitMargin = @profitMargin,
              status = @status,
              notes = @notes,
              includesText = @includesText,
              excludesText = @excludesText,
              requiredDocumentsText = @requiredDocumentsText
          WHERE id = @id
        `);

      const existingChargeIds = (data.charges || [])
        .map((charge) => Number(charge.id || 0))
        .filter((chargeId) => chargeId > 0);
      const deleteQuery = existingChargeIds.length
        ? `DELETE FROM dbo.QuotationCharges WHERE quotationId = @quotationId AND id NOT IN (${existingChargeIds.join(',')})`
        : 'DELETE FROM dbo.QuotationCharges WHERE quotationId = @quotationId';

      await new sql.Request(transaction)
        .input('quotationId', sql.Int, id)
        .query(deleteQuery);

      for (const charge of data.charges || []) {
        const chargeRequest = new sql.Request(transaction)
          .input('quotationId', sql.Int, id)
          .input('chargeId', sql.Int, charge.id || null)
          .input('chargeType', sql.NVarChar(30), charge.chargeType || charge.section || 'otros')
          .input('section', sql.NVarChar(50), charge.section || charge.chargeType || 'otros')
          .input('description', sql.NVarChar(200), charge.description || null)
          .input('currency', sql.NVarChar(3), charge.currency || data.currency || 'USD')
          .input('quantity', sql.Decimal(18, 3), charge.quantity || 1)
          .input('costAmount', sql.Decimal(18, 2), charge.costAmount ?? 0)
          .input('saleAmount', sql.Decimal(18, 2), charge.saleAmount ?? charge.amount ?? 0)
          .input('igvRate', sql.Decimal(9, 4), charge.igvRate ?? 0)
          .input('igvAmount', sql.Decimal(18, 2), charge.igvAmount ?? 0);

        if (charge.id) {
          await chargeRequest.query(`
            UPDATE dbo.QuotationCharges
            SET chargeType = @chargeType,
                section = @section,
                description = @description,
                currency = @currency,
                quantity = @quantity,
                costAmount = @costAmount,
                saleAmount = @saleAmount,
                igvRate = @igvRate,
                igvAmount = @igvAmount
            WHERE id = @chargeId
              AND quotationId = @quotationId
          `);
        } else {
          await chargeRequest.query(`
            INSERT INTO dbo.QuotationCharges (quotationId, chargeType, section, description, currency, quantity, costAmount, saleAmount, igvRate, igvAmount)
            VALUES (@quotationId, @chargeType, @section, @description, @currency, @quantity, @costAmount, @saleAmount, @igvRate, @igvAmount)
          `);
        }
      }

      await transaction.commit();
      return await this.getById(id);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  static async updateStatus(id, status, userId = null) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .input('status', sql.NVarChar(30), status)
      .input('userId', sql.Int, userId || null)
      .query(`
        UPDATE dbo.Quotations
        SET status = @status,
            pricingUserId = CASE WHEN @status = N'pricing_completado' THEN COALESCE(@userId, pricingUserId) ELSE pricingUserId END,
            pricingSubmittedAt = CASE WHEN @status = N'pricing_completado' THEN COALESCE(pricingSubmittedAt, SYSUTCDATETIME()) ELSE pricingSubmittedAt END,
            sentToCustomerAt = CASE WHEN @status = N'enviada' THEN COALESCE(sentToCustomerAt, SYSUTCDATETIME()) ELSE sentToCustomerAt END,
            customerApprovedAt = CASE WHEN @status = N'aceptada' THEN COALESCE(customerApprovedAt, SYSUTCDATETIME()) ELSE customerApprovedAt END
        WHERE id = @id;
        SELECT * FROM dbo.Quotations WHERE id = @id;
      `);
    return result.recordset[0];
  }
}

module.exports = QuotationModel;
