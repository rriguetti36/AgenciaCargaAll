const { poolPromise, sql } = require('../config/db');

class ProfitabilityModel {
  static request(transaction) {
    return transaction ? new sql.Request(transaction) : null;
  }

  static async copyQuotedCosts(transaction, operationId, quotationId, userId = null, bookingId = null) {
    if (!quotationId) return [];

    const result = await new sql.Request(transaction)
      .input('operationId', sql.Int, operationId)
      .input('quotationId', sql.Int, quotationId)
        .input('createdBy', sql.Int, userId)
        .input('bookingId', sql.Int, bookingId || null)
        .query(`
        DECLARE @Changed TABLE (
          id INT,
          operationId INT,
          quotationChargeId INT NULL,
          concept NVARCHAR(200),
          provider NVARCHAR(180) NULL,
          estimatedCost DECIMAL(18, 2),
          realCost DECIMAL(18, 2),
          saleAmount DECIMAL(18, 2),
          estimatedProfit DECIMAL(19, 2),
          realProfit DECIMAL(19, 2),
          currency NVARCHAR(3),
          documentNumber NVARCHAR(80) NULL,
          observations NVARCHAR(500) NULL,
          status NVARCHAR(20),
          createdBy INT NULL,
          updatedBy INT NULL,
          createdAt DATETIME2,
          updatedAt DATETIME2,
          bookingId INT NULL,
          chargeSection NVARCHAR(50) NULL,
          costScope NVARCHAR(20)
        );

        INSERT INTO dbo.OperationCosts
          (operationId, bookingId, quotationChargeId, costScope, chargeSection, concept, estimatedCost, realCost, saleAmount, currency, status, costResponsibility, customerPaymentStatus, createdBy)
        OUTPUT INSERTED.id, INSERTED.operationId, INSERTED.quotationChargeId, INSERTED.concept, INSERTED.provider,
               INSERTED.estimatedCost, INSERTED.realCost, INSERTED.saleAmount, INSERTED.estimatedProfit, INSERTED.realProfit,
               INSERTED.currency, INSERTED.documentNumber, INSERTED.observations, INSERTED.status, INSERTED.createdBy,
               INSERTED.updatedBy, INSERTED.createdAt, INSERTED.updatedAt, INSERTED.bookingId, INSERTED.chargeSection, INSERTED.costScope
        INTO @Changed
        SELECT
          @operationId,
          CASE
            WHEN COALESCE(qc.section, qc.chargeType) IN (N'gastos_origen', N'gastos_destino', N'origen', N'destino') THEN @bookingId
            ELSE NULL
          END,
          qc.id,
          CASE
            WHEN COALESCE(qc.section, qc.chargeType) IN (N'gastos_origen', N'gastos_destino', N'origen', N'destino') THEN N'BOOKING'
            ELSE N'OPERATION'
          END,
          COALESCE(qc.section, qc.chargeType),
          COALESCE(NULLIF(qc.description, N''), qc.chargeType),
          qc.costAmount,
          qc.costAmount,
          qc.saleAmount,
          COALESCE(qc.currency, q.currency, N'USD'),
          N'PENDING',
          N'COMPANY',
          N'UNPAID',
          @createdBy
        FROM dbo.QuotationCharges AS qc
        INNER JOIN dbo.Quotations AS q ON q.id = qc.quotationId
        WHERE qc.quotationId = @quotationId
          AND NOT EXISTS (
            SELECT 1
            FROM dbo.OperationCosts AS oc
            WHERE oc.quotationChargeId = qc.id
          )

        SELECT *
        FROM @Changed;
      `);
    return result.recordset;
  }

