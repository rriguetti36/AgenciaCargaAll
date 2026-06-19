SET ANSI_NULLS ON;
GO

SET QUOTED_IDENTIFIER ON;
GO

USE BD_AGEN_CARGA;
GO

IF COL_LENGTH(N'dbo.Users', N'commissionPercentage') IS NULL
BEGIN
    ALTER TABLE dbo.Users
        ADD commissionPercentage DECIMAL(9,4) NOT NULL
            CONSTRAINT DF_Users_commissionPercentage DEFAULT (0);
END
GO

IF OBJECT_ID(N'dbo.OperationCosts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OperationCosts (
        id INT IDENTITY(1,1) NOT NULL,
        operationId INT NOT NULL,
        bookingId INT NULL,
        quotationChargeId INT NULL,
        costScope NVARCHAR(20) NOT NULL
            CONSTRAINT DF_OperationCosts_costScope DEFAULT (N'OPERATION'),
        chargeSection NVARCHAR(50) NULL,
        concept NVARCHAR(200) NOT NULL,
        provider NVARCHAR(180) NULL,
        estimatedCost DECIMAL(18,2) NOT NULL
            CONSTRAINT DF_OperationCosts_estimatedCost DEFAULT (0),
        realCost DECIMAL(18,2) NOT NULL
            CONSTRAINT DF_OperationCosts_realCost DEFAULT (0),
        saleAmount DECIMAL(18,2) NOT NULL
            CONSTRAINT DF_OperationCosts_saleAmount DEFAULT (0),
        estimatedProfit AS (saleAmount - estimatedCost) PERSISTED,
        realProfit AS (saleAmount - realCost) PERSISTED,
        currency NVARCHAR(3) NOT NULL
            CONSTRAINT DF_OperationCosts_currency DEFAULT (N'USD'),
        documentNumber NVARCHAR(80) NULL,
        observations NVARCHAR(500) NULL,
        status NVARCHAR(20) NOT NULL
            CONSTRAINT DF_OperationCosts_status DEFAULT (N'PENDING'),
        costResponsibility NVARCHAR(20) NOT NULL
            CONSTRAINT DF_OperationCosts_costResponsibility DEFAULT (N'COMPANY'),
        customerPaymentStatus NVARCHAR(20) NOT NULL
            CONSTRAINT DF_OperationCosts_customerPaymentStatus DEFAULT (N'UNPAID'),
        createdBy INT NULL,
        updatedBy INT NULL,
        createdAt DATETIME2(7) NOT NULL
            CONSTRAINT DF_OperationCosts_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt DATETIME2(7) NOT NULL
            CONSTRAINT DF_OperationCosts_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_OperationCosts PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_OperationCosts_Operations FOREIGN KEY (operationId) REFERENCES dbo.Operations(id) ON DELETE CASCADE,
        CONSTRAINT FK_OperationCosts_OperationBooking FOREIGN KEY (bookingId) REFERENCES dbo.OperationBooking(id),
        CONSTRAINT FK_OperationCosts_QuotationCharges FOREIGN KEY (quotationChargeId) REFERENCES dbo.QuotationCharges(id),
        CONSTRAINT FK_OperationCosts_CreatedBy FOREIGN KEY (createdBy) REFERENCES dbo.Users(id),
        CONSTRAINT FK_OperationCosts_UpdatedBy FOREIGN KEY (updatedBy) REFERENCES dbo.Users(id),
        CONSTRAINT CK_OperationCosts_status CHECK (status IN (N'PENDING', N'APPROVED', N'PAID', N'CANCELLED')),
        CONSTRAINT CK_OperationCosts_costResponsibility CHECK (costResponsibility IN (N'COMPANY', N'CLIENT')),
        CONSTRAINT CK_OperationCosts_customerPaymentStatus CHECK (customerPaymentStatus IN (N'UNPAID', N'PAID'))
    );
END
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

IF COL_LENGTH(N'dbo.OperationCosts', N'costResponsibility') IS NULL
BEGIN
    ALTER TABLE dbo.OperationCosts
        ADD costResponsibility NVARCHAR(20) NOT NULL
            CONSTRAINT DF_OperationCosts_costResponsibility DEFAULT (N'COMPANY');
END
GO

