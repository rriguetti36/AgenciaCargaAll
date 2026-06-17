SET ANSI_NULLS ON;
GO

SET QUOTED_IDENTIFIER ON;
GO

USE BD_AGEN_CARGA;
GO

IF OBJECT_ID(N'dbo.Sales', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Sales (
        id INT IDENTITY(1,1) NOT NULL,
        operationId INT NOT NULL,
        customerId INT NOT NULL,
        saleNumber NVARCHAR(30) NOT NULL,
        saleDate DATE NOT NULL CONSTRAINT DF_Sales_saleDate DEFAULT (CONVERT(date, SYSUTCDATETIME())),
        currency NVARCHAR(3) NOT NULL CONSTRAINT DF_Sales_currency DEFAULT (N'USD'),
        subtotal DECIMAL(18,2) NOT NULL CONSTRAINT DF_Sales_subtotal DEFAULT (0),
        total DECIMAL(18,2) NOT NULL CONSTRAINT DF_Sales_total DEFAULT (0),
        status NVARCHAR(20) NOT NULL CONSTRAINT DF_Sales_status DEFAULT (N'PENDING'),
        createdBy INT NULL,
        createdAt DATETIME2(7) NOT NULL CONSTRAINT DF_Sales_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt DATETIME2(7) NOT NULL CONSTRAINT DF_Sales_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Sales PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UX_Sales_operationId UNIQUE (operationId),
        CONSTRAINT UX_Sales_saleNumber UNIQUE (saleNumber),
        CONSTRAINT FK_Sales_Operations FOREIGN KEY (operationId) REFERENCES dbo.Operations(id),
        CONSTRAINT FK_Sales_Customers FOREIGN KEY (customerId) REFERENCES dbo.Customers(id),
        CONSTRAINT FK_Sales_Users FOREIGN KEY (createdBy) REFERENCES dbo.Users(id),
        CONSTRAINT CK_Sales_status CHECK (status IN (N'PENDING', N'ISSUED', N'CANCELLED'))
    );
END
GO

IF OBJECT_ID(N'dbo.SaleDocuments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.SaleDocuments (
        id INT IDENTITY(1,1) NOT NULL,
        saleId INT NOT NULL,
        documentType NVARCHAR(20) NOT NULL,
        documentNumber NVARCHAR(40) NOT NULL,
        issueDate DATETIME2(7) NOT NULL CONSTRAINT DF_SaleDocuments_issueDate DEFAULT (SYSUTCDATETIME()),
        status NVARCHAR(20) NOT NULL CONSTRAINT DF_SaleDocuments_status DEFAULT (N'ISSUED'),
        observations NVARCHAR(500) NULL,
        createdBy INT NULL,
        createdAt DATETIME2(7) NOT NULL CONSTRAINT DF_SaleDocuments_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt DATETIME2(7) NOT NULL CONSTRAINT DF_SaleDocuments_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_SaleDocuments PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UX_SaleDocuments_documentNumber UNIQUE (documentNumber),
        CONSTRAINT FK_SaleDocuments_Sales FOREIGN KEY (saleId) REFERENCES dbo.Sales(id) ON DELETE CASCADE,
        CONSTRAINT FK_SaleDocuments_Users FOREIGN KEY (createdBy) REFERENCES dbo.Users(id),
        CONSTRAINT CK_SaleDocuments_documentType CHECK (documentType IN (N'FACTURA', N'BOLETA')),
        CONSTRAINT CK_SaleDocuments_status CHECK (status IN (N'ISSUED', N'CANCELLED'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Sales') AND name = N'IX_Sales_status')
BEGIN
    CREATE INDEX IX_Sales_status ON dbo.Sales (status);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.SaleDocuments') AND name = N'IX_SaleDocuments_saleId')
BEGIN
    CREATE INDEX IX_SaleDocuments_saleId ON dbo.SaleDocuments (saleId);
END
GO

CREATE OR ALTER TRIGGER dbo.TR_Sales_SetUpdatedAt
ON dbo.Sales
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF (ROWCOUNT_BIG() = 0) OR UPDATE(updatedAt) RETURN;

    UPDATE target
    SET updatedAt = SYSUTCDATETIME()
    FROM dbo.Sales AS target
    INNER JOIN inserted AS source ON source.id = target.id;
END;
GO

CREATE OR ALTER TRIGGER dbo.TR_SaleDocuments_SetUpdatedAt
ON dbo.SaleDocuments
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF (ROWCOUNT_BIG() = 0) OR UPDATE(updatedAt) RETURN;

    UPDATE target
    SET updatedAt = SYSUTCDATETIME()
    FROM dbo.SaleDocuments AS target
    INNER JOIN inserted AS source ON source.id = target.id;
END;
GO