  static async syncQuotedCosts(operationId, quotationId, userId = null) {
    if (!operationId || !quotationId) return [];
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const bookingResult = await new sql.Request(transaction)
        .input('operationId', sql.Int, operationId)
        .query(`
          SELECT TOP 1 id
          FROM dbo.OperationBooking
          WHERE operationId = @operationId
          ORDER BY createdAt ASC, id ASC
        `);

      const bookingId = bookingResult.recordset[0]?.id || null;
      const costs = await this.copyQuotedCosts(transaction, operationId, quotationId, userId, bookingId);
      await transaction.commit();
      return costs;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  static async getCosts(operationId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('operationId', sql.Int, operationId)
      .query(`
        SELECT *
        FROM dbo.OperationCosts
        WHERE operationId = @operationId
        ORDER BY id ASC
      `);
    return result.recordset;
  }

  static async getOperationCosts(operationId) {
    const costs = await this.getCosts(operationId);
    return costs.filter((cost) => cost.costScope !== 'BOOKING');
  }

  static async getBookingCosts(operationId, bookingId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('operationId', sql.Int, operationId)
      .input('bookingId', sql.Int, bookingId)
      .query(`
        SELECT *
        FROM dbo.OperationCosts
        WHERE operationId = @operationId
          AND bookingId = @bookingId
          AND costScope = N'BOOKING'
        ORDER BY id ASC
      `);
    return result.recordset;
  }

  static async createCost(operationId, data, userId = null) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const result = await new sql.Request(transaction)
        .input('operationId', sql.Int, operationId)
        .input('bookingId', sql.Int, data.costScope === 'BOOKING' ? data.bookingId : null)
        .input('costScope', sql.NVarChar(20), data.costScope || 'OPERATION')
        .input('chargeSection', sql.NVarChar(80), data.chargeSection || null)
        .input('concept', sql.NVarChar(180), data.concept)
        .input('provider', sql.NVarChar(180), data.provider || null)
        .input('estimatedCost', sql.Decimal(18, 2), data.estimatedCost ?? 0)
        .input('realCost', sql.Decimal(18, 2), data.realCost ?? 0)
        .input('saleAmount', sql.Decimal(18, 2), data.saleAmount ?? 0)
        .input('currency', sql.NVarChar(3), data.currency || 'USD')
        .input('documentNumber', sql.NVarChar(80), data.documentNumber || null)
        .input('observations', sql.NVarChar(500), data.observations || null)
        .input('status', sql.NVarChar(20), data.status || 'PENDING')
        .input('costResponsibility', sql.NVarChar(20), data.costResponsibility || 'COMPANY')
        .input('customerPaymentStatus', sql.NVarChar(20), data.customerPaymentStatus || 'UNPAID')
        .input('createdBy', sql.Int, userId)
        .query(`
          DECLARE @Changed TABLE (
            id INT,
            operationId INT,
            quotationChargeId INT NULL,
            concept NVARCHAR(200),
            provider NVARCHAR(180) NULL,
            estimatedCost DECIMAL(18, 2),
            realCost DECIMAL(18, 2),
            saleAmount DECIMAL(18, 2),
            estimatedProfit DECIMAL(19, 2),
            realProfit DECIMAL(19, 2),
            currency NVARCHAR(3),
            documentNumber NVARCHAR(80) NULL,
            observations NVARCHAR(500) NULL,
            status NVARCHAR(20),
            createdBy INT NULL,
            updatedBy INT NULL,
            createdAt DATETIME2,
            updatedAt DATETIME2,
            bookingId INT NULL,
            chargeSection NVARCHAR(50) NULL,
            costScope NVARCHAR(20)
          );

          IF @costScope = N'BOOKING'
             AND NOT EXISTS (
               SELECT 1
               FROM dbo.OperationBooking
               WHERE id = @bookingId
                 AND operationId = @operationId
             )
          BEGIN
            THROW 50001, 'El booking no pertenece a la operacion', 1;
          END;

          INSERT INTO dbo.OperationCosts
            (operationId, bookingId, costScope, chargeSection, concept, provider, estimatedCost, realCost, saleAmount, currency, documentNumber, observations, status, costResponsibility, customerPaymentStatus, createdBy)
          OUTPUT INSERTED.id, INSERTED.operationId, INSERTED.quotationChargeId, INSERTED.concept, INSERTED.provider,
                 INSERTED.estimatedCost, INSERTED.realCost, INSERTED.saleAmount, INSERTED.estimatedProfit, INSERTED.realProfit,
                 INSERTED.currency, INSERTED.documentNumber, INSERTED.observations, INSERTED.status, INSERTED.createdBy,
                 INSERTED.updatedBy, INSERTED.createdAt, INSERTED.updatedAt, INSERTED.bookingId, INSERTED.chargeSection, INSERTED.costScope
          INTO @Changed
          VALUES
            (@operationId, CASE WHEN @costScope = N'BOOKING' THEN @bookingId ELSE NULL END, @costScope, @chargeSection, @concept, @provider, @estimatedCost, @realCost, @saleAmount, @currency, @documentNumber, @observations, @status, @costResponsibility, @customerPaymentStatus, @createdBy);

          SELECT *
          FROM @Changed;
        `);

      await transaction.commit();
      return result.recordset[0] || null;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  static async updateCost(costId, data, userId = null) {
    const pool = await poolPromise;
    const transaction = new sql.Transaction(pool);
    await transaction.begin();

    try {
      const result = await new sql.Request(transaction)
        .input('costId', sql.Int, costId)
        .input('bookingId', sql.Int, data.costScope === 'BOOKING' ? data.bookingId : null)
        .input('costScope', sql.NVarChar(20), data.costScope || 'OPERATION')
        .input('concept', sql.NVarChar(180), data.concept)
        .input('provider', sql.NVarChar(180), data.provider || null)
        .input('estimatedCost', sql.Decimal(18, 2), data.estimatedCost ?? 0)
        .input('realCost', sql.Decimal(18, 2), data.realCost ?? 0)
        .input('saleAmount', sql.Decimal(18, 2), data.saleAmount ?? 0)
        .input('currency', sql.NVarChar(3), data.currency || 'USD')
        .input('documentNumber', sql.NVarChar(80), data.documentNumber || null)
        .input('observations', sql.NVarChar(500), data.observations || null)
        .input('status', sql.NVarChar(20), data.status || 'PENDING')
        .input('costResponsibility', sql.NVarChar(20), data.costResponsibility || 'COMPANY')
        .input('customerPaymentStatus', sql.NVarChar(20), data.customerPaymentStatus || 'UNPAID')
        .input('updatedBy', sql.Int, userId)
        .query(`
          DECLARE @Changed TABLE (
            id INT,
            operationId INT,
            quotationChargeId INT NULL,
            concept NVARCHAR(200),
            provider NVARCHAR(180) NULL,
            estimatedCost DECIMAL(18, 2),
            realCost DECIMAL(18, 2),
            saleAmount DECIMAL(18, 2),
            estimatedProfit DECIMAL(19, 2),
            realProfit DECIMAL(19, 2),
            currency NVARCHAR(3),
            documentNumber NVARCHAR(80) NULL,
            observations NVARCHAR(500) NULL,
            status NVARCHAR(20),
            createdBy INT NULL,
            updatedBy INT NULL,
            createdAt DATETIME2,
            updatedAt DATETIME2,
            bookingId INT NULL,
            chargeSection NVARCHAR(50) NULL,
            costScope NVARCHAR(20)
          );

          DECLARE @operationId INT;

          SELECT @operationId = operationId
          FROM dbo.OperationCosts
          WHERE id = @costId;

          IF @operationId IS NULL
          BEGIN
            THROW 50002, 'Costo no encontrado', 1;
          END;

          IF @costScope = N'BOOKING'
             AND NOT EXISTS (
               SELECT 1
               FROM dbo.OperationBooking
               WHERE id = @bookingId
                 AND operationId = @operationId
             )
          BEGIN
            THROW 50001, 'El booking no pertenece a la operacion', 1;
          END;

          UPDATE dbo.OperationCosts
          SET bookingId = CASE WHEN @costScope = N'BOOKING' THEN @bookingId ELSE NULL END,
              costScope = @costScope,
              concept = @concept,
              provider = @provider,
              estimatedCost = @estimatedCost,
              realCost = @realCost,
              saleAmount = @saleAmount,
              currency = @currency,
              documentNumber = @documentNumber,
              observations = @observations,
              status = @status,
              costResponsibility = @costResponsibility,
              customerPaymentStatus = @customerPaymentStatus,
              updatedBy = @updatedBy
          OUTPUT INSERTED.id, INSERTED.operationId, INSERTED.quotationChargeId, INSERTED.concept, INSERTED.provider,
                 INSERTED.estimatedCost, INSERTED.realCost, INSERTED.saleAmount, INSERTED.estimatedProfit, INSERTED.realProfit,
                 INSERTED.currency, INSERTED.documentNumber, INSERTED.observations, INSERTED.status, INSERTED.createdBy,
                 INSERTED.updatedBy, INSERTED.createdAt, INSERTED.updatedAt, INSERTED.bookingId, INSERTED.chargeSection, INSERTED.costScope
          INTO @Changed
          WHERE id = @costId

          SELECT *
          FROM @Changed;
        `);

      await transaction.commit();
      return result.recordset[0] || null;
    } catch (err) {
      await transaction.rollback();
      throw err;
    }
  }

  static async cancelCost(costId, userId = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('costId', sql.Int, costId)
      .input('updatedBy', sql.Int, userId)
      .query(`
        UPDATE dbo.OperationCosts
        SET status = N'CANCELLED',
            updatedBy = @updatedBy
        WHERE id = @costId;

        SELECT *
        FROM dbo.OperationCosts
        WHERE id = @costId;
      `);
    return result.recordset[0] || null;
  }

  static async getSummary(operationId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('operationId', sql.Int, operationId)
      .query(`
        DECLARE @customerId INT;
        DECLARE @creditEnabled BIT;
        DECLARE @creditLimit DECIMAL(18,2);
        DECLARE @customerUnpaidCostTotal DECIMAL(18,2);
        DECLARE @otherUsedCredit DECIMAL(18,2);
        DECLARE @availableCredit DECIMAL(18,2);

        SELECT
          @customerId = o.customerId,
          @creditEnabled = COALESCE(c.creditEnabled, 0),
          @creditLimit = COALESCE(c.creditLimit, 0)
        FROM dbo.Operations AS o
        INNER JOIN dbo.Customers AS c ON c.id = o.customerId
        WHERE o.id = @operationId;

        SELECT @customerUnpaidCostTotal = COALESCE(SUM(realCost), 0)
        FROM dbo.OperationCosts
        WHERE operationId = @operationId
          AND status <> N'CANCELLED'
          AND COALESCE(costResponsibility, N'COMPANY') = N'CLIENT'
          AND customerPaymentStatus <> N'PAID';

        SELECT @otherUsedCredit = COALESCE(SUM(CASE
          WHEN oc.status <> N'CANCELLED'
           AND COALESCE(oc.costResponsibility, N'COMPANY') = N'CLIENT'
           AND oc.customerPaymentStatus <> N'PAID'
          THEN oc.realCost ELSE 0 END), 0)
        FROM dbo.Operations AS o
        INNER JOIN dbo.OperationCosts AS oc ON oc.operationId = o.id
        WHERE o.customerId = @customerId
          AND o.id <> @operationId
          AND o.status <> N'CANCELLED';

        IF @otherUsedCredit > @creditLimit
          SET @otherUsedCredit = @creditLimit;

        SET @availableCredit = CASE
          WHEN @creditEnabled = 1 THEN
            CASE WHEN @creditLimit - @otherUsedCredit > 0 THEN @creditLimit - @otherUsedCredit ELSE 0 END
          ELSE 0
        END;

        SELECT
          COALESCE(SUM(CASE WHEN COALESCE(costResponsibility, N'COMPANY') = N'CLIENT' THEN 0 ELSE saleAmount END), 0) AS totalSale,
          COALESCE(SUM(CASE WHEN COALESCE(costResponsibility, N'COMPANY') = N'CLIENT' THEN 0 ELSE estimatedCost END), 0) AS totalEstimatedCost,
          COALESCE(SUM(CASE WHEN COALESCE(costResponsibility, N'COMPANY') = N'CLIENT' THEN 0 ELSE realCost END), 0) AS totalRealCost,
          COALESCE(SUM(CASE WHEN COALESCE(costResponsibility, N'COMPANY') = N'CLIENT' THEN 0 ELSE estimatedProfit END), 0) AS estimatedProfit,
          COALESCE(SUM(CASE WHEN COALESCE(costResponsibility, N'COMPANY') = N'CLIENT' THEN 0 ELSE realProfit END), 0) AS realProfit,
          COALESCE(SUM(CASE WHEN costScope = N'BOOKING' AND COALESCE(costResponsibility, N'COMPANY') <> N'CLIENT' THEN realCost ELSE 0 END), 0) AS bookingRealCostSubtotal,
          COALESCE(SUM(CASE WHEN costScope = N'OPERATION' AND COALESCE(costResponsibility, N'COMPANY') <> N'CLIENT' THEN realCost ELSE 0 END), 0) AS operationRealCostSubtotal,
          COALESCE(SUM(CASE WHEN COALESCE(costResponsibility, N'COMPANY') = N'CLIENT' AND customerPaymentStatus = N'PAID' THEN realCost ELSE 0 END), 0) AS customerPaidCostTotal,
          @customerUnpaidCostTotal AS customerUnpaidCostTotal,
          CASE WHEN @customerUnpaidCostTotal < @availableCredit THEN @customerUnpaidCostTotal ELSE @availableCredit END AS customerCreditApplied,
          CASE WHEN @customerUnpaidCostTotal - @availableCredit > 0 THEN @customerUnpaidCostTotal - @availableCredit ELSE 0 END AS customerPendingAfterCredit,
          @availableCredit AS customerAvailableCreditBeforeOperation,
          CASE
            WHEN @availableCredit - @customerUnpaidCostTotal > 0 THEN @availableCredit - @customerUnpaidCostTotal
            ELSE 0
          END AS customerAvailableCreditAfterOperation,
          CASE
            WHEN COALESCE(SUM(CASE WHEN COALESCE(costResponsibility, N'COMPANY') = N'CLIENT' THEN 0 ELSE saleAmount END), 0) = 0 THEN 0
            ELSE (COALESCE(SUM(CASE WHEN COALESCE(costResponsibility, N'COMPANY') = N'CLIENT' THEN 0 ELSE realProfit END), 0) / NULLIF(SUM(CASE WHEN COALESCE(costResponsibility, N'COMPANY') = N'CLIENT' THEN 0 ELSE saleAmount END), 0)) * 100
          END AS marginPercentage
        FROM dbo.OperationCosts
        WHERE operationId = @operationId
          AND status <> N'CANCELLED'
      `);
    return result.recordset[0];
  }

  static async getCommissions(operationId) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('operationId', sql.Int, operationId)
      .query(`
        SELECT cc.*, u.name AS commercialName
        FROM dbo.CommercialCommissions AS cc
        INNER JOIN dbo.Users AS u ON u.id = cc.commercialUserId
        WHERE cc.operationId = @operationId
        ORDER BY cc.calculatedAt DESC
      `);
    return result.recordset;
  }

