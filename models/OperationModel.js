const { poolPromise, sql } = require('../config/db');
const ProfitabilityModel = require('./ProfitabilityModel');

const OPERATION_STATUSES = [
  'CREATED',
  'ASSIGNED',
  'BOOKING',
  'DOCS_PENDING',
  'DOCS_COMPLETE',
  'SHIPPED',
  'IN_TRANSIT',
  'ARRIVED',
  'CUSTOMS',
  'RELEASED',
  'DELIVERY_SCHEDULED',
  'DELIVERED',
  'INVOICED',
  'CLOSED',
  'CANCELLED',
];

class OperationModel {
  static async getNextOperationNumber(transaction = null) {
    const request = transaction ? new sql.Request(transaction) : (await poolPromise).request();
    const year = new Date().getFullYear();
    const result = await request
      .input('prefix', sql.NVarChar(8), `OP-${year}-`)
      .query(`
        SELECT MAX(TRY_CONVERT(INT, RIGHT(operationNumber, 6))) AS lastNumber
        FROM dbo.Operations
        WHERE operationNumber LIKE @prefix + N'%'
      `);
    const next = Number(result.recordset[0]?.lastNumber || 0) + 1;
    return `OP-${year}-${String(next).padStart(6, '0')}`;
  }

  static async getAll(filters = {}) {
    const pool = await poolPromise;
    const request = pool.request()
      .input('search', sql.NVarChar(120), filters.search ? `%${filters.search}%` : null)
      .input('status', sql.NVarChar(40), filters.status || null);

    const result = await request.query(`
      SELECT
        o.id,
        o.operationNumber,
        o.quotationId,
        q.quotationNumber,
        o.customerId,
        c.companyName AS customerName,
        o.operationType,
        o.transportMode,
        o.cargoType,
        o.commodity,
        o.quantity,
        o.quantityUnitId,
        quantityUnit.code AS quantityUnitCode,
        o.grossWeight,
        o.weightUnitId,
        weightUnit.code AS weightUnitCode,
        o.volume,
        o.volumeUnitId,
        volumeUnit.code AS volumeUnitCode,
        o.origin,
        o.destination,
        o.etd,
        o.eta,
        o.ata,
        o.estimatedDeliveryDate,
        o.realDeliveryDate,
        o.status,
        o.commercialUserId,
        commercial.name AS commercialName,
        o.operativeUserId,
        operative.name AS operativeName,
        b.bookingNumber,
        b.blNumber,
        b.awbNumber,
        b.bookingCount,
        billing.billingStatus,
        billing.invoiceNumber,
        billing.invoicedAmount,
        billing.currency AS billingCurrency,
        o.createdAt,
        o.updatedAt
      FROM dbo.Operations AS o
      INNER JOIN dbo.Customers AS c ON c.id = o.customerId
      LEFT JOIN dbo.Quotations AS q ON q.id = o.quotationId
      LEFT JOIN dbo.Users AS commercial ON commercial.id = o.commercialUserId
      LEFT JOIN dbo.Users AS operative ON operative.id = o.operativeUserId
      LEFT JOIN dbo.MeasurementUnits AS quantityUnit ON quantityUnit.id = o.quantityUnitId
      LEFT JOIN dbo.MeasurementUnits AS weightUnit ON weightUnit.id = o.weightUnitId
      LEFT JOIN dbo.MeasurementUnits AS volumeUnit ON volumeUnit.id = o.volumeUnitId
      OUTER APPLY (
        SELECT TOP 1
          ob.bookingNumber,
          ob.blNumber,
          ob.awbNumber,
          (SELECT COUNT(1) FROM dbo.OperationBooking AS countBooking WHERE countBooking.operationId = o.id) AS bookingCount
        FROM dbo.OperationBooking AS ob
        WHERE ob.operationId = o.id
        ORDER BY ob.createdAt DESC, ob.id DESC
      ) AS b
      LEFT JOIN dbo.OperationBilling AS billing ON billing.operationId = o.id
      WHERE (@status IS NULL OR o.status = @status)
        AND (
          @search IS NULL
          OR o.operationNumber LIKE @search
          OR q.quotationNumber LIKE @search
          OR c.companyName LIKE @search
          OR o.origin LIKE @search
          OR o.destination LIKE @search
          OR EXISTS (
            SELECT 1
            FROM dbo.OperationBooking AS searchBooking
            WHERE searchBooking.operationId = o.id
              AND (
                searchBooking.bookingNumber LIKE @search
                OR searchBooking.blNumber LIKE @search
                OR searchBooking.awbNumber LIKE @search
              )
          )
        )
      ORDER BY o.createdAt DESC
    `);
    return result.recordset;
  }

