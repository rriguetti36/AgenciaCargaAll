const { poolPromise, sql } = require('../config/db');

class SaleModel {
  static async getNextSaleNumber(transaction) {
    const year = new Date().getFullYear();
    const result = await new sql.Request(transaction)
      .input('prefix', sql.NVarChar(10), `V-${year}-`)
      .query(`
        SELECT MAX(TRY_CONVERT(INT, RIGHT(saleNumber, 6))) AS lastNumber
        FROM dbo.Sales
        WHERE saleNumber LIKE @prefix + N'%'
      `);
    const next = Number(result.recordset[0]?.lastNumber || 0) + 1;
    return `V-${year}-${String(next).padStart(6, '0')}`;
  }

  static async getAll() {
    const pool = await poolPromise;
    const result = await pool.request().query(`
      SELECT
        o.id AS operationId,
        o.operationNumber,
        c.companyName AS customerName,
        b.billingStatus,
        COALESCE(b.invoicedAmount, profitability.totalSale, 0) AS total,
        COALESCE(b.currency, profitability.currency, N'USD') AS currency,
        s.id AS saleId,
        s.saleNumber,
        s.status AS saleStatus,
        s.saleDate,
        d.documentType,
        d.documentNumber,
        d.issueDate
      FROM dbo.Operations AS o
      INNER JOIN dbo.Customers AS c ON c.id = o.customerId
      LEFT JOIN dbo.OperationBilling AS b ON b.operationId = o.id
      LEFT JOIN dbo.Sales AS s ON s.operationId = o.id
      LEFT JOIN (
        SELECT
          operationId,
          SUM(saleAmount) AS totalSale,
          MAX(currency) AS currency
        FROM dbo.OperationCosts
        WHERE status <> N'CANCELLED'
        GROUP BY operationId
      ) AS profitability ON profitability.operationId = o.id
      OUTER APPLY (
        SELECT TOP 1 *
        FROM dbo.SaleDocuments AS sd
        WHERE sd.saleId = s.id
        ORDER BY sd.issueDate DESC
      ) AS d
      WHERE o.status <> N'CANCELLED'
         OR s.id IS NOT NULL
      ORDER BY COALESCE(s.createdAt, o.updatedAt, o.createdAt) DESC
    `);
    return result.recordset;
  }

  static async getById(id) {
    const pool = await poolPromise;
    const saleResult = await pool.request()
      .input('id', sql.Int, id)
      .query(`
        SELECT s.*, o.operationNumber, c.companyName AS customerName, c.taxId
        FROM dbo.Sales AS s
        INNER JOIN dbo.Operations AS o ON o.id = s.operationId
        INNER JOIN dbo.Customers AS c ON c.id = s.customerId
        WHERE s.id = @id
      `);

    const sale = saleResult.recordset[0];
    if (!sale) return null;

    const docs = await pool.request()
      .input('saleId', sql.Int, id)
      .query('SELECT * FROM dbo.SaleDocuments WHERE saleId = @saleId ORDER BY issueDate DESC');

    return { ...sale, documents: docs.recordset };
  }

  static async getByOperationId(operationId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('operationId', sql.Int, operationId)
      .query('SELECT TOP 1 * FROM dbo.Sales WHERE operationId = @operationId');
    return result.recordset[0] || null;
  }

  static async issue(operationId, data, userId = null) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const operationResult = await new sql.Request(transaction)
        .input('operationId', sql.Int, operationId)
        .query(`
          SELECT
            o.id,
            o.customerId,
            COALESCE(b.currency, profitability.currency, N'USD') AS currency,
            COALESCE(b.invoicedAmount, profitability.totalSale, 0) AS total
          FROM dbo.Operations AS o
          LEFT JOIN dbo.OperationBilling AS b ON b.operationId = o.id
          LEFT JOIN (
            SELECT operationId, SUM(saleAmount) AS totalSale, MAX(currency) AS currency
            FROM dbo.OperationCosts
            WHERE status <> N'CANCELLED'
            GROUP BY operationId
          ) AS profitability ON profitability.operationId = o.id
          WHERE o.id = @operationId
        `);
      const operation = operationResult.recordset[0];
      if (!operation) {
        const error = new Error('Operacion no encontrada');
        error.status = 404;
        throw error;
      }

      let sale = await new sql.Request(transaction)
        .input('operationId', sql.Int, operationId)
        .query('SELECT TOP 1 * FROM dbo.Sales WHERE operationId = @operationId');
      sale = sale.recordset[0];

      if (!sale) {
        const saleNumber = await this.getNextSaleNumber(transaction);
        const saleResult = await new sql.Request(transaction)
          .input('operationId', sql.Int, operationId)
          .input('customerId', sql.Int, operation.customerId)
          .input('saleNumber', sql.NVarChar(30), saleNumber)
          .input('currency', sql.NVarChar(3), operation.currency || 'USD')
          .input('subtotal', sql.Decimal(18, 2), operation.total || 0)
          .input('total', sql.Decimal(18, 2), operation.total || 0)
          .input('createdBy', sql.Int, userId)
          .query(`
            INSERT INTO dbo.Sales (operationId, customerId, saleNumber, currency, subtotal, total, createdBy)
            OUTPUT INSERTED.*
            VALUES (@operationId, @customerId, @saleNumber, @currency, @subtotal, @total, @createdBy)
          `);
        sale = saleResult.recordset[0];
      }

      const documentType = data.documentType || 'FACTURA';
      const prefix = documentType === 'BOLETA' ? 'B001' : 'F001';
      const nextDoc = await new sql.Request(transaction)
        .input('prefix', sql.NVarChar(6), `${prefix}-`)
        .query(`
          SELECT MAX(TRY_CONVERT(INT, RIGHT(documentNumber, 6))) AS lastNumber
          FROM dbo.SaleDocuments
          WHERE documentNumber LIKE @prefix + N'%'
        `);
      const number = Number(nextDoc.recordset[0]?.lastNumber || 0) + 1;
      const documentNumber = data.documentNumber || `${prefix}-${String(number).padStart(6, '0')}`;

      const documentResult = await new sql.Request(transaction)
        .input('saleId', sql.Int, sale.id)
        .input('documentType', sql.NVarChar(20), documentType)
        .input('documentNumber', sql.NVarChar(40), documentNumber)
        .input('observations', sql.NVarChar(500), data.observations || null)
        .input('createdBy', sql.Int, userId)
        .query(`
          INSERT INTO dbo.SaleDocuments (saleId, documentType, documentNumber, observations, createdBy)
          OUTPUT INSERTED.*
          VALUES (@saleId, @documentType, @documentNumber, @observations, @createdBy)
        `);

      await new sql.Request(transaction)
        .input('saleId', sql.Int, sale.id)
        .query("UPDATE dbo.Sales SET status = N'ISSUED' WHERE id = @saleId");

      await transaction.commit();
      return { sale: await this.getById(sale.id), document: documentResult.recordset[0] };
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }
}

module.exports = SaleModel;