  static async generateCommissionForOperation(transaction, operationId, userId = null) {
    const result = await new sql.Request(transaction)
      .input('operationId', sql.Int, operationId)
      .input('createdBy', sql.Int, userId)
      .query(`
        DECLARE @commercialUserId INT;
        DECLARE @percentage DECIMAL(9,4);
        DECLARE @baseProfit DECIMAL(18,2);
        DECLARE @commissionAmount DECIMAL(18,2);

        SELECT
          @commercialUserId = o.commercialUserId,
          @percentage = COALESCE(u.commissionPercentage, 0)
        FROM dbo.Operations AS o
        LEFT JOIN dbo.Users AS u ON u.id = o.commercialUserId
        WHERE o.id = @operationId;

        SELECT @baseProfit = COALESCE(SUM(realProfit), 0)
        FROM dbo.OperationCosts
        WHERE operationId = @operationId
          AND status <> N'CANCELLED'
          AND COALESCE(costResponsibility, N'COMPANY') <> N'CLIENT';

        SET @commissionAmount = ROUND(@baseProfit * (@percentage / 100), 2);

        IF @commercialUserId IS NOT NULL
        BEGIN
          MERGE dbo.CommercialCommissions AS target
          USING (
            SELECT @operationId AS operationId,
                   @commercialUserId AS commercialUserId,
                   @percentage AS commissionPercentage,
                   @baseProfit AS baseProfit,
                   @commissionAmount AS commissionAmount
          ) AS source
          ON target.operationId = source.operationId
          WHEN MATCHED AND target.status NOT IN (N'PAID', N'CANCELLED') THEN
            UPDATE SET commercialUserId = source.commercialUserId,
                       commissionPercentage = source.commissionPercentage,
                       baseProfit = source.baseProfit,
                       commissionAmount = source.commissionAmount,
                       status = N'PENDING',
                       calculatedAt = SYSUTCDATETIME(),
                       updatedBy = @createdBy
          WHEN NOT MATCHED THEN
            INSERT (operationId, commercialUserId, commissionPercentage, baseProfit, commissionAmount, status, createdBy)
            VALUES (source.operationId, source.commercialUserId, source.commissionPercentage, source.baseProfit, source.commissionAmount, N'PENDING', @createdBy);
        END;

        SELECT cc.*, u.name AS commercialName
        FROM dbo.CommercialCommissions AS cc
        INNER JOIN dbo.Users AS u ON u.id = cc.commercialUserId
        WHERE cc.operationId = @operationId;
      `);
    return result.recordset[0] || null;
  }