  static async getById(id) {
    const pool = await poolPromise;
    const operationResult = await pool
      .request()
      .input('id', sql.Int, id)
      .query(`
        SELECT
          o.*,
          c.companyName AS customerName,
          c.creditEnabled,
          c.creditLimit,
          c.creditCurrency,
          c.creditDays,
          q.quotationNumber,
          commercial.name AS commercialName,
          operative.name AS operativeName,
          closed.name AS closedByName,
          quantityUnit.code AS quantityUnitCode,
          quantityUnit.name AS quantityUnitName,
          weightUnit.code AS weightUnitCode,
          weightUnit.name AS weightUnitName,
          volumeUnit.code AS volumeUnitCode,
          volumeUnit.name AS volumeUnitName
        FROM dbo.Operations AS o
        INNER JOIN dbo.Customers AS c ON c.id = o.customerId
        LEFT JOIN dbo.Quotations AS q ON q.id = o.quotationId
        LEFT JOIN dbo.Users AS commercial ON commercial.id = o.commercialUserId
        LEFT JOIN dbo.Users AS operative ON operative.id = o.operativeUserId
        LEFT JOIN dbo.Users AS closed ON closed.id = o.closedBy
        LEFT JOIN dbo.MeasurementUnits AS quantityUnit ON quantityUnit.id = o.quantityUnitId
        LEFT JOIN dbo.MeasurementUnits AS weightUnit ON weightUnit.id = o.weightUnitId
        LEFT JOIN dbo.MeasurementUnits AS volumeUnit ON volumeUnit.id = o.volumeUnitId
        WHERE o.id = @id
      `);

    const operation = operationResult.recordset[0];
    if (!operation) return null;

    const [bookings, bookingHbls, tracking, documents, customsRecords, localTransports, billing, finance, costs, profitability, commissions] = await Promise.all([
      this.getBookings(id),
      this.getBookingHbls(id),
      this.getTracking(id),
      this.getDocuments(id),
      this.getCustomsRecords(id),
      this.getLocalTransports(id),
      this.getBilling(id),
      this.getFinance(id),
      ProfitabilityModel.getCosts(id),
      ProfitabilityModel.getSummary(id),
      ProfitabilityModel.getCommissions(id),
    ]);

    const bookingsWithHbls = bookings.map((booking) => ({
      ...booking,
      hbls: bookingHbls.filter((hbl) => Number(hbl.bookingId) === Number(booking.id)),
    }));

    return {
      ...operation,
      bookings: bookingsWithHbls,
      booking: bookingsWithHbls[0] || null,
      tracking,
      documents,
      customsRecords,
      customs: customsRecords[0] || null,
      localTransports,
      localTransport: localTransports[0] || null,
      billing,
      finance,
      costs,
      profitability,
      commissions,
    };
  }

