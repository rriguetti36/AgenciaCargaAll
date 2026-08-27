const { poolPromise, sql } = require('../config/db');

class CustomerModel {
  static canSeeAll(user) {
    return user?.role === 'admin';
  }

  static async getAll(user = null) {
    const pool = await poolPromise;
    const canSeeAll = this.canSeeAll(user) ? 1 : 0;
    const result = await pool.request()
      .input('canSeeAll', sql.Bit, canSeeAll)
      .input('createdBy', sql.Int, user?.id || null)
      .query(`
      SELECT
        c.id,
        c.companyName,
        c.tradeName,
        c.taxId,
        c.fiscalAddress,
        c.email,
        c.phone,
        c.creditEnabled,
        c.creditLimit,
        c.creditCurrency,
        c.creditDays,
        c.creditNotes,
        c.estado,
        c.createdBy,
        creator.name AS createdByName,
        c.createdAt,
        c.updatedAt,
        COUNT(cc.id) AS contactsCount
      FROM dbo.Customers AS c
      LEFT JOIN dbo.CustomerContacts AS cc ON cc.customerId = c.id
      LEFT JOIN dbo.Users AS creator ON creator.id = c.createdBy
      WHERE (@canSeeAll = 1 OR c.createdBy = @createdBy OR c.createdBy IS NULL)
      GROUP BY c.id, c.companyName, c.tradeName, c.taxId, c.fiscalAddress, c.email, c.phone,
               c.creditEnabled, c.creditLimit, c.creditCurrency, c.creditDays, c.creditNotes,
               c.estado, c.createdBy, creator.name, c.createdAt, c.updatedAt
      ORDER BY c.createdAt DESC
    `);
    return result.recordset;
  }

  static async getById(id, user = null) {
    const pool = await poolPromise;
    const canSeeAll = this.canSeeAll(user) ? 1 : 0;
    const customerResult = await pool
      .request()
      .input('id', sql.Int, id)
      .input('canSeeAll', sql.Bit, canSeeAll)
      .input('createdBy', sql.Int, user?.id || null)
      .query(`
        SELECT c.*, creator.name AS createdByName
        FROM dbo.Customers AS c
        LEFT JOIN dbo.Users AS creator ON creator.id = c.createdBy
        WHERE c.id = @id
          AND (@canSeeAll = 1 OR c.createdBy = @createdBy OR c.createdBy IS NULL)
      `);

    const customer = customerResult.recordset[0];
    if (!customer) return null;

    const contactsResult = await pool
      .request()
      .input('customerId', sql.Int, id)
      .query('SELECT * FROM dbo.CustomerContacts WHERE customerId = @customerId ORDER BY isPrimary DESC, name ASC');

    return { ...customer, contacts: contactsResult.recordset };
  }