  static async updateCommissionStatus(commissionId, status, userId = null) {
    const pool = await poolPromise;
    const result = await pool.request()
      .input('commissionId', sql.Int, commissionId)
      .input('status', sql.NVarChar(20), status)
      .input('updatedBy', sql.Int, userId)
      .query(`
        UPDATE dbo.CommercialCommissions
        SET status = @status,
            paidAt = CASE WHEN @status = N'PAID' THEN COALESCE(paidAt, SYSUTCDATETIME()) ELSE paidAt END,
            updatedBy = @updatedBy
        OUTPUT INSERTED.*
        WHERE id = @commissionId
      `);
    return result.recordset[0] || null;
  }

  static async getDashboard() {
    const pool = await poolPromise;
    const [operationProfit, customerProfit, commercialProfit, commissionTotals] = await Promise.all([
      pool.request().query(`
        SELECT TOP 10
          o.id,
          o.operationNumber,
          c.companyName AS customerName,
          COALESCE(SUM(CASE WHEN COALESCE(oc.costResponsibility, N'COMPANY') = N'CLIENT' THEN 0 ELSE oc.realProfit END), 0) AS realProfit,
          COALESCE(SUM(CASE WHEN COALESCE(oc.costResponsibility, N'COMPANY') = N'CLIENT' THEN 0 ELSE oc.estimatedProfit END), 0) AS estimatedProfit
        FROM dbo.Operations AS o
        INNER JOIN dbo.Customers AS c ON c.id = o.customerId
        LEFT JOIN dbo.OperationCosts AS oc ON oc.operationId = o.id AND oc.status <> N'CANCELLED'
        GROUP BY o.id, o.operationNumber, c.companyName
        ORDER BY realProfit DESC
      `),
      pool.request().query(`
        SELECT TOP 10
          c.id,
          c.companyName,
          COALESCE(SUM(CASE WHEN COALESCE(oc.costResponsibility, N'COMPANY') = N'CLIENT' THEN 0 ELSE oc.realProfit END), 0) AS realProfit
        FROM dbo.Customers AS c
        INNER JOIN dbo.Operations AS o ON o.customerId = c.id
        LEFT JOIN dbo.OperationCosts AS oc ON oc.operationId = o.id AND oc.status <> N'CANCELLED'
        GROUP BY c.id, c.companyName
        ORDER BY realProfit DESC
      `),
      pool.request().query(`
        SELECT TOP 10
          u.id,
          u.name AS commercialName,
          COALESCE(SUM(costs.realProfit), 0) AS realProfit,
          COALESCE(SUM(commissions.commissionAmount), 0) AS commissionAmount
        FROM dbo.Users AS u
        INNER JOIN dbo.Operations AS o ON o.commercialUserId = u.id
        LEFT JOIN (
          SELECT operationId, SUM(realProfit) AS realProfit
          FROM dbo.OperationCosts
          WHERE status <> N'CANCELLED'
            AND COALESCE(costResponsibility, N'COMPANY') <> N'CLIENT'
          GROUP BY operationId
        ) AS costs ON costs.operationId = o.id
        LEFT JOIN (
          SELECT operationId, SUM(commissionAmount) AS commissionAmount
          FROM dbo.CommercialCommissions
          GROUP BY operationId
        ) AS commissions ON commissions.operationId = o.id
        GROUP BY u.id, u.name
        ORDER BY realProfit DESC
      `),
      pool.request().query(`
        SELECT
          COALESCE(SUM(CASE WHEN status IN (N'PENDING', N'APPROVED') THEN commissionAmount ELSE 0 END), 0) AS pendingCommissions,
          COALESCE(SUM(CASE WHEN status = N'PAID' THEN commissionAmount ELSE 0 END), 0) AS paidCommissions
        FROM dbo.CommercialCommissions
      `),
    ]);

    return {
      operationProfit: operationProfit.recordset,
      customerProfit: customerProfit.recordset,
      commercialProfit: commercialProfit.recordset,
      commissions: commissionTotals.recordset[0],
    };
  }
}

module.exports = ProfitabilityModel;
