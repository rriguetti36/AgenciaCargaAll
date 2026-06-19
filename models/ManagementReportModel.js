const { poolPromise, sql } = require('../config/db');

function parseDate(value) {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

class ManagementReportModel {
  static async getOverview(filters = {}) {
    const pool = await poolPromise;
    const fromDate = parseDate(filters.fromDate);
    const toDate = parseDate(filters.toDate);

    const request = pool.request()
      .input('fromDate', sql.DateTime2, fromDate)
      .input('toDate', sql.DateTime2, toDate);

    const [
      summary,
      operationsByStatus,
      operativeProductivity,
      commercialProductivity,
      profitabilityByCustomer,
      profitabilityByOperation,
    ] = await Promise.all([
      request.query(`
        WITH operationCostTotals AS (
          SELECT
            operationId,
            SUM(CASE WHEN COALESCE(costResponsibility, N'COMPANY') <> N'CLIENT' AND status <> N'CANCELLED' THEN saleAmount ELSE 0 END) AS totalSale,
            SUM(CASE WHEN COALESCE(costResponsibility, N'COMPANY') <> N'CLIENT' AND status <> N'CANCELLED' THEN realCost ELSE 0 END) AS totalRealCost,
            SUM(CASE WHEN COALESCE(costResponsibility, N'COMPANY') <> N'CLIENT' AND status <> N'CANCELLED' THEN realProfit ELSE 0 END) AS realProfit
          FROM dbo.OperationCosts
          GROUP BY operationId
        ),
        commissionTotals AS (
          SELECT
            operationId,
            SUM(CASE WHEN status IN (N'PENDING', N'APPROVED') THEN commissionAmount ELSE 0 END) AS pendingCommissions,
            SUM(CASE WHEN status = N'PAID' THEN commissionAmount ELSE 0 END) AS paidCommissions
          FROM dbo.CommercialCommissions
          GROUP BY operationId
        )
        SELECT
          COUNT(DISTINCT o.id) AS totalOperations,
          SUM(CASE WHEN o.status = N'CLOSED' THEN 1 ELSE 0 END) AS closedOperations,
          SUM(CASE WHEN o.status IN (N'CREATED', N'ASSIGNED', N'BOOKING', N'DOCS_PENDING', N'DOCS_COMPLETE', N'SHIPPED', N'IN_TRANSIT', N'ARRIVED', N'CUSTOMS', N'RELEASED', N'DELIVERY_SCHEDULED', N'DELIVERED', N'INVOICED') THEN 1 ELSE 0 END) AS activeOperations,
          SUM(CASE WHEN o.status = N'CANCELLED' THEN 1 ELSE 0 END) AS cancelledOperations,
          COUNT(DISTINCT q.id) AS totalQuotations,
          COUNT(DISTINCT CASE WHEN q.status = N'aceptada' THEN q.id END) AS acceptedQuotations,
          COALESCE(SUM(costs.totalSale), 0) AS totalSale,
          COALESCE(SUM(costs.totalRealCost), 0) AS totalRealCost,
          COALESCE(SUM(costs.realProfit), 0) AS realProfit,
          COALESCE(SUM(commissions.pendingCommissions), 0) AS pendingCommissions,
          COALESCE(SUM(commissions.paidCommissions), 0) AS paidCommissions
        FROM dbo.Operations AS o
        LEFT JOIN dbo.Quotations AS q ON q.id = o.quotationId
        LEFT JOIN operationCostTotals AS costs ON costs.operationId = o.id
        LEFT JOIN commissionTotals AS commissions ON commissions.operationId = o.id
        WHERE (@fromDate IS NULL OR o.createdAt >= @fromDate)
          AND (@toDate IS NULL OR o.createdAt < DATEADD(DAY, 1, @toDate))
      `),
      pool.request()
        .input('fromDate', sql.DateTime2, fromDate)
        .input('toDate', sql.DateTime2, toDate)
        .query(`
          SELECT
            o.status,
            COUNT(1) AS total
          FROM dbo.Operations AS o
          WHERE (@fromDate IS NULL OR o.createdAt >= @fromDate)
            AND (@toDate IS NULL OR o.createdAt < DATEADD(DAY, 1, @toDate))
          GROUP BY o.status
          ORDER BY total DESC, o.status ASC
        `),
      pool.request()
        .input('fromDate', sql.DateTime2, fromDate)
        .input('toDate', sql.DateTime2, toDate)
        .query(`
          SELECT TOP 10
            u.id,
            u.name AS operativeName,
            COUNT(o.id) AS totalOperations,
            SUM(CASE WHEN o.status = N'CLOSED' THEN 1 ELSE 0 END) AS closedOperations,
            SUM(CASE WHEN o.status NOT IN (N'CLOSED', N'CANCELLED') THEN 1 ELSE 0 END) AS activeOperations,
            AVG(CASE WHEN o.realDeliveryDate IS NOT NULL AND o.createdAt IS NOT NULL THEN DATEDIFF(DAY, o.createdAt, o.realDeliveryDate) END) AS avgDeliveryDays
          FROM dbo.Users AS u
          INNER JOIN dbo.Operations AS o ON o.operativeUserId = u.id
          WHERE (@fromDate IS NULL OR o.createdAt >= @fromDate)
            AND (@toDate IS NULL OR o.createdAt < DATEADD(DAY, 1, @toDate))
          GROUP BY u.id, u.name
          ORDER BY totalOperations DESC, closedOperations DESC
        `),
      pool.request()
        .input('fromDate', sql.DateTime2, fromDate)
        .input('toDate', sql.DateTime2, toDate)
        .query(`
          SELECT TOP 10
            u.id,
            u.name AS commercialName,
            COUNT(DISTINCT q.id) AS quotations,
            COUNT(DISTINCT CASE WHEN q.status = N'aceptada' THEN q.id END) AS acceptedQuotations,
            COUNT(DISTINCT o.id) AS operations,
            COALESCE(SUM(costs.realProfit), 0) AS realProfit,
            COALESCE(SUM(commissions.commissionAmount), 0) AS commissionAmount
          FROM dbo.Users AS u
          LEFT JOIN dbo.Quotations AS q
            ON q.createdBy = u.id
           AND (@fromDate IS NULL OR q.createdAt >= @fromDate)
           AND (@toDate IS NULL OR q.createdAt < DATEADD(DAY, 1, @toDate))
          LEFT JOIN dbo.Operations AS o
            ON o.commercialUserId = u.id
           AND (@fromDate IS NULL OR o.createdAt >= @fromDate)
           AND (@toDate IS NULL OR o.createdAt < DATEADD(DAY, 1, @toDate))
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
          WHERE u.role IN (N'asesor', N'customer_service', N'admin')
          GROUP BY u.id, u.name
          HAVING COUNT(DISTINCT q.id) > 0 OR COUNT(DISTINCT o.id) > 0
          ORDER BY realProfit DESC, operations DESC
        `),
      pool.request()
        .input('fromDate', sql.DateTime2, fromDate)
        .input('toDate', sql.DateTime2, toDate)
        .query(`
          SELECT TOP 10
            c.id,
            c.companyName,
            COUNT(DISTINCT o.id) AS operations,
            COALESCE(SUM(CASE WHEN COALESCE(oc.costResponsibility, N'COMPANY') <> N'CLIENT' AND oc.status <> N'CANCELLED' THEN oc.saleAmount ELSE 0 END), 0) AS totalSale,
            COALESCE(SUM(CASE WHEN COALESCE(oc.costResponsibility, N'COMPANY') <> N'CLIENT' AND oc.status <> N'CANCELLED' THEN oc.realProfit ELSE 0 END), 0) AS realProfit
          FROM dbo.Customers AS c
          INNER JOIN dbo.Operations AS o ON o.customerId = c.id
          LEFT JOIN dbo.OperationCosts AS oc ON oc.operationId = o.id
          WHERE (@fromDate IS NULL OR o.createdAt >= @fromDate)
            AND (@toDate IS NULL OR o.createdAt < DATEADD(DAY, 1, @toDate))
          GROUP BY c.id, c.companyName
          ORDER BY realProfit DESC, totalSale DESC
        `),
      pool.request()
        .input('fromDate', sql.DateTime2, fromDate)
        .input('toDate', sql.DateTime2, toDate)
        .query(`
          SELECT TOP 10
            o.id,
            o.operationNumber,
            c.companyName AS customerName,
            o.status,
            COALESCE(SUM(CASE WHEN COALESCE(oc.costResponsibility, N'COMPANY') <> N'CLIENT' AND oc.status <> N'CANCELLED' THEN oc.saleAmount ELSE 0 END), 0) AS totalSale,
            COALESCE(SUM(CASE WHEN COALESCE(oc.costResponsibility, N'COMPANY') <> N'CLIENT' AND oc.status <> N'CANCELLED' THEN oc.realCost ELSE 0 END), 0) AS totalRealCost,
            COALESCE(SUM(CASE WHEN COALESCE(oc.costResponsibility, N'COMPANY') <> N'CLIENT' AND oc.status <> N'CANCELLED' THEN oc.realProfit ELSE 0 END), 0) AS realProfit
          FROM dbo.Operations AS o
          INNER JOIN dbo.Customers AS c ON c.id = o.customerId
          LEFT JOIN dbo.OperationCosts AS oc ON oc.operationId = o.id
          WHERE (@fromDate IS NULL OR o.createdAt >= @fromDate)
            AND (@toDate IS NULL OR o.createdAt < DATEADD(DAY, 1, @toDate))
          GROUP BY o.id, o.operationNumber, c.companyName, o.status
          ORDER BY realProfit DESC, totalSale DESC
        `),
    ]);

    return {
      summary: summary.recordset[0] || {},
      operationsByStatus: operationsByStatus.recordset,
      operativeProductivity: operativeProductivity.recordset,
      commercialProductivity: commercialProductivity.recordset,
      profitabilityByCustomer: profitabilityByCustomer.recordset,
      profitabilityByOperation: profitabilityByOperation.recordset,
    };
  }
}

module.exports = ManagementReportModel;
