USE BD_AGEN_CARGA;
GO

SET ANSI_NULLS ON;
GO

SET QUOTED_IDENTIFIER ON;
GO

IF COL_LENGTH(N'dbo.OperationCosts', N'bookingId') IS NULL
BEGIN
    ALTER TABLE dbo.OperationCosts ADD bookingId INT NULL;
END
GO

IF COL_LENGTH(N'dbo.OperationCosts', N'costScope') IS NULL
BEGIN
    ALTER TABLE dbo.OperationCosts
        ADD costScope NVARCHAR(20) NOT NULL
            CONSTRAINT DF_OperationCosts_costScope DEFAULT (N'OPERATION');
END
GO

IF COL_LENGTH(N'dbo.OperationCosts', N'chargeSection') IS NULL
BEGIN
    ALTER TABLE dbo.OperationCosts ADD chargeSection NVARCHAR(50) NULL;
END
GO

IF COL_LENGTH(N'dbo.OperationDocuments', N'bookingId') IS NULL
BEGIN
    ALTER TABLE dbo.OperationDocuments ADD bookingId INT NULL;
END
GO

IF COL_LENGTH(N'dbo.OperationCustoms', N'bookingId') IS NULL
BEGIN
    ALTER TABLE dbo.OperationCustoms ADD bookingId INT NULL;
END
GO

IF COL_LENGTH(N'dbo.OperationLocalTransport', N'bookingId') IS NULL
BEGIN
    ALTER TABLE dbo.OperationLocalTransport ADD bookingId INT NULL;
END
GO

IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.OperationCustoms') AND name = N'UX_OperationCustoms_operationId')
BEGIN
    ALTER TABLE dbo.OperationCustoms DROP CONSTRAINT UX_OperationCustoms_operationId;
END
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.OperationCustoms') AND name = N'UX_OperationCustoms_operationId')
BEGIN
    DROP INDEX UX_OperationCustoms_operationId ON dbo.OperationCustoms;
END
GO

IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.OperationLocalTransport') AND name = N'UX_OperationLocalTransport_operationId')
BEGIN
    ALTER TABLE dbo.OperationLocalTransport DROP CONSTRAINT UX_OperationLocalTransport_operationId;
END
GO

IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.OperationLocalTransport') AND name = N'UX_OperationLocalTransport_operationId')
BEGIN
    DROP INDEX UX_OperationLocalTransport_operationId ON dbo.OperationLocalTransport;
END
GO

;WITH firstBooking AS (
    SELECT operationId, MIN(id) AS bookingId
    FROM dbo.OperationBooking
    GROUP BY operationId
)
UPDATE oc
SET
    chargeSection = COALESCE(qc.section, qc.chargeType, oc.chargeSection),
    costScope = CASE
        WHEN COALESCE(qc.section, qc.chargeType, oc.chargeSection) IN (N'gastos_origen', N'gastos_destino', N'origen', N'destino') THEN N'BOOKING'
        ELSE N'OPERATION'
    END,
    bookingId = CASE
        WHEN COALESCE(qc.section, qc.chargeType, oc.chargeSection) IN (N'gastos_origen', N'gastos_destino', N'origen', N'destino') THEN COALESCE(oc.bookingId, fb.bookingId)
        ELSE NULL
    END
FROM dbo.OperationCosts AS oc
LEFT JOIN dbo.QuotationCharges AS qc ON qc.id = oc.quotationChargeId
LEFT JOIN firstBooking AS fb ON fb.operationId = oc.operationId;
GO

;WITH firstBooking AS (
    SELECT operationId, MIN(id) AS bookingId
    FROM dbo.OperationBooking
    GROUP BY operationId
)
UPDATE target
SET bookingId = COALESCE(target.bookingId, firstBooking.bookingId)
FROM dbo.OperationDocuments AS target
INNER JOIN firstBooking ON firstBooking.operationId = target.operationId
WHERE target.bookingId IS NULL;
GO

;WITH firstBooking AS (
    SELECT operationId, MIN(id) AS bookingId
    FROM dbo.OperationBooking
    GROUP BY operationId
)
UPDATE target
SET bookingId = COALESCE(target.bookingId, firstBooking.bookingId)
FROM dbo.OperationCustoms AS target
INNER JOIN firstBooking ON firstBooking.operationId = target.operationId
WHERE target.bookingId IS NULL;
GO

;WITH firstBooking AS (
    SELECT operationId, MIN(id) AS bookingId
    FROM dbo.OperationBooking
    GROUP BY operationId
)
UPDATE target
SET bookingId = COALESCE(target.bookingId, firstBooking.bookingId)
FROM dbo.OperationLocalTransport AS target
INNER JOIN firstBooking ON firstBooking.operationId = target.operationId
WHERE target.bookingId IS NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_OperationCosts_OperationBooking')
BEGIN
    ALTER TABLE dbo.OperationCosts
        ADD CONSTRAINT FK_OperationCosts_OperationBooking FOREIGN KEY (bookingId) REFERENCES dbo.OperationBooking(id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_OperationDocuments_OperationBooking')
BEGIN
    ALTER TABLE dbo.OperationDocuments
        ADD CONSTRAINT FK_OperationDocuments_OperationBooking FOREIGN KEY (bookingId) REFERENCES dbo.OperationBooking(id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_OperationCustoms_OperationBooking')
BEGIN
    ALTER TABLE dbo.OperationCustoms
        ADD CONSTRAINT FK_OperationCustoms_OperationBooking FOREIGN KEY (bookingId) REFERENCES dbo.OperationBooking(id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_OperationLocalTransport_OperationBooking')
BEGIN
    ALTER TABLE dbo.OperationLocalTransport
        ADD CONSTRAINT FK_OperationLocalTransport_OperationBooking FOREIGN KEY (bookingId) REFERENCES dbo.OperationBooking(id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.OperationCosts') AND name = N'IX_OperationCosts_bookingId')
BEGIN
    CREATE INDEX IX_OperationCosts_bookingId ON dbo.OperationCosts (bookingId, costScope);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.OperationCustoms') AND name = N'UX_OperationCustoms_operation_booking')
BEGIN
    CREATE UNIQUE INDEX UX_OperationCustoms_operation_booking
        ON dbo.OperationCustoms (operationId, bookingId)
        WHERE bookingId IS NOT NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.OperationLocalTransport') AND name = N'UX_OperationLocalTransport_operation_booking')
BEGIN
    CREATE UNIQUE INDEX UX_OperationLocalTransport_operation_booking
        ON dbo.OperationLocalTransport (operationId, bookingId)
        WHERE bookingId IS NOT NULL;
END
GO