  static async create(data) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('companyName', sql.NVarChar(180), data.companyName)
      .input('tradeName', sql.NVarChar(180), data.tradeName || null)
      .input('taxId', sql.NVarChar(30), data.taxId || null)
      .input('fiscalAddress', sql.NVarChar(300), data.fiscalAddress || null)
      .input('email', sql.NVarChar(150), data.email || null)
      .input('phone', sql.NVarChar(50), data.phone || null)
      .input('creditEnabled', sql.Bit, data.creditEnabled ? 1 : 0)
      .input('creditLimit', sql.Decimal(18, 2), data.creditLimit ?? 0)
      .input('creditCurrency', sql.NVarChar(3), data.creditCurrency || 'USD')
      .input('creditDays', sql.Int, data.creditDays ?? 0)
      .input('creditNotes', sql.NVarChar(500), data.creditNotes || null)
      .input('estado', sql.Bit, data.estado ?? 1)
      .input('createdBy', sql.Int, data.createdBy || null)
      .query(`
        INSERT INTO dbo.Customers (companyName, tradeName, taxId, fiscalAddress, email, phone, creditEnabled, creditLimit, creditCurrency, creditDays, creditNotes, estado, createdBy)
        OUTPUT INSERTED.*
        VALUES (@companyName, @tradeName, @taxId, @fiscalAddress, @email, @phone, @creditEnabled, @creditLimit, @creditCurrency, @creditDays, @creditNotes, @estado, @createdBy)
      `);
    return result.recordset[0];
  }

  static async update(id, data) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .input('companyName', sql.NVarChar(180), data.companyName)
      .input('tradeName', sql.NVarChar(180), data.tradeName || null)
      .input('taxId', sql.NVarChar(30), data.taxId || null)
      .input('fiscalAddress', sql.NVarChar(300), data.fiscalAddress || null)
      .input('email', sql.NVarChar(150), data.email || null)
      .input('phone', sql.NVarChar(50), data.phone || null)
      .input('creditEnabled', sql.Bit, data.creditEnabled ? 1 : 0)
      .input('creditLimit', sql.Decimal(18, 2), data.creditLimit ?? 0)
      .input('creditCurrency', sql.NVarChar(3), data.creditCurrency || 'USD')
      .input('creditDays', sql.Int, data.creditDays ?? 0)
      .input('creditNotes', sql.NVarChar(500), data.creditNotes || null)
      .input('estado', sql.Bit, data.estado ?? 1)
      .input('createdBy', sql.Int, data.createdBy || null)
      .query(`
        UPDATE dbo.Customers
        SET companyName = @companyName,
            tradeName = @tradeName,
            taxId = @taxId,
            fiscalAddress = @fiscalAddress,
            email = @email,
            phone = @phone,
            creditEnabled = @creditEnabled,
            creditLimit = @creditLimit,
            creditCurrency = @creditCurrency,
            creditDays = @creditDays,
            creditNotes = @creditNotes,
            estado = @estado,
            createdBy = @createdBy
        WHERE id = @id;

        SELECT * FROM dbo.Customers WHERE id = @id;
      `);
    return result.recordset[0];
  }

  static async getCreditExposure(customerId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('customerId', sql.Int, customerId)
      .query(`
        DECLARE @creditEnabled BIT;
        DECLARE @creditLimit DECIMAL(18,2);
        DECLARE @unpaidTotal DECIMAL(18,2);

        SELECT
          @creditEnabled = COALESCE(creditEnabled, 0),
          @creditLimit = COALESCE(creditLimit, 0)
        FROM dbo.Customers
        WHERE id = @customerId;

        SELECT @unpaidTotal = COALESCE(SUM(CASE
          WHEN oc.status <> N'CANCELLED'
           AND COALESCE(oc.costResponsibility, N'COMPANY') = N'CLIENT'
           AND oc.customerPaymentStatus <> N'PAID'
          THEN oc.realCost ELSE 0 END), 0)
        FROM dbo.Operations AS o
        INNER JOIN dbo.OperationCosts AS oc ON oc.operationId = o.id
        WHERE o.customerId = @customerId
          AND o.status <> N'CANCELLED';

        SELECT CASE
          WHEN @creditEnabled = 0 THEN 0
          WHEN @unpaidTotal > @creditLimit THEN @creditLimit
          ELSE @unpaidTotal
        END AS usedCredit
      `);
    return Number(result.recordset[0]?.usedCredit || 0);
  }

  static async getCreditExposureBeforeOperation(customerId, operationId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('customerId', sql.Int, customerId)
      .input('operationId', sql.Int, operationId)
      .query(`
        DECLARE @creditEnabled BIT;
        DECLARE @creditLimit DECIMAL(18,2);
        DECLARE @unpaidTotal DECIMAL(18,2);

        SELECT
          @creditEnabled = COALESCE(creditEnabled, 0),
          @creditLimit = COALESCE(creditLimit, 0)
        FROM dbo.Customers
        WHERE id = @customerId;

        SELECT @unpaidTotal = COALESCE(SUM(CASE
          WHEN oc.status <> N'CANCELLED'
           AND COALESCE(oc.costResponsibility, N'COMPANY') = N'CLIENT'
           AND oc.customerPaymentStatus <> N'PAID'
          THEN oc.realCost ELSE 0 END), 0)
        FROM dbo.Operations AS o
        INNER JOIN dbo.OperationCosts AS oc ON oc.operationId = o.id
        WHERE o.customerId = @customerId
          AND o.id <> @operationId
          AND o.status <> N'CANCELLED';

        SELECT CASE
          WHEN @creditEnabled = 0 THEN 0
          WHEN @unpaidTotal > @creditLimit THEN @creditLimit
          ELSE @unpaidTotal
        END AS usedCredit
      `);
    return Number(result.recordset[0]?.usedCredit || 0);
  }

  static async getCreditExposureByOperation(customerId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('customerId', sql.Int, customerId)
      .query(`
        SELECT *
        FROM (
          SELECT
            o.id,
            CASE
              WHEN COALESCE(c.creditEnabled, 0) = 0 THEN 0
              WHEN SUM(CASE
                WHEN oc.status <> N'CANCELLED'
                 AND COALESCE(oc.costResponsibility, N'COMPANY') = N'CLIENT'
                 AND oc.customerPaymentStatus <> N'PAID'
                THEN oc.realCost ELSE 0 END) > COALESCE(c.creditLimit, 0)
              THEN COALESCE(c.creditLimit, 0)
              ELSE SUM(CASE
                WHEN oc.status <> N'CANCELLED'
                 AND COALESCE(oc.costResponsibility, N'COMPANY') = N'CLIENT'
                 AND oc.customerPaymentStatus <> N'PAID'
                THEN oc.realCost ELSE 0 END)
            END AS operationCreditApplied
          FROM dbo.Operations AS o
          INNER JOIN dbo.Customers AS c ON c.id = o.customerId
          INNER JOIN dbo.OperationCosts AS oc ON oc.operationId = o.id
          WHERE o.customerId = @customerId
            AND o.status <> N'CANCELLED'
          GROUP BY o.id, c.creditEnabled, c.creditLimit
        ) AS exposure
      `);
    return result.recordset;
  }

  static async createContact(customerId, data) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('customerId', sql.Int, customerId)
      .input('name', sql.NVarChar(120), data.name)
      .input('position', sql.NVarChar(100), data.position || null)
      .input('email', sql.NVarChar(150), data.email || null)
      .input('phone', sql.NVarChar(50), data.phone || null)
      .input('isPrimary', sql.Bit, data.isPrimary ? 1 : 0)
      .input('estado', sql.Bit, data.estado ?? 1)
      .query(`
        INSERT INTO dbo.CustomerContacts (customerId, name, position, email, phone, isPrimary, estado)
        OUTPUT INSERTED.*
        VALUES (@customerId, @name, @position, @email, @phone, @isPrimary, @estado)
      `);
    return result.recordset[0];
  }
}

module.exports = CustomerModel;