  static async findByQuotationId(quotationId) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('quotationId', sql.Int, quotationId)
      .query('SELECT TOP 1 * FROM dbo.Operations WHERE quotationId = @quotationId');
    return result.recordset[0] || null;
  }

  static async create(data) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const operationNumber = data.operationNumber || await this.getNextOperationNumber(transaction);
      await new sql.Request(transaction)
        .input('operationNumber', sql.NVarChar(30), operationNumber)
        .input('quotationId', sql.Int, data.quotationId || null)
        .input('customerId', sql.Int, data.customerId)
        .input('operationType', sql.NVarChar(20), data.operationType)
        .input('transportMode', sql.NVarChar(20), data.transportMode)
        .input('cargoType', sql.NVarChar(80), data.cargoType || null)
        .input('commodity', sql.NVarChar(180), data.commodity || null)
        .input('quantity', sql.Decimal(18, 3), data.quantity || null)
        .input('quantityUnitId', sql.Int, data.quantityUnitId || null)
        .input('grossWeight', sql.Decimal(18, 3), data.grossWeight || null)
        .input('weightUnitId', sql.Int, data.weightUnitId || null)
        .input('volume', sql.Decimal(18, 3), data.volume || null)
        .input('volumeUnitId', sql.Int, data.volumeUnitId || null)
        .input('bookingNumber', sql.NVarChar(80), data.bookingNumber || null)
        .input('blAwbNumber', sql.NVarChar(80), data.blAwbNumber || null)
        .input('origin', sql.NVarChar(150), data.origin || null)
        .input('destination', sql.NVarChar(150), data.destination || null)
        .input('etd', sql.Date, data.etd || null)
        .input('eta', sql.Date, data.eta || null)
        .input('ata', sql.Date, data.ata || null)
        .input('estimatedDeliveryDate', sql.Date, data.estimatedDeliveryDate || data.deliveryDate || null)
        .input('realDeliveryDate', sql.Date, data.realDeliveryDate || null)
        .input('status', sql.NVarChar(40), data.status || 'CREATED')
        .input('responsibleUserId', sql.Int, data.responsibleUserId || data.operativeUserId || null)
        .input('commercialUserId', sql.Int, data.commercialUserId || null)
        .input('operativeUserId', sql.Int, data.operativeUserId || data.responsibleUserId || null)
        .query(`
          INSERT INTO dbo.Operations
            (operationNumber, quotationId, customerId, operationType, transportMode, cargoType, commodity,
             quantity, quantityUnitId, grossWeight, weightUnitId, volume, volumeUnitId, bookingNumber, blAwbNumber,
             origin, destination, etd, eta, ata, estimatedDeliveryDate, realDeliveryDate, status, responsibleUserId,
             commercialUserId, operativeUserId)
          VALUES
            (@operationNumber, @quotationId, @customerId, @operationType, @transportMode, @cargoType, @commodity,
             @quantity, @quantityUnitId, @grossWeight, @weightUnitId, @volume, @volumeUnitId, @bookingNumber, @blAwbNumber,
             @origin, @destination, @etd, @eta, @ata, @estimatedDeliveryDate, @realDeliveryDate, @status, @responsibleUserId,
             @commercialUserId, @operativeUserId)
        `);

      const operationResult = await new sql.Request(transaction)
        .input('operationNumber', sql.NVarChar(30), operationNumber)
        .query('SELECT * FROM dbo.Operations WHERE operationNumber = @operationNumber');
      const operation = operationResult.recordset[0];

      const initialBookingResult = await new sql.Request(transaction)
        .input('operationId', sql.Int, operation.id)
        .input('createdBy', sql.Int, data.createdBy || data.commercialUserId || null)
        .query(`
          INSERT INTO dbo.OperationBooking (operationId, observations, createdBy)
          OUTPUT INSERTED.*
          VALUES (@operationId, N'Datos cotizados iniciales', @createdBy)
        `);
      const initialBooking = initialBookingResult.recordset[0];

      await this.addTrackingWithRequest(transaction, operation.id, {
        bookingId: initialBooking.id,
        status: operation.status,
        observation: 'Operacion creada',
        userId: data.createdBy || data.commercialUserId || null,
      }, false);

      await ProfitabilityModel.copyQuotedCosts(transaction, operation.id, data.quotationId || null, data.createdBy || data.commercialUserId || null, initialBooking.id);

      await transaction.commit();
      return operation;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  static async updateAssignment(operationId, data) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await new sql.Request(transaction)
        .input('operationId', sql.Int, operationId)
        .input('operativeUserId', sql.Int, data.operativeUserId || null)
        .input('status', sql.NVarChar(40), data.operativeUserId ? 'ASSIGNED' : 'CREATED')
        .query(`
          UPDATE dbo.Operations
          SET operativeUserId = @operativeUserId,
              responsibleUserId = @operativeUserId,
              status = @status
          WHERE id = @operationId
        `);

      await this.addTrackingWithRequest(transaction, operationId, {
        status: data.operativeUserId ? 'ASSIGNED' : 'CREATED',
        observation: data.observation || 'Responsable operativo actualizado',
        userId: data.userId || null,
      }, false);

      await transaction.commit();
      return await this.getById(operationId);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  static async updateDates(operationId, data) {
    const pool = await poolPromise;
    await pool
      .request()
      .input('operationId', sql.Int, operationId)
      .input('etd', sql.Date, data.etd || null)
      .input('eta', sql.Date, data.eta || null)
      .input('ata', sql.Date, data.ata || null)
      .input('estimatedDeliveryDate', sql.Date, data.estimatedDeliveryDate || null)
      .input('realDeliveryDate', sql.Date, data.realDeliveryDate || null)
      .query(`
          UPDATE dbo.Operations
          SET etd = @etd,
              eta = @eta,
              ata = @ata,
              estimatedDeliveryDate = @estimatedDeliveryDate,
              realDeliveryDate = @realDeliveryDate
          WHERE id = @operationId
      `);
    return await this.getById(operationId);
  }

  static async upsertBooking(operationId, data, bookingId = null) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await new sql.Request(transaction)
        .input('operationId', sql.Int, operationId)
        .input('bookingId', sql.Int, bookingId || data.id || null)
        .input('bookingNumber', sql.NVarChar(80), data.bookingNumber || null)
        .input('carrier', sql.NVarChar(150), data.carrier || null)
        .input('bookingDate', sql.Date, data.bookingDate || null)
        .input('vessel', sql.NVarChar(120), data.vessel || null)
        .input('voyage', sql.NVarChar(80), data.voyage || null)
        .input('blNumber', sql.NVarChar(80), data.blNumber || null)
        .input('awbNumber', sql.NVarChar(80), data.awbNumber || null)
        .input('mblNumber', sql.NVarChar(80), data.mblNumber || data.blNumber || null)
        .input('hblNumber', sql.NVarChar(80), data.hblNumber || null)
        .input('mblIssueDate', sql.Date, data.mblIssueDate || null)
        .input('mblShipper', sql.NVarChar(200), data.mblShipper || null)
        .input('mblConsignee', sql.NVarChar(200), data.mblConsignee || null)
        .input('mblNotifyParty', sql.NVarChar(200), data.mblNotifyParty || null)
        .input('containerNumber', sql.NVarChar(80), data.containerNumber || null)
        .input('cutOff', sql.DateTime2, data.cutOff ? new Date(data.cutOff) : null)
        .input('etd', sql.Date, data.etd || null)
        .input('eta', sql.Date, data.eta || null)
        .input('observations', sql.NVarChar(500), data.observations || null)
        .input('createdBy', sql.Int, data.createdBy || null)
        .query(`
          IF @bookingId IS NOT NULL
          BEGIN
            UPDATE dbo.OperationBooking
            SET bookingNumber = @bookingNumber,
                carrier = @carrier,
                bookingDate = @bookingDate,
                vessel = @vessel,
                voyage = @voyage,
                blNumber = @blNumber,
                awbNumber = @awbNumber,
                mblNumber = @mblNumber,
                hblNumber = @hblNumber,
                mblIssueDate = @mblIssueDate,
                mblShipper = @mblShipper,
                mblConsignee = @mblConsignee,
                mblNotifyParty = @mblNotifyParty,
                containerNumber = @containerNumber,
                cutOff = @cutOff,
                etd = @etd,
                eta = @eta,
                observations = @observations
            WHERE id = @bookingId AND operationId = @operationId;
          END
          ELSE
          BEGIN
            INSERT INTO dbo.OperationBooking
              (operationId, bookingNumber, carrier, bookingDate, vessel, voyage, blNumber, awbNumber, mblNumber, hblNumber, mblIssueDate, mblShipper, mblConsignee, mblNotifyParty,
               containerNumber, cutOff, etd, eta, observations, createdBy)
            VALUES
              (@operationId, @bookingNumber, @carrier, @bookingDate, @vessel, @voyage, @blNumber, @awbNumber, @mblNumber, @hblNumber, @mblIssueDate, @mblShipper, @mblConsignee, @mblNotifyParty,
               @containerNumber, @cutOff, @etd, @eta, @observations, @createdBy);
          END
        `);

      const result = await new sql.Request(transaction)
        .input('operationId', sql.Int, operationId)
        .input('bookingId', sql.Int, bookingId || data.id || null)
        .query(`
          SELECT TOP 1 *
          FROM dbo.OperationBooking
          WHERE operationId = @operationId
            AND (@bookingId IS NULL OR id = @bookingId)
          ORDER BY id DESC
        `);

      if (!result.recordset[0]) {
        const error = new Error('Booking no encontrado para la operacion');
        error.status = 404;
        throw error;
      }

      await new sql.Request(transaction)
        .input('operationId', sql.Int, operationId)
        .input('bookingNumber', sql.NVarChar(80), data.bookingNumber || null)
        .input('blAwbNumber', sql.NVarChar(80), data.mblNumber || data.blNumber || data.hblNumber || data.awbNumber || null)
        .input('etd', sql.Date, data.etd || null)
        .input('eta', sql.Date, data.eta || null)
        .query(`
          UPDATE dbo.Operations
          SET bookingNumber = @bookingNumber,
              blAwbNumber = @blAwbNumber,
              etd = COALESCE(@etd, etd),
              eta = COALESCE(@eta, eta),
              status = N'BOOKING'
          WHERE id = @operationId
        `);

      await this.addTrackingWithRequest(transaction, operationId, {
        bookingId: result.recordset[0]?.id || null,
        status: 'BOOKING',
        observation: data.observations || 'Booking registrado',
        userId: data.createdBy || null,
      }, false);

      await transaction.commit();
      return result.recordset[0];
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  static async getBooking(operationId) {
    const bookings = await this.getBookings(operationId);
    return bookings[0] || null;
  }

  static async getBookings(operationId) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('operationId', sql.Int, operationId)
      .query('SELECT * FROM dbo.OperationBooking WHERE operationId = @operationId ORDER BY createdAt DESC, id DESC');
    return result.recordset;
  }

  static async getBookingHbls(operationId, bookingId = null) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('operationId', sql.Int, operationId)
      .input('bookingId', sql.Int, bookingId || null)
      .query(`
        SELECT *
        FROM dbo.OperationBookingHbl
        WHERE operationId = @operationId
          AND (@bookingId IS NULL OR bookingId = @bookingId)
        ORDER BY createdAt DESC, id DESC
      `);
    return result.recordset;
  }

  static async upsertBookingHbl(operationId, bookingId, data, hblId = null) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('operationId', sql.Int, operationId)
      .input('bookingId', sql.Int, bookingId)
      .input('hblId', sql.Int, hblId || data.id || null)
      .input('hblNumber', sql.NVarChar(80), data.hblNumber || null)
      .input('customerName', sql.NVarChar(200), data.customerName || null)
      .input('weight', sql.Decimal(18, 3), data.weight || null)
      .input('volume', sql.Decimal(18, 3), data.volume || null)
      .input('status', sql.NVarChar(40), data.status || 'PENDING')
      .input('observations', sql.NVarChar(500), data.observations || null)
      .input('userId', sql.Int, data.userId || null)
      .query(`
        IF NOT EXISTS (SELECT 1 FROM dbo.OperationBooking WHERE id = @bookingId AND operationId = @operationId)
          THROW 50001, 'El booking no pertenece a la operacion', 1;

        IF @hblId IS NOT NULL
        BEGIN
          UPDATE dbo.OperationBookingHbl
          SET hblNumber = @hblNumber,
              customerName = @customerName,
              weight = @weight,
              volume = @volume,
              status = @status,
              observations = @observations,
              updatedBy = @userId
          WHERE id = @hblId AND bookingId = @bookingId AND operationId = @operationId;
        END
        ELSE
        BEGIN
          INSERT INTO dbo.OperationBookingHbl
            (operationId, bookingId, hblNumber, customerName, weight, volume, status, observations, createdBy)
          VALUES
            (@operationId, @bookingId, @hblNumber, @customerName, @weight, @volume, @status, @observations, @userId);
        END

        SELECT TOP 1 *
        FROM dbo.OperationBookingHbl
        WHERE operationId = @operationId
          AND bookingId = @bookingId
          AND (@hblId IS NULL OR id = @hblId)
        ORDER BY id DESC;
      `);
    return result.recordset[0] || null;
  }

  static async addTracking(operationId, data) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const result = await this.addTrackingWithRequest(transaction, operationId, data, true);
      await transaction.commit();
      return result;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  static async addTrackingWithRequest(transaction, operationId, data, updateOperation = true) {
    const result = await new sql.Request(transaction)
      .input('operationId', sql.Int, operationId)
      .input('bookingId', sql.Int, data.bookingId || null)
      .input('eventDate', sql.DateTime2, data.eventDate ? new Date(data.eventDate) : new Date())
      .input('status', sql.NVarChar(40), data.status)
      .input('observation', sql.NVarChar(500), data.observation || null)
      .input('userId', sql.Int, data.userId || null)
      .query(`
        INSERT INTO dbo.TrackingEvents (operationId, bookingId, eventDate, status, observation, userId)
        OUTPUT INSERTED.*
        VALUES (@operationId, @bookingId, @eventDate, @status, @observation, @userId)
      `);

    if (updateOperation) {
      await new sql.Request(transaction)
        .input('operationId', sql.Int, operationId)
        .input('status', sql.NVarChar(40), data.status)
        .query('UPDATE dbo.Operations SET status = @status WHERE id = @operationId');
    }

    return result.recordset[0];
  }

  static async getTracking(operationId, bookingId = null) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('operationId', sql.Int, operationId)
      .input('bookingId', sql.Int, bookingId || null)
      .query(`
        SELECT t.*, u.name AS userName, b.bookingNumber
        FROM dbo.TrackingEvents AS t
        LEFT JOIN dbo.Users AS u ON u.id = t.userId
        LEFT JOIN dbo.OperationBooking AS b ON b.id = t.bookingId
        WHERE t.operationId = @operationId
          AND (@bookingId IS NULL OR t.bookingId = @bookingId)
        ORDER BY t.eventDate DESC, t.createdAt DESC
      `);
    return result.recordset;
  }

  static async addDocument(operationId, data) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('operationId', sql.Int, operationId)
      .input('bookingId', sql.Int, data.bookingId || null)
      .input('documentType', sql.NVarChar(40), data.documentType)
      .input('fileName', sql.NVarChar(255), data.fileName)
      .input('filePath', sql.NVarChar(500), data.filePath || null)
      .input('mimeType', sql.NVarChar(120), data.mimeType || null)
      .input('uploadedBy', sql.Int, data.uploadedBy || null)
      .query(`
        INSERT INTO dbo.OperationDocuments (operationId, bookingId, documentType, fileName, filePath, mimeType, uploadedBy)
        OUTPUT INSERTED.*
        VALUES (@operationId, @bookingId, @documentType, @fileName, @filePath, @mimeType, @uploadedBy)
      `);
    return result.recordset[0];
  }

  static async deactivateDocument(documentId) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('documentId', sql.Int, documentId)
      .query('UPDATE dbo.OperationDocuments SET estado = 0 OUTPUT INSERTED.* WHERE id = @documentId');
    return result.recordset[0];
  }

  static async getDocuments(operationId) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('operationId', sql.Int, operationId)
      .query(`
        SELECT d.*, u.name AS uploadedByName, b.bookingNumber
        FROM dbo.OperationDocuments AS d
        LEFT JOIN dbo.Users AS u ON u.id = d.uploadedBy
        LEFT JOIN dbo.OperationBooking AS b ON b.id = d.bookingId
        WHERE d.operationId = @operationId AND d.estado = 1
        ORDER BY d.uploadedAt DESC
      `);
    return result.recordset;
  }

  static async upsertCustoms(operationId, data) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await new sql.Request(transaction)
        .input('operationId', sql.Int, operationId)
        .input('bookingId', sql.Int, data.bookingId || null)
        .input('damNumber', sql.NVarChar(80), data.damNumber || null)
        .input('channel', sql.NVarChar(20), data.channel || null)
        .input('taxesAmount', sql.Decimal(18, 2), data.taxesAmount ?? 0)
        .input('numberingDate', sql.Date, data.numberingDate || null)
        .input('releaseDate', sql.Date, data.releaseDate || null)
        .input('customsStatus', sql.NVarChar(80), data.customsStatus || null)
        .input('observations', sql.NVarChar(500), data.observations || null)
        .input('createdBy', sql.Int, data.createdBy || null)
        .query(`
          MERGE dbo.OperationCustoms AS target
          USING (SELECT @operationId AS operationId, @bookingId AS bookingId) AS source
          ON target.operationId = source.operationId
             AND ISNULL(target.bookingId, -1) = ISNULL(source.bookingId, -1)
          WHEN MATCHED THEN
            UPDATE SET damNumber = @damNumber, channel = @channel, taxesAmount = @taxesAmount,
                       numberingDate = @numberingDate, releaseDate = @releaseDate,
                       customsStatus = @customsStatus, observations = @observations
          WHEN NOT MATCHED THEN
            INSERT (operationId, bookingId, damNumber, channel, taxesAmount, numberingDate, releaseDate, customsStatus, observations, createdBy)
            VALUES (@operationId, @bookingId, @damNumber, @channel, @taxesAmount, @numberingDate, @releaseDate, @customsStatus, @observations, @createdBy);
        `);

      const result = await new sql.Request(transaction)
        .input('operationId', sql.Int, operationId)
        .input('bookingId', sql.Int, data.bookingId || null)
        .query('SELECT TOP 1 * FROM dbo.OperationCustoms WHERE operationId = @operationId AND ISNULL(bookingId, -1) = ISNULL(@bookingId, -1)');

      const nextStatus = data.releaseDate ? 'RELEASED' : 'CUSTOMS';
      await this.addTrackingWithRequest(transaction, operationId, {
        bookingId: data.bookingId || null,
        status: nextStatus,
        observation: data.observations || (nextStatus === 'RELEASED' ? 'Levante registrado' : 'Gestion aduanera registrada'),
        userId: data.createdBy || null,
      }, true);

      await transaction.commit();
      return result.recordset[0];
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  static async getCustoms(operationId) {
    const records = await this.getCustomsRecords(operationId);
    return records[0] || null;
  }

  static async getCustomsRecords(operationId) {
    const pool = await poolPromise;
    const result = await pool.request().input('operationId', sql.Int, operationId).query('SELECT * FROM dbo.OperationCustoms WHERE operationId = @operationId ORDER BY updatedAt DESC, id DESC');
    return result.recordset;
  }

  static async upsertLocalTransport(operationId, data) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await new sql.Request(transaction)
        .input('operationId', sql.Int, operationId)
        .input('bookingId', sql.Int, data.bookingId || null)
        .input('carrierName', sql.NVarChar(150), data.carrierName || null)
        .input('plateNumber', sql.NVarChar(40), data.plateNumber || null)
        .input('driverName', sql.NVarChar(120), data.driverName || null)
        .input('driverPhone', sql.NVarChar(50), data.driverPhone || null)
        .input('scheduledDate', sql.DateTime2, data.scheduledDate ? new Date(data.scheduledDate) : null)
        .input('deliveryDate', sql.DateTime2, data.deliveryDate ? new Date(data.deliveryDate) : null)
        .input('deliveryPlace', sql.NVarChar(250), data.deliveryPlace || null)
        .input('podFilePath', sql.NVarChar(500), data.podFilePath || null)
        .input('observations', sql.NVarChar(500), data.observations || null)
        .input('createdBy', sql.Int, data.createdBy || null)
        .query(`
          MERGE dbo.OperationLocalTransport AS target
          USING (SELECT @operationId AS operationId, @bookingId AS bookingId) AS source
          ON target.operationId = source.operationId
             AND ISNULL(target.bookingId, -1) = ISNULL(source.bookingId, -1)
          WHEN MATCHED THEN
            UPDATE SET carrierName = @carrierName, plateNumber = @plateNumber, driverName = @driverName,
                       driverPhone = @driverPhone, scheduledDate = @scheduledDate, deliveryDate = @deliveryDate,
                       deliveryPlace = @deliveryPlace, podFilePath = @podFilePath, observations = @observations
          WHEN NOT MATCHED THEN
            INSERT (operationId, bookingId, carrierName, plateNumber, driverName, driverPhone, scheduledDate, deliveryDate,
                    deliveryPlace, podFilePath, observations, createdBy)
            VALUES (@operationId, @bookingId, @carrierName, @plateNumber, @driverName, @driverPhone, @scheduledDate, @deliveryDate,
                    @deliveryPlace, @podFilePath, @observations, @createdBy);
        `);

      const result = await new sql.Request(transaction)
        .input('operationId', sql.Int, operationId)
        .input('bookingId', sql.Int, data.bookingId || null)
        .query('SELECT TOP 1 * FROM dbo.OperationLocalTransport WHERE operationId = @operationId AND ISNULL(bookingId, -1) = ISNULL(@bookingId, -1)');

      const nextStatus = data.deliveryDate ? 'DELIVERED' : 'DELIVERY_SCHEDULED';
      await new sql.Request(transaction)
        .input('operationId', sql.Int, operationId)
        .input('realDeliveryDate', sql.Date, data.deliveryDate ? new Date(data.deliveryDate) : null)
        .query('UPDATE dbo.Operations SET realDeliveryDate = COALESCE(@realDeliveryDate, realDeliveryDate) WHERE id = @operationId');
      await this.addTrackingWithRequest(transaction, operationId, {
        bookingId: data.bookingId || null,
        status: nextStatus,
        observation: data.observations || (nextStatus === 'DELIVERED' ? 'Entrega confirmada' : 'Transporte local programado'),
        userId: data.createdBy || null,
      }, true);

      await transaction.commit();
      return result.recordset[0];
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  static async getLocalTransport(operationId) {
    const records = await this.getLocalTransports(operationId);
    return records[0] || null;
  }

  static async getLocalTransports(operationId) {
    const pool = await poolPromise;
    const result = await pool.request().input('operationId', sql.Int, operationId).query('SELECT * FROM dbo.OperationLocalTransport WHERE operationId = @operationId ORDER BY updatedAt DESC, id DESC');
    return result.recordset;
  }

  static async upsertBilling(operationId, data) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await new sql.Request(transaction)
        .input('operationId', sql.Int, operationId)
        .input('billingStatus', sql.NVarChar(20), data.billingStatus || 'PENDIENTE')
        .input('invoiceNumber', sql.NVarChar(80), data.invoiceNumber || null)
        .input('invoiceDate', sql.Date, data.invoiceDate || null)
        .input('invoicedAmount', sql.Decimal(18, 2), data.invoicedAmount ?? 0)
        .input('currency', sql.NVarChar(3), data.currency || 'USD')
        .input('observations', sql.NVarChar(500), data.observations || null)
        .input('createdBy', sql.Int, data.createdBy || null)
        .query(`
          MERGE dbo.OperationBilling AS target
          USING (SELECT @operationId AS operationId) AS source
          ON target.operationId = source.operationId
          WHEN MATCHED THEN
            UPDATE SET billingStatus = @billingStatus, invoiceNumber = @invoiceNumber, invoiceDate = @invoiceDate,
                       invoicedAmount = @invoicedAmount, currency = @currency, observations = @observations
          WHEN NOT MATCHED THEN
            INSERT (operationId, billingStatus, invoiceNumber, invoiceDate, invoicedAmount, currency, observations, createdBy)
            VALUES (@operationId, @billingStatus, @invoiceNumber, @invoiceDate, @invoicedAmount, @currency, @observations, @createdBy);
        `);

      const result = await new sql.Request(transaction)
        .input('operationId', sql.Int, operationId)
        .query('SELECT * FROM dbo.OperationBilling WHERE operationId = @operationId');

      if ((data.billingStatus || '').toUpperCase() === 'FACTURADO') {
        await this.addTrackingWithRequest(transaction, operationId, {
          status: 'INVOICED',
          observation: data.observations || 'Facturacion registrada',
          userId: data.createdBy || null,
        }, true);
      }

      await transaction.commit();
      return result.recordset[0];
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  static async getBilling(operationId) {
    const pool = await poolPromise;
    const result = await pool.request().input('operationId', sql.Int, operationId).query('SELECT * FROM dbo.OperationBilling WHERE operationId = @operationId');
    return result.recordset[0] || null;
  }

  static async closeOperation(operationId, data) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      await new sql.Request(transaction)
        .input('operationId', sql.Int, operationId)
        .input('closedBy', sql.Int, data.closedBy || null)
        .input('closeObservation', sql.NVarChar(500), data.closeObservation || null)
        .query(`
          UPDATE dbo.Operations
          SET status = N'CLOSED',
              closedBy = @closedBy,
              closedAt = SYSUTCDATETIME(),
              closeObservation = @closeObservation
          WHERE id = @operationId
        `);

      await this.addTrackingWithRequest(transaction, operationId, {
        status: 'CLOSED',
        observation: data.closeObservation || 'Operacion cerrada',
        userId: data.closedBy || null,
      }, false);

      await ProfitabilityModel.generateCommissionForOperation(transaction, operationId, data.closedBy || null);

      await transaction.commit();
      return await this.getById(operationId);
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  static async addFinanceItem(operationId, data) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('operationId', sql.Int, operationId)
      .input('itemType', sql.NVarChar(10), data.itemType)
      .input('category', sql.NVarChar(80), data.category)
      .input('description', sql.NVarChar(200), data.description || null)
      .input('estimatedAmount', sql.Decimal(18, 2), data.estimatedAmount ?? 0)
      .input('realAmount', sql.Decimal(18, 2), data.realAmount ?? 0)
      .input('currency', sql.NVarChar(3), data.currency || 'USD')
      .input('billingStatus', sql.NVarChar(30), data.billingStatus || 'pendiente')
      .query(`
        INSERT INTO dbo.OperationFinanceItems
          (operationId, itemType, category, description, estimatedAmount, realAmount, currency, billingStatus)
        OUTPUT INSERTED.*
        VALUES
          (@operationId, @itemType, @category, @description, @estimatedAmount, @realAmount, @currency, @billingStatus)
      `);
    return result.recordset[0];
  }

  static async getFinance(operationId) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('operationId', sql.Int, operationId)
      .query(`
        SELECT *
        FROM dbo.OperationFinanceItems
        WHERE operationId = @operationId
        ORDER BY createdAt DESC
      `);
    return result.recordset;
  }
}

OperationModel.OPERATION_STATUSES = OPERATION_STATUSES;

module.exports = OperationModel;