IF COL_LENGTH(N'dbo.OperationCosts', N'customerPaymentStatus') IS NULL
BEGIN
    ALTER TABLE dbo.OperationCosts
        ADD customerPaymentStatus NVARCHAR(20) NOT NULL
            CONSTRAINT DF_OperationCosts_customerPaymentStatus DEFAULT (N'UNPAID');
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.OperationCosts') AND name = N'CK_OperationCosts_costResponsibility')
BEGIN
    ALTER TABLE dbo.OperationCosts
        ADD CONSTRAINT CK_OperationCosts_costResponsibility CHECK (costResponsibility IN (N'COMPANY', N'CLIENT'));
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.OperationCosts') AND name = N'CK_OperationCosts_customerPaymentStatus')
BEGIN
    ALTER TABLE dbo.OperationCosts
        ADD CONSTRAINT CK_OperationCosts_customerPaymentStatus CHECK (customerPaymentStatus IN (N'UNPAID', N'PAID'));
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.OperationCosts') AND name = N'IX_OperationCosts_operationId')
BEGIN
    CREATE INDEX IX_OperationCosts_operationId ON dbo.OperationCosts (operationId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.OperationCosts') AND name = N'IX_OperationCosts_status')
BEGIN
    CREATE INDEX IX_OperationCosts_status ON dbo.OperationCosts (status);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.OperationCosts') AND name = N'IX_OperationCosts_bookingId')
BEGIN
    CREATE INDEX IX_OperationCosts_bookingId ON dbo.OperationCosts (bookingId, costScope);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.OperationCosts') AND name = N'UX_OperationCosts_quotationChargeId')
BEGIN
    CREATE UNIQUE INDEX UX_OperationCosts_quotationChargeId
        ON dbo.OperationCosts (quotationChargeId)
        WHERE quotationChargeId IS NOT NULL;
END
GO

CREATE OR ALTER TRIGGER dbo.TR_OperationCosts_SetUpdatedAt
ON dbo.OperationCosts
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF (ROWCOUNT_BIG() = 0) OR UPDATE(updatedAt) RETURN;

    UPDATE target
    SET updatedAt = SYSUTCDATETIME()
    FROM dbo.OperationCosts AS target
    INNER JOIN inserted AS source ON source.id = target.id;
END;
GO

IF OBJECT_ID(N'dbo.CommercialCommissions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CommercialCommissions (
        id INT IDENTITY(1,1) NOT NULL,
        operationId INT NOT NULL,
        commercialUserId INT NOT NULL,
        commissionPercentage DECIMAL(9,4) NOT NULL
            CONSTRAINT DF_CommercialCommissions_commissionPercentage DEFAULT (0),
        baseProfit DECIMAL(18,2) NOT NULL
            CONSTRAINT DF_CommercialCommissions_baseProfit DEFAULT (0),
        commissionAmount DECIMAL(18,2) NOT NULL
            CONSTRAINT DF_CommercialCommissions_commissionAmount DEFAULT (0),
        status NVARCHAR(20) NOT NULL
            CONSTRAINT DF_CommercialCommissions_status DEFAULT (N'PENDING'),
        calculatedAt DATETIME2(7) NOT NULL
            CONSTRAINT DF_CommercialCommissions_calculatedAt DEFAULT (SYSUTCDATETIME()),
        paidAt DATETIME2(7) NULL,
        createdBy INT NULL,
        updatedBy INT NULL,
        createdAt DATETIME2(7) NOT NULL
            CONSTRAINT DF_CommercialCommissions_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt DATETIME2(7) NOT NULL
            CONSTRAINT DF_CommercialCommissions_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_CommercialCommissions PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UX_CommercialCommissions_operationId UNIQUE (operationId),
        CONSTRAINT FK_CommercialCommissions_Operations FOREIGN KEY (operationId) REFERENCES dbo.Operations(id) ON DELETE CASCADE,
        CONSTRAINT FK_CommercialCommissions_CommercialUser FOREIGN KEY (commercialUserId) REFERENCES dbo.Users(id),
        CONSTRAINT FK_CommercialCommissions_CreatedBy FOREIGN KEY (createdBy) REFERENCES dbo.Users(id),
        CONSTRAINT FK_CommercialCommissions_UpdatedBy FOREIGN KEY (updatedBy) REFERENCES dbo.Users(id),
        CONSTRAINT CK_CommercialCommissions_status CHECK (status IN (N'PENDING', N'APPROVED', N'PAID', N'CANCELLED'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.CommercialCommissions') AND name = N'IX_CommercialCommissions_commercialUserId')
BEGIN
    CREATE INDEX IX_CommercialCommissions_commercialUserId ON dbo.CommercialCommissions (commercialUserId);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.CommercialCommissions') AND name = N'IX_CommercialCommissions_status')
BEGIN
    CREATE INDEX IX_CommercialCommissions_status ON dbo.CommercialCommissions (status);
END
GO

CREATE OR ALTER TRIGGER dbo.TR_CommercialCommissions_SetUpdatedAt
ON dbo.CommercialCommissions
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF (ROWCOUNT_BIG() = 0) OR UPDATE(updatedAt) RETURN;

    UPDATE target
    SET updatedAt = SYSUTCDATETIME()
    FROM dbo.CommercialCommissions AS target
    INNER JOIN inserted AS source ON source.id = target.id;
END;
GO

INSERT INTO dbo.OperationCosts
  (operationId, bookingId, quotationChargeId, costScope, chargeSection, concept, estimatedCost, realCost, saleAmount, currency, status)
SELECT
  o.id,
  CASE
    WHEN COALESCE(qc.section, qc.chargeType) IN (N'gastos_origen', N'gastos_destino', N'origen', N'destino') THEN firstBooking.bookingId
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
  N'PENDING'
FROM dbo.Operations AS o
INNER JOIN dbo.Quotations AS q ON q.id = o.quotationId
INNER JOIN dbo.QuotationCharges AS qc ON qc.quotationId = q.id
OUTER APPLY (
    SELECT TOP 1 ob.id AS bookingId
    FROM dbo.OperationBooking AS ob
    WHERE ob.operationId = o.id
    ORDER BY ob.id ASC
) AS firstBooking
WHERE NOT EXISTS (
    SELECT 1
    FROM dbo.OperationCosts AS oc
    WHERE oc.quotationChargeId = qc.id
);
GO
