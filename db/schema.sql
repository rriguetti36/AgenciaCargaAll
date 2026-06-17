-- SQL Server database schema for ProyAgenciaCargaPer.
-- Run this script with an account allowed to create databases and tables.

SET ANSI_NULLS ON;
GO

SET QUOTED_IDENTIFIER ON;
GO

IF DB_ID(N'BD_AGEN_CARGA') IS NULL
BEGIN
    CREATE DATABASE BD_AGEN_CARGA;
END
GO

USE BD_AGEN_CARGA;
GO

IF OBJECT_ID(N'dbo.Companies', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Companies (
        id INT IDENTITY(1,1) NOT NULL,
        name NVARCHAR(150) NOT NULL,
        tradeName NVARCHAR(150) NULL,
        taxId NVARCHAR(30) NULL,
        databaseName SYSNAME NOT NULL,
        estado BIT NOT NULL
            CONSTRAINT DF_Companies_estado DEFAULT (1),
        createdAt DATETIME2(7) NOT NULL
            CONSTRAINT DF_Companies_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt DATETIME2(7) NOT NULL
            CONSTRAINT DF_Companies_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Companies PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UX_Companies_databaseName UNIQUE (databaseName)
    );
END
GO

IF COL_LENGTH(N'dbo.Companies', N'taxId') IS NOT NULL
   AND NOT EXISTS (
       SELECT 1
       FROM sys.indexes
       WHERE object_id = OBJECT_ID(N'dbo.Companies')
         AND name = N'UX_Companies_taxId'
   )
BEGIN
    CREATE UNIQUE INDEX UX_Companies_taxId
        ON dbo.Companies (taxId)
        WHERE taxId IS NOT NULL;
END
GO

CREATE OR ALTER TRIGGER dbo.TR_Companies_SetUpdatedAt
ON dbo.Companies
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF (ROWCOUNT_BIG() = 0) OR UPDATE(updatedAt)
    BEGIN
        RETURN;
    END;

    UPDATE companiesTable
    SET updatedAt = SYSUTCDATETIME()
    FROM dbo.Companies AS companiesTable
    INNER JOIN inserted AS updatedRows
        ON updatedRows.id = companiesTable.id;
END;
GO

IF OBJECT_ID(N'dbo.Users', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        id INT IDENTITY(1,1) NOT NULL,
        name NVARCHAR(100) NOT NULL,
        email NVARCHAR(150) NOT NULL,
        phone NVARCHAR(50) NULL,
        password NVARCHAR(255) NOT NULL,
        estado BIT NOT NULL
            CONSTRAINT DF_Users_estado DEFAULT (1),
        role NVARCHAR(20) NOT NULL
            CONSTRAINT DF_Users_role DEFAULT (N'user'),
        createdAt DATETIME2(7) NOT NULL
            CONSTRAINT DF_Users_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt DATETIME2(7) NOT NULL
            CONSTRAINT DF_Users_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Users PRIMARY KEY CLUSTERED (id),
        CONSTRAINT CK_Users_role CHECK (role IN (N'user', N'admin', N'customer_service', N'operativo', N'asesor', N'pricing'))
    );
END
GO

IF COL_LENGTH(N'dbo.Users', N'name') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD name NVARCHAR(100) NULL;
END
GO

UPDATE dbo.Users
SET name = N'Sin nombre'
WHERE name IS NULL;
GO

ALTER TABLE dbo.Users ALTER COLUMN name NVARCHAR(100) NOT NULL;
GO

IF COL_LENGTH(N'dbo.Users', N'email') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD email NVARCHAR(150) NULL;
END
GO

UPDATE dbo.Users
SET email = CONCAT(N'user+', id, N'@local.invalid')
WHERE email IS NULL;
GO

ALTER TABLE dbo.Users ALTER COLUMN email NVARCHAR(150) NOT NULL;
GO

IF COL_LENGTH(N'dbo.Users', N'phone') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD phone NVARCHAR(50) NULL;
END
GO

IF COL_LENGTH(N'dbo.Users', N'password') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD password NVARCHAR(255) NULL;
END
GO

UPDATE dbo.Users
SET password = N'change_password_required'
WHERE password IS NULL;
GO

ALTER TABLE dbo.Users ALTER COLUMN password NVARCHAR(255) NOT NULL;
GO

IF COL_LENGTH(N'dbo.Users', N'estado') IS NULL
BEGIN
    ALTER TABLE dbo.Users
        ADD estado BIT NOT NULL
            CONSTRAINT DF_Users_estado DEFAULT (1);
END
GO

IF COL_LENGTH(N'dbo.Users', N'role') IS NULL
BEGIN
    ALTER TABLE dbo.Users
        ADD role NVARCHAR(20) NOT NULL
            CONSTRAINT DF_Users_role DEFAULT (N'user');
END
GO

UPDATE dbo.Users
SET role = N'user'
WHERE role IS NULL;
GO

ALTER TABLE dbo.Users ALTER COLUMN role NVARCHAR(20) NOT NULL;
GO

IF COL_LENGTH(N'dbo.Users', N'createdAt') IS NULL
BEGIN
    ALTER TABLE dbo.Users
        ADD createdAt DATETIME2(7) NOT NULL
            CONSTRAINT DF_Users_createdAt DEFAULT (SYSUTCDATETIME());
END
GO

IF COL_LENGTH(N'dbo.Users', N'updatedAt') IS NULL
BEGIN
    ALTER TABLE dbo.Users
        ADD updatedAt DATETIME2(7) NOT NULL
            CONSTRAINT DF_Users_updatedAt DEFAULT (SYSUTCDATETIME());
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE parent_object_id = OBJECT_ID(N'dbo.Users')
      AND type = N'PK'
)
BEGIN
    ALTER TABLE dbo.Users
        ADD CONSTRAINT PK_Users PRIMARY KEY CLUSTERED (id);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes i
    INNER JOIN sys.index_columns ic
        ON ic.object_id = i.object_id
       AND ic.index_id = i.index_id
    INNER JOIN sys.columns c
        ON c.object_id = ic.object_id
       AND c.column_id = ic.column_id
    WHERE i.object_id = OBJECT_ID(N'dbo.Users')
      AND i.is_unique = 1
      AND c.name = N'email'
)
BEGIN
    CREATE UNIQUE INDEX UX_Users_email ON dbo.Users (email);
END
GO

IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID(N'dbo.Users')
      AND name = N'CK_Users_role'
)
BEGIN
    ALTER TABLE dbo.Users DROP CONSTRAINT CK_Users_role;
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID(N'dbo.Users')
      AND name = N'CK_Users_role'
)
BEGIN
    ALTER TABLE dbo.Users
        ADD CONSTRAINT CK_Users_role CHECK (role IN (N'user', N'admin', N'customer_service', N'operativo', N'asesor', N'pricing'));
END
GO

CREATE OR ALTER TRIGGER dbo.TR_Users_SetUpdatedAt
ON dbo.Users
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF (ROWCOUNT_BIG() = 0) OR UPDATE(updatedAt)
    BEGIN
        RETURN;
    END;

    UPDATE usersTable
    SET updatedAt = SYSUTCDATETIME()
    FROM dbo.Users AS usersTable
    INNER JOIN inserted AS updatedRows
        ON updatedRows.id = usersTable.id;
END;
GO

IF OBJECT_ID(N'dbo.Roles', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Roles (
        id INT IDENTITY(1,1) NOT NULL,
        name NVARCHAR(50) NOT NULL,
        description NVARCHAR(200) NULL,
        CONSTRAINT PK_Roles PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UX_Roles_name UNIQUE (name)
    );
END
GO

IF OBJECT_ID(N'dbo.Permissions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Permissions (
        id INT IDENTITY(1,1) NOT NULL,
        code NVARCHAR(80) NOT NULL,
        description NVARCHAR(200) NULL,
        CONSTRAINT PK_Permissions PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UX_Permissions_code UNIQUE (code)
    );
END
GO

IF OBJECT_ID(N'dbo.RolePermissions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RolePermissions (
        roleId INT NOT NULL,
        permissionId INT NOT NULL,
        CONSTRAINT PK_RolePermissions PRIMARY KEY CLUSTERED (roleId, permissionId),
        CONSTRAINT FK_RolePermissions_Roles FOREIGN KEY (roleId) REFERENCES dbo.Roles(id),
        CONSTRAINT FK_RolePermissions_Permissions FOREIGN KEY (permissionId) REFERENCES dbo.Permissions(id)
    );
END
GO

MERGE dbo.Roles AS target
USING (VALUES
    (N'admin', N'Administrador del sistema'),
    (N'user', N'Usuario operativo'),
    (N'customer_service', N'Customer service'),
    (N'operativo', N'Operativo'),
    (N'asesor', N'Asesor comercial'),
    (N'pricing', N'Pricing')
) AS source (name, description)
ON target.name = source.name
WHEN NOT MATCHED THEN
    INSERT (name, description) VALUES (source.name, source.description);
GO

MERGE dbo.Permissions AS target
USING (VALUES
    (N'security.manage', N'Gestionar usuarios y permisos'),
    (N'customers.manage', N'Gestionar clientes y contactos'),
    (N'quotations.manage', N'Gestionar cotizaciones'),
    (N'operations.manage', N'Gestionar operaciones'),
    (N'tracking.manage', N'Gestionar tracking'),
    (N'documents.manage', N'Gestionar documentos'),
    (N'finance.manage', N'Gestionar finanzas')
) AS source (code, description)
ON target.code = source.code
WHEN NOT MATCHED THEN
    INSERT (code, description) VALUES (source.code, source.description);
GO

INSERT INTO dbo.RolePermissions (roleId, permissionId)
SELECT r.id, p.id
FROM dbo.Roles AS r
CROSS JOIN dbo.Permissions AS p
WHERE r.name = N'admin'
  AND NOT EXISTS (
      SELECT 1
      FROM dbo.RolePermissions AS rp
      WHERE rp.roleId = r.id
        AND rp.permissionId = p.id
  );
GO

IF OBJECT_ID(N'dbo.Customers', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Customers (
        id INT IDENTITY(1,1) NOT NULL,
        companyName NVARCHAR(180) NOT NULL,
        tradeName NVARCHAR(180) NULL,
        taxId NVARCHAR(30) NULL,
        fiscalAddress NVARCHAR(300) NULL,
        email NVARCHAR(150) NULL,
        phone NVARCHAR(50) NULL,
        estado BIT NOT NULL
            CONSTRAINT DF_Customers_estado DEFAULT (1),
        createdAt DATETIME2(7) NOT NULL
            CONSTRAINT DF_Customers_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt DATETIME2(7) NOT NULL
            CONSTRAINT DF_Customers_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Customers PRIMARY KEY CLUSTERED (id)
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.Customers') AND name = N'UX_Customers_taxId')
BEGIN
    CREATE UNIQUE INDEX UX_Customers_taxId ON dbo.Customers (taxId) WHERE taxId IS NOT NULL;
END
GO

CREATE OR ALTER TRIGGER dbo.TR_Customers_SetUpdatedAt
ON dbo.Customers
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF (ROWCOUNT_BIG() = 0) OR UPDATE(updatedAt) RETURN;

    UPDATE target
    SET updatedAt = SYSUTCDATETIME()
    FROM dbo.Customers AS target
    INNER JOIN inserted AS source ON source.id = target.id;
END;
GO

IF OBJECT_ID(N'dbo.CustomerContacts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CustomerContacts (
        id INT IDENTITY(1,1) NOT NULL,
        customerId INT NOT NULL,
        name NVARCHAR(120) NOT NULL,
        position NVARCHAR(100) NULL,
        email NVARCHAR(150) NULL,
        phone NVARCHAR(50) NULL,
        isPrimary BIT NOT NULL
            CONSTRAINT DF_CustomerContacts_isPrimary DEFAULT (0),
        estado BIT NOT NULL
            CONSTRAINT DF_CustomerContacts_estado DEFAULT (1),
        createdAt DATETIME2(7) NOT NULL
            CONSTRAINT DF_CustomerContacts_createdAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_CustomerContacts PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_CustomerContacts_Customers FOREIGN KEY (customerId) REFERENCES dbo.Customers(id)
    );
END
GO

IF OBJECT_ID(N'dbo.Quotations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Quotations (
        id INT IDENTITY(1,1) NOT NULL,
        quotationNumber NVARCHAR(30) NOT NULL,
        customerId INT NOT NULL,
        operationType NVARCHAR(20) NOT NULL,
        transportMode NVARCHAR(20) NOT NULL,
        origin NVARCHAR(150) NOT NULL,
        destination NVARCHAR(150) NOT NULL,
        currency NVARCHAR(3) NOT NULL
            CONSTRAINT DF_Quotations_currency DEFAULT (N'USD'),
        profitMargin DECIMAL(9,2) NOT NULL
            CONSTRAINT DF_Quotations_profitMargin DEFAULT (0),
        status NVARCHAR(20) NOT NULL
            CONSTRAINT DF_Quotations_status DEFAULT (N'borrador'),
        notes NVARCHAR(500) NULL,
        createdBy INT NULL,
        createdAt DATETIME2(7) NOT NULL
            CONSTRAINT DF_Quotations_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt DATETIME2(7) NOT NULL
            CONSTRAINT DF_Quotations_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Quotations PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UX_Quotations_quotationNumber UNIQUE (quotationNumber),
        CONSTRAINT FK_Quotations_Customers FOREIGN KEY (customerId) REFERENCES dbo.Customers(id),
        CONSTRAINT FK_Quotations_Users FOREIGN KEY (createdBy) REFERENCES dbo.Users(id),
        CONSTRAINT CK_Quotations_operationType CHECK (operationType IN (N'importacion', N'exportacion')),
        CONSTRAINT CK_Quotations_transportMode CHECK (transportMode IN (N'maritima', N'aerea', N'terrestre')),
        CONSTRAINT CK_Quotations_status CHECK (status IN (N'borrador', N'solicitada_pricing', N'pricing_completado', N'enviada', N'aceptada', N'rechazada'))
    );
END
GO

CREATE OR ALTER TRIGGER dbo.TR_Quotations_SetUpdatedAt
ON dbo.Quotations
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF (ROWCOUNT_BIG() = 0) OR UPDATE(updatedAt) RETURN;

    UPDATE target
    SET updatedAt = SYSUTCDATETIME()
    FROM dbo.Quotations AS target
    INNER JOIN inserted AS source ON source.id = target.id;
END;
GO

IF OBJECT_ID(N'dbo.QuotationCharges', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.QuotationCharges (
        id INT IDENTITY(1,1) NOT NULL,
        quotationId INT NOT NULL,
        chargeType NVARCHAR(30) NOT NULL,
        description NVARCHAR(200) NULL,
        costAmount DECIMAL(18,2) NOT NULL
            CONSTRAINT DF_QuotationCharges_costAmount DEFAULT (0),
        saleAmount DECIMAL(18,2) NOT NULL
            CONSTRAINT DF_QuotationCharges_saleAmount DEFAULT (0),
        CONSTRAINT PK_QuotationCharges PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_QuotationCharges_Quotations FOREIGN KEY (quotationId) REFERENCES dbo.Quotations(id) ON DELETE CASCADE,
        CONSTRAINT CK_QuotationCharges_chargeType CHECK (chargeType IN (N'flete', N'origen', N'destino', N'aduana', N'transporte_local', N'seguro', N'otros'))
    );
END
GO

IF OBJECT_ID(N'dbo.Operations', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Operations (
        id INT IDENTITY(1,1) NOT NULL,
        operationNumber NVARCHAR(30) NOT NULL,
        quotationId INT NULL,
        customerId INT NOT NULL,
        operationType NVARCHAR(20) NOT NULL,
        transportMode NVARCHAR(20) NOT NULL,
        cargoType NVARCHAR(80) NULL,
        bookingNumber NVARCHAR(80) NULL,
        blAwbNumber NVARCHAR(80) NULL,
        origin NVARCHAR(150) NULL,
        destination NVARCHAR(150) NULL,
        etd DATE NULL,
        eta DATE NULL,
        deliveryDate DATE NULL,
        status NVARCHAR(40) NOT NULL
            CONSTRAINT DF_Operations_status DEFAULT (N'booking_confirmado'),
        responsibleUserId INT NULL,
        createdAt DATETIME2(7) NOT NULL
            CONSTRAINT DF_Operations_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt DATETIME2(7) NOT NULL
            CONSTRAINT DF_Operations_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Operations PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UX_Operations_operationNumber UNIQUE (operationNumber),
        CONSTRAINT FK_Operations_Quotations FOREIGN KEY (quotationId) REFERENCES dbo.Quotations(id),
        CONSTRAINT FK_Operations_Customers FOREIGN KEY (customerId) REFERENCES dbo.Customers(id),
        CONSTRAINT FK_Operations_Users FOREIGN KEY (responsibleUserId) REFERENCES dbo.Users(id),
        CONSTRAINT CK_Operations_operationType CHECK (operationType IN (N'importacion', N'exportacion')),
        CONSTRAINT CK_Operations_transportMode CHECK (transportMode IN (N'maritima', N'aerea', N'terrestre')),
        CONSTRAINT CK_Operations_status CHECK (status IN (N'booking_confirmado', N'carga_recibida', N'embarcado', N'en_transito', N'arribado', N'en_aduanas', N'liberado', N'entregado', N'cerrado', N'cancelado'))
    );
END
GO

CREATE OR ALTER TRIGGER dbo.TR_Operations_SetUpdatedAt
ON dbo.Operations
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF (ROWCOUNT_BIG() = 0) OR UPDATE(updatedAt) RETURN;

    UPDATE target
    SET updatedAt = SYSUTCDATETIME()
    FROM dbo.Operations AS target
    INNER JOIN inserted AS source ON source.id = target.id;
END;
GO

IF OBJECT_ID(N'dbo.TrackingEvents', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.TrackingEvents (
        id INT IDENTITY(1,1) NOT NULL,
        operationId INT NOT NULL,
        bookingId INT NULL,
        eventDate DATETIME2(7) NOT NULL
            CONSTRAINT DF_TrackingEvents_eventDate DEFAULT (SYSUTCDATETIME()),
        status NVARCHAR(40) NOT NULL,
        observation NVARCHAR(500) NULL,
        userId INT NULL,
        createdAt DATETIME2(7) NOT NULL
            CONSTRAINT DF_TrackingEvents_createdAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_TrackingEvents PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_TrackingEvents_Operations FOREIGN KEY (operationId) REFERENCES dbo.Operations(id) ON DELETE CASCADE,
        CONSTRAINT FK_TrackingEvents_Users FOREIGN KEY (userId) REFERENCES dbo.Users(id),
        CONSTRAINT CK_TrackingEvents_status CHECK (status IN (N'booking_confirmado', N'carga_recibida', N'embarcado', N'en_transito', N'arribado', N'en_aduanas', N'liberado', N'entregado'))
    );
END
GO

IF OBJECT_ID(N'dbo.OperationDocuments', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OperationDocuments (
        id INT IDENTITY(1,1) NOT NULL,
        operationId INT NOT NULL,
        documentType NVARCHAR(40) NOT NULL,
        fileName NVARCHAR(255) NOT NULL,
        filePath NVARCHAR(500) NULL,
        mimeType NVARCHAR(120) NULL,
        uploadedBy INT NULL,
        uploadedAt DATETIME2(7) NOT NULL
            CONSTRAINT DF_OperationDocuments_uploadedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_OperationDocuments PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_OperationDocuments_Operations FOREIGN KEY (operationId) REFERENCES dbo.Operations(id) ON DELETE CASCADE,
        CONSTRAINT FK_OperationDocuments_Users FOREIGN KEY (uploadedBy) REFERENCES dbo.Users(id),
        CONSTRAINT CK_OperationDocuments_documentType CHECK (documentType IN (N'factura_comercial', N'packing_list', N'bl', N'awb', N'certificado', N'dam', N'otros'))
    );
END
GO

IF OBJECT_ID(N'dbo.OperationFinanceItems', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OperationFinanceItems (
        id INT IDENTITY(1,1) NOT NULL,
        operationId INT NOT NULL,
        itemType NVARCHAR(10) NOT NULL,
        category NVARCHAR(80) NOT NULL,
        description NVARCHAR(200) NULL,
        estimatedAmount DECIMAL(18,2) NOT NULL
            CONSTRAINT DF_OperationFinanceItems_estimatedAmount DEFAULT (0),
        realAmount DECIMAL(18,2) NOT NULL
            CONSTRAINT DF_OperationFinanceItems_realAmount DEFAULT (0),
        currency NVARCHAR(3) NOT NULL
            CONSTRAINT DF_OperationFinanceItems_currency DEFAULT (N'USD'),
        billingStatus NVARCHAR(30) NOT NULL
            CONSTRAINT DF_OperationFinanceItems_billingStatus DEFAULT (N'pendiente'),
        createdAt DATETIME2(7) NOT NULL
            CONSTRAINT DF_OperationFinanceItems_createdAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_OperationFinanceItems PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_OperationFinanceItems_Operations FOREIGN KEY (operationId) REFERENCES dbo.Operations(id) ON DELETE CASCADE,
        CONSTRAINT CK_OperationFinanceItems_itemType CHECK (itemType IN (N'costo', N'ingreso')),
        CONSTRAINT CK_OperationFinanceItems_billingStatus CHECK (billingStatus IN (N'pendiente', N'facturado', N'pagado', N'anulado'))
    );
END
GO

IF OBJECT_ID(N'dbo.OperationCatalog', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OperationCatalog (
        id INT IDENTITY(1,1) NOT NULL,
        name NVARCHAR(80) NOT NULL,
        estado BIT NOT NULL CONSTRAINT DF_OperationCatalog_estado DEFAULT (1),
        CONSTRAINT PK_OperationCatalog PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UX_OperationCatalog_name UNIQUE (name)
    );
END
GO

IF OBJECT_ID(N'dbo.ModalityCatalog', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ModalityCatalog (
        id INT IDENTITY(1,1) NOT NULL,
        name NVARCHAR(80) NOT NULL,
        estado BIT NOT NULL CONSTRAINT DF_ModalityCatalog_estado DEFAULT (1),
        CONSTRAINT PK_ModalityCatalog PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UX_ModalityCatalog_name UNIQUE (name)
    );
END
GO

IF OBJECT_ID(N'dbo.ServiceCatalog', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.ServiceCatalog (
        id INT IDENTITY(1,1) NOT NULL,
        name NVARCHAR(100) NOT NULL,
        estado BIT NOT NULL CONSTRAINT DF_ServiceCatalog_estado DEFAULT (1),
        CONSTRAINT PK_ServiceCatalog PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UX_ServiceCatalog_name UNIQUE (name)
    );
END
GO

IF OBJECT_ID(N'dbo.Countries', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Countries (
        id INT IDENTITY(1,1) NOT NULL,
        name NVARCHAR(100) NOT NULL,
        code NVARCHAR(5) NULL,
        estado BIT NOT NULL CONSTRAINT DF_Countries_estado DEFAULT (1),
        CONSTRAINT PK_Countries PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UX_Countries_name UNIQUE (name)
    );
END
GO

IF OBJECT_ID(N'dbo.Ports', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Ports (
        id INT IDENTITY(1,1) NOT NULL,
        countryId INT NOT NULL,
        name NVARCHAR(120) NOT NULL,
        code NVARCHAR(20) NULL,
        portType NVARCHAR(20) NULL,
        estado BIT NOT NULL CONSTRAINT DF_Ports_estado DEFAULT (1),
        CONSTRAINT PK_Ports PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_Ports_Countries FOREIGN KEY (countryId) REFERENCES dbo.Countries(id)
    );
END
GO

IF OBJECT_ID(N'dbo.CommercialConditions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CommercialConditions (
        id INT IDENTITY(1,1) NOT NULL,
        conditionType NVARCHAR(20) NOT NULL,
        description NVARCHAR(300) NOT NULL,
        estado BIT NOT NULL CONSTRAINT DF_CommercialConditions_estado DEFAULT (1),
        CONSTRAINT PK_CommercialConditions PRIMARY KEY CLUSTERED (id),
        CONSTRAINT CK_CommercialConditions_conditionType CHECK (conditionType IN (N'incluye', N'no_incluye'))
    );
END
GO

IF OBJECT_ID(N'dbo.RequiredDocumentCatalog', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.RequiredDocumentCatalog (
        id INT IDENTITY(1,1) NOT NULL,
        name NVARCHAR(150) NOT NULL,
        estado BIT NOT NULL CONSTRAINT DF_RequiredDocumentCatalog_estado DEFAULT (1),
        CONSTRAINT PK_RequiredDocumentCatalog PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UX_RequiredDocumentCatalog_name UNIQUE (name)
    );
END
GO

IF OBJECT_ID(N'dbo.Tariffs', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.Tariffs (
        id INT IDENTITY(1,1) NOT NULL,
        tariffType NVARCHAR(20) NOT NULL,
        concept NVARCHAR(150) NOT NULL,
        countryId INT NULL,
        portId INT NULL,
        currency NVARCHAR(3) NOT NULL CONSTRAINT DF_Tariffs_currency DEFAULT (N'USD'),
        amount DECIMAL(18,2) NOT NULL CONSTRAINT DF_Tariffs_amount DEFAULT (0),
        estado BIT NOT NULL CONSTRAINT DF_Tariffs_estado DEFAULT (1),
        createdAt DATETIME2(7) NOT NULL CONSTRAINT DF_Tariffs_createdAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Tariffs PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_Tariffs_Countries FOREIGN KEY (countryId) REFERENCES dbo.Countries(id),
        CONSTRAINT FK_Tariffs_Ports FOREIGN KEY (portId) REFERENCES dbo.Ports(id),
        CONSTRAINT CK_Tariffs_tariffType CHECK (tariffType IN (N'origen', N'destino'))
    );
END
GO

IF OBJECT_ID(N'dbo.InternationalFreightConcepts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.InternationalFreightConcepts (
        id INT IDENTITY(1,1) NOT NULL,
        name NVARCHAR(150) NOT NULL,
        currency NVARCHAR(3) NOT NULL CONSTRAINT DF_InternationalFreightConcepts_currency DEFAULT (N'USD'),
        amount DECIMAL(18,2) NOT NULL CONSTRAINT DF_InternationalFreightConcepts_amount DEFAULT (0),
        estado BIT NOT NULL CONSTRAINT DF_InternationalFreightConcepts_estado DEFAULT (1),
        createdAt DATETIME2(7) NOT NULL CONSTRAINT DF_InternationalFreightConcepts_createdAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_InternationalFreightConcepts PRIMARY KEY CLUSTERED (id)
    );
END
GO

IF OBJECT_ID(N'dbo.InternationalInsuranceConcepts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.InternationalInsuranceConcepts (
        id INT IDENTITY(1,1) NOT NULL,
        name NVARCHAR(150) NOT NULL,
        currency NVARCHAR(3) NOT NULL CONSTRAINT DF_InternationalInsuranceConcepts_currency DEFAULT (N'USD'),
        amount DECIMAL(18,2) NOT NULL CONSTRAINT DF_InternationalInsuranceConcepts_amount DEFAULT (0),
        estado BIT NOT NULL CONSTRAINT DF_InternationalInsuranceConcepts_estado DEFAULT (1),
        createdAt DATETIME2(7) NOT NULL CONSTRAINT DF_InternationalInsuranceConcepts_createdAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_InternationalInsuranceConcepts PRIMARY KEY CLUSTERED (id)
    );
END
GO

IF OBJECT_ID(N'dbo.CustomsServiceConcepts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CustomsServiceConcepts (
        id INT IDENTITY(1,1) NOT NULL,
        name NVARCHAR(150) NOT NULL,
        currency NVARCHAR(3) NOT NULL CONSTRAINT DF_CustomsServiceConcepts_currency DEFAULT (N'USD'),
        amount DECIMAL(18,2) NOT NULL CONSTRAINT DF_CustomsServiceConcepts_amount DEFAULT (0),
        estado BIT NOT NULL CONSTRAINT DF_CustomsServiceConcepts_estado DEFAULT (1),
        createdAt DATETIME2(7) NOT NULL CONSTRAINT DF_CustomsServiceConcepts_createdAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_CustomsServiceConcepts PRIMARY KEY CLUSTERED (id)
    );
END
GO

IF OBJECT_ID(N'dbo.LocalTransportConcepts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.LocalTransportConcepts (
        id INT IDENTITY(1,1) NOT NULL,
        name NVARCHAR(150) NOT NULL,
        currency NVARCHAR(3) NOT NULL CONSTRAINT DF_LocalTransportConcepts_currency DEFAULT (N'USD'),
        amount DECIMAL(18,2) NOT NULL CONSTRAINT DF_LocalTransportConcepts_amount DEFAULT (0),
        estado BIT NOT NULL CONSTRAINT DF_LocalTransportConcepts_estado DEFAULT (1),
        createdAt DATETIME2(7) NOT NULL CONSTRAINT DF_LocalTransportConcepts_createdAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_LocalTransportConcepts PRIMARY KEY CLUSTERED (id)
    );
END
GO

IF OBJECT_ID(N'dbo.MeasurementUnits', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.MeasurementUnits (
        id INT IDENTITY(1,1) NOT NULL,
        code NVARCHAR(20) NOT NULL,
        name NVARCHAR(120) NOT NULL,
        estado BIT NOT NULL CONSTRAINT DF_MeasurementUnits_estado DEFAULT (1),
        createdAt DATETIME2(7) NOT NULL CONSTRAINT DF_MeasurementUnits_createdAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_MeasurementUnits PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UX_MeasurementUnits_code UNIQUE (code)
    );
END
GO

MERGE dbo.OperationCatalog AS target
USING (VALUES (N'Importacion'), (N'Exportacion')) AS source (name)
ON target.name = source.name
WHEN NOT MATCHED THEN INSERT (name) VALUES (source.name);
GO

MERGE dbo.ModalityCatalog AS target
USING (VALUES (N'Maritima'), (N'Aerea'), (N'Terrestre')) AS source (name)
ON target.name = source.name
WHEN NOT MATCHED THEN INSERT (name) VALUES (source.name);
GO

MERGE dbo.ServiceCatalog AS target
USING (VALUES (N'FCL'), (N'LCL'), (N'Carga suelta'), (N'Puerta a puerta'), (N'Puerto a puerto')) AS source (name)
ON target.name = source.name
WHEN NOT MATCHED THEN INSERT (name) VALUES (source.name);
GO

MERGE dbo.RequiredDocumentCatalog AS target
USING (VALUES
    (N'Factura Comercial'),
    (N'Packing List'),
    (N'BL Original o Telex Release'),
    (N'Certificados aplicables segun mercancia')
) AS source (name)
ON target.name = source.name
WHEN NOT MATCHED THEN INSERT (name) VALUES (source.name);
GO

MERGE dbo.MeasurementUnits AS target
USING (VALUES
    (N'KG', N'Kilogramo'),
    (N'LB', N'Libra'),
    (N'TON', N'Tonelada'),
    (N'CBM', N'Metro Cubico'),
    (N'CFT', N'Pie Cubico'),
    (N'PCS', N'Piezas'),
    (N'BOX', N'Cajas'),
    (N'PALLET', N'Pallets'),
    (N'CTN', N'Cartones')
) AS source (code, name)
ON target.code = source.code
WHEN MATCHED THEN UPDATE SET name = source.name, estado = 1
WHEN NOT MATCHED THEN INSERT (code, name) VALUES (source.code, source.name);
GO

IF COL_LENGTH(N'dbo.Quotations', N'operationCatalogId') IS NULL ALTER TABLE dbo.Quotations ADD operationCatalogId INT NULL;
GO
IF COL_LENGTH(N'dbo.Quotations', N'modalityCatalogId') IS NULL ALTER TABLE dbo.Quotations ADD modalityCatalogId INT NULL;
GO
IF COL_LENGTH(N'dbo.Quotations', N'serviceCatalogId') IS NULL ALTER TABLE dbo.Quotations ADD serviceCatalogId INT NULL;
GO
IF COL_LENGTH(N'dbo.Quotations', N'originCountryId') IS NULL ALTER TABLE dbo.Quotations ADD originCountryId INT NULL;
GO
IF COL_LENGTH(N'dbo.Quotations', N'originPortId') IS NULL ALTER TABLE dbo.Quotations ADD originPortId INT NULL;
GO
IF COL_LENGTH(N'dbo.Quotations', N'destinationCountryId') IS NULL ALTER TABLE dbo.Quotations ADD destinationCountryId INT NULL;
GO
IF COL_LENGTH(N'dbo.Quotations', N'destinationPortId') IS NULL ALTER TABLE dbo.Quotations ADD destinationPortId INT NULL;
GO
IF COL_LENGTH(N'dbo.Quotations', N'commodity') IS NULL ALTER TABLE dbo.Quotations ADD commodity NVARCHAR(180) NULL;
GO
IF COL_LENGTH(N'dbo.Quotations', N'quantity') IS NULL ALTER TABLE dbo.Quotations ADD quantity DECIMAL(18,3) NULL;
GO
IF COL_LENGTH(N'dbo.Quotations', N'quantityUnitId') IS NULL ALTER TABLE dbo.Quotations ADD quantityUnitId INT NULL;
GO
IF COL_LENGTH(N'dbo.Quotations', N'grossWeight') IS NULL ALTER TABLE dbo.Quotations ADD grossWeight DECIMAL(18,3) NULL;
GO
IF COL_LENGTH(N'dbo.Quotations', N'weightUnitId') IS NULL ALTER TABLE dbo.Quotations ADD weightUnitId INT NULL;
GO
IF COL_LENGTH(N'dbo.Quotations', N'volume') IS NULL ALTER TABLE dbo.Quotations ADD volume DECIMAL(18,3) NULL;
GO
IF COL_LENGTH(N'dbo.Quotations', N'volumeUnitId') IS NULL ALTER TABLE dbo.Quotations ADD volumeUnitId INT NULL;
GO
IF COL_LENGTH(N'dbo.Quotations', N'incoterm') IS NULL ALTER TABLE dbo.Quotations ADD incoterm NVARCHAR(20) NULL;
GO
IF COL_LENGTH(N'dbo.Quotations', N'transitTime') IS NULL ALTER TABLE dbo.Quotations ADD transitTime NVARCHAR(80) NULL;
GO
IF COL_LENGTH(N'dbo.Quotations', N'includesText') IS NULL ALTER TABLE dbo.Quotations ADD includesText NVARCHAR(MAX) NULL;
GO
IF COL_LENGTH(N'dbo.Quotations', N'excludesText') IS NULL ALTER TABLE dbo.Quotations ADD excludesText NVARCHAR(MAX) NULL;
GO
IF COL_LENGTH(N'dbo.Quotations', N'requiredDocumentsText') IS NULL ALTER TABLE dbo.Quotations ADD requiredDocumentsText NVARCHAR(MAX) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Quotations_QuantityUnit')
BEGIN
    ALTER TABLE dbo.Quotations ADD CONSTRAINT FK_Quotations_QuantityUnit FOREIGN KEY (quantityUnitId) REFERENCES dbo.MeasurementUnits(id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Quotations_WeightUnit')
BEGIN
    ALTER TABLE dbo.Quotations ADD CONSTRAINT FK_Quotations_WeightUnit FOREIGN KEY (weightUnitId) REFERENCES dbo.MeasurementUnits(id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Quotations_VolumeUnit')
BEGIN
    ALTER TABLE dbo.Quotations ADD CONSTRAINT FK_Quotations_VolumeUnit FOREIGN KEY (volumeUnitId) REFERENCES dbo.MeasurementUnits(id);
END
GO

IF COL_LENGTH(N'dbo.QuotationCharges', N'section') IS NULL ALTER TABLE dbo.QuotationCharges ADD section NVARCHAR(50) NULL;
GO
IF COL_LENGTH(N'dbo.QuotationCharges', N'currency') IS NULL ALTER TABLE dbo.QuotationCharges ADD currency NVARCHAR(3) NOT NULL CONSTRAINT DF_QuotationCharges_currency DEFAULT (N'USD');
GO

UPDATE dbo.QuotationCharges
SET section = CASE
    WHEN chargeType = N'flete' THEN N'flete_internacional'
    WHEN chargeType = N'seguro' THEN N'seguro_internacional'
    WHEN chargeType = N'aduana' THEN N'servicio_aduanas'
    WHEN chargeType = N'transporte_local' THEN N'transporte_local'
    WHEN chargeType = N'origen' THEN N'gastos_origen'
    WHEN chargeType = N'destino' THEN N'gastos_destino'
    ELSE N'otros'
END
WHERE section IS NULL;
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.QuotationCharges') AND name = N'CK_QuotationCharges_chargeType')
BEGIN
    ALTER TABLE dbo.QuotationCharges DROP CONSTRAINT CK_QuotationCharges_chargeType;
END
GO

ALTER TABLE dbo.QuotationCharges
    ADD CONSTRAINT CK_QuotationCharges_chargeType CHECK (chargeType IN (
        N'flete', N'origen', N'destino', N'aduana', N'transporte_local', N'seguro', N'otros',
        N'flete_internacional', N'seguro_internacional', N'gastos_origen', N'gastos_destino', N'servicio_aduanas'
    ));
GO

CREATE OR ALTER PROCEDURE dbo.CreateCompanyDatabase
    @companyName NVARCHAR(150),
    @databaseName SYSNAME,
    @tradeName NVARCHAR(150) = NULL,
    @taxId NVARCHAR(30) = NULL
AS
BEGIN
    SET NOCOUNT ON;

    IF @companyName IS NULL OR LTRIM(RTRIM(@companyName)) = N''
    BEGIN
        THROW 50001, 'companyName is required.', 1;
    END;

    IF @databaseName IS NULL OR LTRIM(RTRIM(@databaseName)) = N''
    BEGIN
        THROW 50002, 'databaseName is required.', 1;
    END;

    IF @databaseName LIKE N'%[^A-Za-z0-9_]%'
    BEGIN
        THROW 50003, 'databaseName only allows letters, numbers and underscore.', 1;
    END;

    IF DB_ID(@databaseName) IS NULL
    BEGIN
        DECLARE @createDbSql NVARCHAR(MAX) = N'CREATE DATABASE ' + QUOTENAME(@databaseName) + N';';
        EXEC sys.sp_executesql @createDbSql;
    END;

    IF NOT EXISTS (
        SELECT 1
        FROM dbo.Companies
        WHERE databaseName = @databaseName
    )
    BEGIN
        INSERT INTO dbo.Companies (name, tradeName, taxId, databaseName)
        VALUES (@companyName, @tradeName, @taxId, @databaseName);
    END;

    DECLARE @tenantSql NVARCHAR(MAX) = N'
USE ' + QUOTENAME(@databaseName) + N';

IF OBJECT_ID(N''dbo.Users'', N''U'') IS NULL
BEGIN
    CREATE TABLE dbo.Users (
        id INT IDENTITY(1,1) NOT NULL,
        name NVARCHAR(100) NOT NULL,
        email NVARCHAR(150) NOT NULL,
        phone NVARCHAR(50) NULL,
        password NVARCHAR(255) NOT NULL,
        estado BIT NOT NULL
            CONSTRAINT DF_Users_estado DEFAULT (1),
        role NVARCHAR(20) NOT NULL
            CONSTRAINT DF_Users_role DEFAULT (N''user''),
        createdAt DATETIME2(7) NOT NULL
            CONSTRAINT DF_Users_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt DATETIME2(7) NOT NULL
            CONSTRAINT DF_Users_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Users PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UX_Users_email UNIQUE (email),
        CONSTRAINT CK_Users_role CHECK (role IN (N''user'', N''admin'', N''customer_service'', N''operativo'', N''asesor'', N''pricing''))
    );
END;

IF COL_LENGTH(N''dbo.Users'', N''phone'') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD phone NVARCHAR(50) NULL;
END;

IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID(N''dbo.Users'')
      AND name = N''CK_Users_role''
)
BEGIN
    ALTER TABLE dbo.Users DROP CONSTRAINT CK_Users_role;
END;

ALTER TABLE dbo.Users
    ADD CONSTRAINT CK_Users_role CHECK (role IN (N''user'', N''admin'', N''customer_service'', N''operativo'', N''asesor'', N''pricing''));

IF OBJECT_ID(N''dbo.Customers'', N''U'') IS NULL
BEGIN
    CREATE TABLE dbo.Customers (
        id INT IDENTITY(1,1) NOT NULL,
        companyName NVARCHAR(180) NOT NULL,
        tradeName NVARCHAR(180) NULL,
        taxId NVARCHAR(30) NULL,
        fiscalAddress NVARCHAR(300) NULL,
        email NVARCHAR(150) NULL,
        phone NVARCHAR(50) NULL,
        estado BIT NOT NULL CONSTRAINT DF_Customers_estado DEFAULT (1),
        createdAt DATETIME2(7) NOT NULL CONSTRAINT DF_Customers_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt DATETIME2(7) NOT NULL CONSTRAINT DF_Customers_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Customers PRIMARY KEY CLUSTERED (id)
    );
END;

IF OBJECT_ID(N''dbo.CustomerContacts'', N''U'') IS NULL
BEGIN
    CREATE TABLE dbo.CustomerContacts (
        id INT IDENTITY(1,1) NOT NULL,
        customerId INT NOT NULL,
        name NVARCHAR(120) NOT NULL,
        position NVARCHAR(100) NULL,
        email NVARCHAR(150) NULL,
        phone NVARCHAR(50) NULL,
        isPrimary BIT NOT NULL CONSTRAINT DF_CustomerContacts_isPrimary DEFAULT (0),
        estado BIT NOT NULL CONSTRAINT DF_CustomerContacts_estado DEFAULT (1),
        createdAt DATETIME2(7) NOT NULL CONSTRAINT DF_CustomerContacts_createdAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_CustomerContacts PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_CustomerContacts_Customers FOREIGN KEY (customerId) REFERENCES dbo.Customers(id)
    );
END;

IF OBJECT_ID(N''dbo.Quotations'', N''U'') IS NULL
BEGIN
    CREATE TABLE dbo.Quotations (
        id INT IDENTITY(1,1) NOT NULL,
        quotationNumber NVARCHAR(30) NOT NULL,
        customerId INT NOT NULL,
        operationType NVARCHAR(20) NOT NULL,
        transportMode NVARCHAR(20) NOT NULL,
        origin NVARCHAR(150) NOT NULL,
        destination NVARCHAR(150) NOT NULL,
        currency NVARCHAR(3) NOT NULL CONSTRAINT DF_Quotations_currency DEFAULT (N''USD''),
        profitMargin DECIMAL(9,2) NOT NULL CONSTRAINT DF_Quotations_profitMargin DEFAULT (0),
        status NVARCHAR(20) NOT NULL CONSTRAINT DF_Quotations_status DEFAULT (N''borrador''),
        notes NVARCHAR(500) NULL,
        createdBy INT NULL,
        createdAt DATETIME2(7) NOT NULL CONSTRAINT DF_Quotations_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt DATETIME2(7) NOT NULL CONSTRAINT DF_Quotations_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Quotations PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UX_Quotations_quotationNumber UNIQUE (quotationNumber),
        CONSTRAINT FK_Quotations_Customers FOREIGN KEY (customerId) REFERENCES dbo.Customers(id),
        CONSTRAINT FK_Quotations_Users FOREIGN KEY (createdBy) REFERENCES dbo.Users(id),
        CONSTRAINT CK_Quotations_operationType CHECK (operationType IN (N''importacion'', N''exportacion'')),
        CONSTRAINT CK_Quotations_transportMode CHECK (transportMode IN (N''maritima'', N''aerea'', N''terrestre'')),
        CONSTRAINT CK_Quotations_status CHECK (status IN (N''borrador'', N''solicitada_pricing'', N''pricing_completado'', N''enviada'', N''aceptada'', N''rechazada''))
    );
END;

IF OBJECT_ID(N''dbo.QuotationCharges'', N''U'') IS NULL
BEGIN
    CREATE TABLE dbo.QuotationCharges (
        id INT IDENTITY(1,1) NOT NULL,
        quotationId INT NOT NULL,
        chargeType NVARCHAR(30) NOT NULL,
        description NVARCHAR(200) NULL,
        costAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_QuotationCharges_costAmount DEFAULT (0),
        saleAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_QuotationCharges_saleAmount DEFAULT (0),
        CONSTRAINT PK_QuotationCharges PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_QuotationCharges_Quotations FOREIGN KEY (quotationId) REFERENCES dbo.Quotations(id) ON DELETE CASCADE,
        CONSTRAINT CK_QuotationCharges_chargeType CHECK (chargeType IN (N''flete'', N''origen'', N''destino'', N''aduana'', N''transporte_local'', N''seguro'', N''otros''))
    );
END;

IF OBJECT_ID(N''dbo.Operations'', N''U'') IS NULL
BEGIN
    CREATE TABLE dbo.Operations (
        id INT IDENTITY(1,1) NOT NULL,
        operationNumber NVARCHAR(30) NOT NULL,
        quotationId INT NULL,
        customerId INT NOT NULL,
        operationType NVARCHAR(20) NOT NULL,
        transportMode NVARCHAR(20) NOT NULL,
        cargoType NVARCHAR(80) NULL,
        bookingNumber NVARCHAR(80) NULL,
        blAwbNumber NVARCHAR(80) NULL,
        origin NVARCHAR(150) NULL,
        destination NVARCHAR(150) NULL,
        etd DATE NULL,
        eta DATE NULL,
        deliveryDate DATE NULL,
        status NVARCHAR(40) NOT NULL CONSTRAINT DF_Operations_status DEFAULT (N''booking_confirmado''),
        responsibleUserId INT NULL,
        createdAt DATETIME2(7) NOT NULL CONSTRAINT DF_Operations_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt DATETIME2(7) NOT NULL CONSTRAINT DF_Operations_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_Operations PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UX_Operations_operationNumber UNIQUE (operationNumber),
        CONSTRAINT FK_Operations_Quotations FOREIGN KEY (quotationId) REFERENCES dbo.Quotations(id),
        CONSTRAINT FK_Operations_Customers FOREIGN KEY (customerId) REFERENCES dbo.Customers(id),
        CONSTRAINT FK_Operations_Users FOREIGN KEY (responsibleUserId) REFERENCES dbo.Users(id)
    );
END;

IF OBJECT_ID(N''dbo.TrackingEvents'', N''U'') IS NULL
BEGIN
    CREATE TABLE dbo.TrackingEvents (
        id INT IDENTITY(1,1) NOT NULL,
        operationId INT NOT NULL,
        bookingId INT NULL,
        eventDate DATETIME2(7) NOT NULL CONSTRAINT DF_TrackingEvents_eventDate DEFAULT (SYSUTCDATETIME()),
        status NVARCHAR(40) NOT NULL,
        observation NVARCHAR(500) NULL,
        userId INT NULL,
        createdAt DATETIME2(7) NOT NULL CONSTRAINT DF_TrackingEvents_createdAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_TrackingEvents PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_TrackingEvents_Operations FOREIGN KEY (operationId) REFERENCES dbo.Operations(id) ON DELETE CASCADE,
        CONSTRAINT FK_TrackingEvents_Users FOREIGN KEY (userId) REFERENCES dbo.Users(id)
    );
END;

IF OBJECT_ID(N''dbo.OperationDocuments'', N''U'') IS NULL
BEGIN
    CREATE TABLE dbo.OperationDocuments (
        id INT IDENTITY(1,1) NOT NULL,
        operationId INT NOT NULL,
        documentType NVARCHAR(40) NOT NULL,
        fileName NVARCHAR(255) NOT NULL,
        filePath NVARCHAR(500) NULL,
        mimeType NVARCHAR(120) NULL,
        uploadedBy INT NULL,
        uploadedAt DATETIME2(7) NOT NULL CONSTRAINT DF_OperationDocuments_uploadedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_OperationDocuments PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_OperationDocuments_Operations FOREIGN KEY (operationId) REFERENCES dbo.Operations(id) ON DELETE CASCADE,
        CONSTRAINT FK_OperationDocuments_Users FOREIGN KEY (uploadedBy) REFERENCES dbo.Users(id)
    );
END;

IF OBJECT_ID(N''dbo.OperationFinanceItems'', N''U'') IS NULL
BEGIN
    CREATE TABLE dbo.OperationFinanceItems (
        id INT IDENTITY(1,1) NOT NULL,
        operationId INT NOT NULL,
        itemType NVARCHAR(10) NOT NULL,
        category NVARCHAR(80) NOT NULL,
        description NVARCHAR(200) NULL,
        estimatedAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_OperationFinanceItems_estimatedAmount DEFAULT (0),
        realAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_OperationFinanceItems_realAmount DEFAULT (0),
        currency NVARCHAR(3) NOT NULL CONSTRAINT DF_OperationFinanceItems_currency DEFAULT (N''USD''),
        billingStatus NVARCHAR(30) NOT NULL CONSTRAINT DF_OperationFinanceItems_billingStatus DEFAULT (N''pendiente''),
        createdAt DATETIME2(7) NOT NULL CONSTRAINT DF_OperationFinanceItems_createdAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_OperationFinanceItems PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_OperationFinanceItems_Operations FOREIGN KEY (operationId) REFERENCES dbo.Operations(id) ON DELETE CASCADE
    );
END;
';

    EXEC sys.sp_executesql @tenantSql;

    DECLARE @tenantTriggerSql NVARCHAR(MAX) = N'
USE ' + QUOTENAME(@databaseName) + N';
EXEC(N''
CREATE OR ALTER TRIGGER dbo.TR_Users_SetUpdatedAt
ON dbo.Users
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;

    IF (ROWCOUNT_BIG() = 0) OR UPDATE(updatedAt)
    BEGIN
        RETURN;
    END;

    UPDATE usersTable
    SET updatedAt = SYSUTCDATETIME()
    FROM dbo.Users AS usersTable
    INNER JOIN inserted AS updatedRows
        ON updatedRows.id = usersTable.id;
END;
'');
';

    EXEC sys.sp_executesql @tenantTriggerSql;
END;
GO

-- Operational workflow extensions
IF COL_LENGTH(N'dbo.Operations', N'commercialUserId') IS NULL ALTER TABLE dbo.Operations ADD commercialUserId INT NULL;
GO
IF COL_LENGTH(N'dbo.Operations', N'operativeUserId') IS NULL ALTER TABLE dbo.Operations ADD operativeUserId INT NULL;
GO
IF COL_LENGTH(N'dbo.Operations', N'ata') IS NULL ALTER TABLE dbo.Operations ADD ata DATE NULL;
GO
IF COL_LENGTH(N'dbo.Operations', N'estimatedDeliveryDate') IS NULL ALTER TABLE dbo.Operations ADD estimatedDeliveryDate DATE NULL;
GO
IF COL_LENGTH(N'dbo.Operations', N'realDeliveryDate') IS NULL ALTER TABLE dbo.Operations ADD realDeliveryDate DATE NULL;
GO
IF COL_LENGTH(N'dbo.Operations', N'closedBy') IS NULL ALTER TABLE dbo.Operations ADD closedBy INT NULL;
GO
IF COL_LENGTH(N'dbo.Operations', N'closedAt') IS NULL ALTER TABLE dbo.Operations ADD closedAt DATETIME2(7) NULL;
GO
IF COL_LENGTH(N'dbo.Operations', N'closeObservation') IS NULL ALTER TABLE dbo.Operations ADD closeObservation NVARCHAR(500) NULL;
GO
IF COL_LENGTH(N'dbo.Operations', N'quantity') IS NULL ALTER TABLE dbo.Operations ADD quantity DECIMAL(18,3) NULL;
GO
IF COL_LENGTH(N'dbo.Operations', N'quantityUnitId') IS NULL ALTER TABLE dbo.Operations ADD quantityUnitId INT NULL;
GO
IF COL_LENGTH(N'dbo.Operations', N'grossWeight') IS NULL ALTER TABLE dbo.Operations ADD grossWeight DECIMAL(18,3) NULL;
GO
IF COL_LENGTH(N'dbo.Operations', N'weightUnitId') IS NULL ALTER TABLE dbo.Operations ADD weightUnitId INT NULL;
GO
IF COL_LENGTH(N'dbo.Operations', N'volume') IS NULL ALTER TABLE dbo.Operations ADD volume DECIMAL(18,3) NULL;
GO
IF COL_LENGTH(N'dbo.Operations', N'volumeUnitId') IS NULL ALTER TABLE dbo.Operations ADD volumeUnitId INT NULL;
GO
IF COL_LENGTH(N'dbo.Operations', N'commodity') IS NULL ALTER TABLE dbo.Operations ADD commodity NVARCHAR(180) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Operations_QuantityUnit')
BEGIN
    ALTER TABLE dbo.Operations ADD CONSTRAINT FK_Operations_QuantityUnit FOREIGN KEY (quantityUnitId) REFERENCES dbo.MeasurementUnits(id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Operations_WeightUnit')
BEGIN
    ALTER TABLE dbo.Operations ADD CONSTRAINT FK_Operations_WeightUnit FOREIGN KEY (weightUnitId) REFERENCES dbo.MeasurementUnits(id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Operations_VolumeUnit')
BEGIN
    ALTER TABLE dbo.Operations ADD CONSTRAINT FK_Operations_VolumeUnit FOREIGN KEY (volumeUnitId) REFERENCES dbo.MeasurementUnits(id);
END
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.Operations') AND name = N'CK_Operations_status')
BEGIN
    ALTER TABLE dbo.Operations DROP CONSTRAINT CK_Operations_status;
END
GO

UPDATE dbo.Operations
SET status = CASE status
    WHEN N'booking_confirmado' THEN N'BOOKING'
    WHEN N'carga_recibida' THEN N'DOCS_PENDING'
    WHEN N'embarcado' THEN N'SHIPPED'
    WHEN N'en_transito' THEN N'IN_TRANSIT'
    WHEN N'arribado' THEN N'ARRIVED'
    WHEN N'en_aduanas' THEN N'CUSTOMS'
    WHEN N'liberado' THEN N'RELEASED'
    WHEN N'entregado' THEN N'DELIVERED'
    WHEN N'cerrado' THEN N'CLOSED'
    WHEN N'cancelado' THEN N'CANCELLED'
    ELSE status
END
WHERE status IN (
    N'booking_confirmado', N'carga_recibida', N'embarcado', N'en_transito',
    N'arribado', N'en_aduanas', N'liberado', N'entregado', N'cerrado', N'cancelado'
);
GO

ALTER TABLE dbo.Operations
    ADD CONSTRAINT CK_Operations_status CHECK (status IN (
        N'CREATED', N'ASSIGNED', N'BOOKING', N'DOCS_PENDING', N'DOCS_COMPLETE',
        N'SHIPPED', N'IN_TRANSIT', N'ARRIVED', N'CUSTOMS', N'RELEASED',
        N'DELIVERY_SCHEDULED', N'DELIVERED', N'INVOICED', N'CLOSED', N'CANCELLED'
    ));
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Operations_CommercialUser')
BEGIN
    ALTER TABLE dbo.Operations
        ADD CONSTRAINT FK_Operations_CommercialUser FOREIGN KEY (commercialUserId) REFERENCES dbo.Users(id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Operations_OperativeUser')
BEGIN
    ALTER TABLE dbo.Operations
        ADD CONSTRAINT FK_Operations_OperativeUser FOREIGN KEY (operativeUserId) REFERENCES dbo.Users(id);
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Operations_ClosedBy')
BEGIN
    ALTER TABLE dbo.Operations
        ADD CONSTRAINT FK_Operations_ClosedBy FOREIGN KEY (closedBy) REFERENCES dbo.Users(id);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.Operations')
      AND name = N'UX_Operations_quotationId'
)
BEGIN
    CREATE UNIQUE INDEX UX_Operations_quotationId
        ON dbo.Operations (quotationId)
        WHERE quotationId IS NOT NULL;
END
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.TrackingEvents') AND name = N'CK_TrackingEvents_status')
BEGIN
    ALTER TABLE dbo.TrackingEvents DROP CONSTRAINT CK_TrackingEvents_status;
END
GO

UPDATE dbo.TrackingEvents
SET status = CASE status
    WHEN N'booking_confirmado' THEN N'BOOKING'
    WHEN N'carga_recibida' THEN N'DOCS_PENDING'
    WHEN N'embarcado' THEN N'SHIPPED'
    WHEN N'en_transito' THEN N'IN_TRANSIT'
    WHEN N'arribado' THEN N'ARRIVED'
    WHEN N'en_aduanas' THEN N'CUSTOMS'
    WHEN N'liberado' THEN N'RELEASED'
    WHEN N'entregado' THEN N'DELIVERED'
    ELSE status
END
WHERE status IN (N'booking_confirmado', N'carga_recibida', N'embarcado', N'en_transito', N'arribado', N'en_aduanas', N'liberado', N'entregado');
GO

ALTER TABLE dbo.TrackingEvents
    ADD CONSTRAINT CK_TrackingEvents_status CHECK (status IN (
        N'CREATED', N'ASSIGNED', N'BOOKING', N'DOCS_PENDING', N'DOCS_COMPLETE',
        N'SHIPPED', N'IN_TRANSIT', N'ARRIVED', N'CUSTOMS', N'RELEASED',
        N'DELIVERY_SCHEDULED', N'DELIVERED', N'INVOICED', N'CLOSED', N'CANCELLED'
    ));
GO

IF OBJECT_ID(N'dbo.OperationBooking', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OperationBooking (
        id INT IDENTITY(1,1) NOT NULL,
        operationId INT NOT NULL,
        bookingNumber NVARCHAR(80) NULL,
        carrier NVARCHAR(150) NULL,
        bookingDate DATE NULL,
        vessel NVARCHAR(120) NULL,
        voyage NVARCHAR(80) NULL,
        blNumber NVARCHAR(80) NULL,
        awbNumber NVARCHAR(80) NULL,
        mblNumber NVARCHAR(80) NULL,
        hblNumber NVARCHAR(80) NULL,
        mblIssueDate DATE NULL,
        mblShipper NVARCHAR(200) NULL,
        mblConsignee NVARCHAR(200) NULL,
        mblNotifyParty NVARCHAR(200) NULL,
        containerNumber NVARCHAR(80) NULL,
        cutOff DATETIME2(7) NULL,
        etd DATE NULL,
        eta DATE NULL,
        observations NVARCHAR(500) NULL,
        createdBy INT NULL,
        createdAt DATETIME2(7) NOT NULL CONSTRAINT DF_OperationBooking_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt DATETIME2(7) NOT NULL CONSTRAINT DF_OperationBooking_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_OperationBooking PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_OperationBooking_Operations FOREIGN KEY (operationId) REFERENCES dbo.Operations(id) ON DELETE CASCADE,
        CONSTRAINT FK_OperationBooking_Users FOREIGN KEY (createdBy) REFERENCES dbo.Users(id)
    );
END
GO


IF COL_LENGTH(N'dbo.OperationBooking', N'mblNumber') IS NULL
BEGIN
    ALTER TABLE dbo.OperationBooking ADD mblNumber NVARCHAR(80) NULL;
END
GO
IF COL_LENGTH(N'dbo.OperationBooking', N'hblNumber') IS NULL
BEGIN
    ALTER TABLE dbo.OperationBooking ADD hblNumber NVARCHAR(80) NULL;
END
GO
IF COL_LENGTH(N'dbo.OperationBooking', N'mblIssueDate') IS NULL
BEGIN
    ALTER TABLE dbo.OperationBooking ADD mblIssueDate DATE NULL;
END
GO
IF COL_LENGTH(N'dbo.OperationBooking', N'mblShipper') IS NULL
BEGIN
    ALTER TABLE dbo.OperationBooking ADD mblShipper NVARCHAR(200) NULL;
END
GO
IF COL_LENGTH(N'dbo.OperationBooking', N'mblConsignee') IS NULL
BEGIN
    ALTER TABLE dbo.OperationBooking ADD mblConsignee NVARCHAR(200) NULL;
END
GO
IF COL_LENGTH(N'dbo.OperationBooking', N'mblNotifyParty') IS NULL
BEGIN
    ALTER TABLE dbo.OperationBooking ADD mblNotifyParty NVARCHAR(200) NULL;
END
GO

IF OBJECT_ID(N'dbo.OperationBookingHbl', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OperationBookingHbl (
        id INT IDENTITY(1,1) NOT NULL,
        operationId INT NOT NULL,
        bookingId INT NOT NULL,
        hblNumber NVARCHAR(80) NOT NULL,
        customerName NVARCHAR(200) NULL,
        weight DECIMAL(18, 3) NULL,
        volume DECIMAL(18, 3) NULL,
        status NVARCHAR(40) NOT NULL CONSTRAINT DF_OperationBookingHbl_status DEFAULT (N'PENDING'),
        observations NVARCHAR(500) NULL,
        createdBy INT NULL,
        updatedBy INT NULL,
        createdAt DATETIME2(7) NOT NULL CONSTRAINT DF_OperationBookingHbl_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt DATETIME2(7) NOT NULL CONSTRAINT DF_OperationBookingHbl_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_OperationBookingHbl PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_OperationBookingHbl_Operations FOREIGN KEY (operationId) REFERENCES dbo.Operations(id) ON DELETE CASCADE,
        CONSTRAINT FK_OperationBookingHbl_Booking FOREIGN KEY (bookingId) REFERENCES dbo.OperationBooking(id),
        CONSTRAINT FK_OperationBookingHbl_CreatedBy FOREIGN KEY (createdBy) REFERENCES dbo.Users(id),
        CONSTRAINT FK_OperationBookingHbl_UpdatedBy FOREIGN KEY (updatedBy) REFERENCES dbo.Users(id),
        CONSTRAINT CK_OperationBookingHbl_status CHECK (status IN (N'PENDING', N'ISSUED', N'RELEASED', N'CANCELLED'))
    );
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.OperationBookingHbl') AND name = N'IX_OperationBookingHbl_operation_booking')
BEGIN
    CREATE INDEX IX_OperationBookingHbl_operation_booking ON dbo.OperationBookingHbl (operationId, bookingId, createdAt DESC, id DESC);
END
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.OperationBookingHbl') AND name = N'UX_OperationBookingHbl_booking_hblNumber')
BEGIN
    CREATE UNIQUE INDEX UX_OperationBookingHbl_booking_hblNumber ON dbo.OperationBookingHbl (bookingId, hblNumber);
END
GO

CREATE OR ALTER TRIGGER dbo.TR_OperationBookingHbl_SetUpdatedAt
ON dbo.OperationBookingHbl
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE target
    SET updatedAt = SYSUTCDATETIME()
    FROM dbo.OperationBookingHbl AS target
    INNER JOIN inserted AS i ON i.id = target.id;
END
GO
IF COL_LENGTH(N'dbo.TrackingEvents', N'bookingId') IS NULL
BEGIN
    ALTER TABLE dbo.TrackingEvents ADD bookingId INT NULL;
END
GO

IF EXISTS (
    SELECT 1
    FROM sys.key_constraints
    WHERE parent_object_id = OBJECT_ID(N'dbo.OperationBooking')
      AND name = N'UX_OperationBooking_operationId'
)
BEGIN
    ALTER TABLE dbo.OperationBooking DROP CONSTRAINT UX_OperationBooking_operationId;
END
GO

IF EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.OperationBooking')
      AND name = N'UX_OperationBooking_operationId'
)
BEGIN
    DROP INDEX UX_OperationBooking_operationId ON dbo.OperationBooking;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_TrackingEvents_OperationBooking')
BEGIN
    ALTER TABLE dbo.TrackingEvents
        ADD CONSTRAINT FK_TrackingEvents_OperationBooking FOREIGN KEY (bookingId) REFERENCES dbo.OperationBooking(id);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.OperationBooking')
      AND name = N'IX_OperationBooking_operationId'
)
BEGIN
    CREATE INDEX IX_OperationBooking_operationId ON dbo.OperationBooking (operationId, createdAt DESC, id DESC);
END
GO

IF NOT EXISTS (
    SELECT 1 FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.TrackingEvents')
      AND name = N'IX_TrackingEvents_operation_booking'
)
BEGIN
    CREATE INDEX IX_TrackingEvents_operation_booking ON dbo.TrackingEvents (operationId, bookingId, eventDate DESC, createdAt DESC);
END
GO

CREATE OR ALTER TRIGGER dbo.TR_OperationBooking_SetUpdatedAt
ON dbo.OperationBooking
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF (ROWCOUNT_BIG() = 0) OR UPDATE(updatedAt) RETURN;

    UPDATE target
    SET updatedAt = SYSUTCDATETIME()
    FROM dbo.OperationBooking AS target
    INNER JOIN inserted AS source ON source.id = target.id;
END;
GO

IF OBJECT_ID(N'dbo.OperationCustoms', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OperationCustoms (
        id INT IDENTITY(1,1) NOT NULL,
        operationId INT NOT NULL,
        damNumber NVARCHAR(80) NULL,
        channel NVARCHAR(20) NULL,
        taxesAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_OperationCustoms_taxesAmount DEFAULT (0),
        numberingDate DATE NULL,
        releaseDate DATE NULL,
        customsStatus NVARCHAR(80) NULL,
        observations NVARCHAR(500) NULL,
        createdBy INT NULL,
        createdAt DATETIME2(7) NOT NULL CONSTRAINT DF_OperationCustoms_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt DATETIME2(7) NOT NULL CONSTRAINT DF_OperationCustoms_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_OperationCustoms PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UX_OperationCustoms_operationId UNIQUE (operationId),
        CONSTRAINT FK_OperationCustoms_Operations FOREIGN KEY (operationId) REFERENCES dbo.Operations(id) ON DELETE CASCADE,
        CONSTRAINT FK_OperationCustoms_Users FOREIGN KEY (createdBy) REFERENCES dbo.Users(id),
        CONSTRAINT CK_OperationCustoms_channel CHECK (channel IS NULL OR channel IN (N'VERDE', N'NARANJA', N'ROJO'))
    );
END
GO

CREATE OR ALTER TRIGGER dbo.TR_OperationCustoms_SetUpdatedAt
ON dbo.OperationCustoms
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF (ROWCOUNT_BIG() = 0) OR UPDATE(updatedAt) RETURN;

    UPDATE target
    SET updatedAt = SYSUTCDATETIME()
    FROM dbo.OperationCustoms AS target
    INNER JOIN inserted AS source ON source.id = target.id;
END;
GO

IF OBJECT_ID(N'dbo.OperationLocalTransport', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OperationLocalTransport (
        id INT IDENTITY(1,1) NOT NULL,
        operationId INT NOT NULL,
        carrierName NVARCHAR(150) NULL,
        plateNumber NVARCHAR(40) NULL,
        driverName NVARCHAR(120) NULL,
        driverPhone NVARCHAR(50) NULL,
        scheduledDate DATETIME2(7) NULL,
        deliveryDate DATETIME2(7) NULL,
        deliveryPlace NVARCHAR(250) NULL,
        podFilePath NVARCHAR(500) NULL,
        observations NVARCHAR(500) NULL,
        createdBy INT NULL,
        createdAt DATETIME2(7) NOT NULL CONSTRAINT DF_OperationLocalTransport_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt DATETIME2(7) NOT NULL CONSTRAINT DF_OperationLocalTransport_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_OperationLocalTransport PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UX_OperationLocalTransport_operationId UNIQUE (operationId),
        CONSTRAINT FK_OperationLocalTransport_Operations FOREIGN KEY (operationId) REFERENCES dbo.Operations(id) ON DELETE CASCADE,
        CONSTRAINT FK_OperationLocalTransport_Users FOREIGN KEY (createdBy) REFERENCES dbo.Users(id)
    );
END
GO

CREATE OR ALTER TRIGGER dbo.TR_OperationLocalTransport_SetUpdatedAt
ON dbo.OperationLocalTransport
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF (ROWCOUNT_BIG() = 0) OR UPDATE(updatedAt) RETURN;

    UPDATE target
    SET updatedAt = SYSUTCDATETIME()
    FROM dbo.OperationLocalTransport AS target
    INNER JOIN inserted AS source ON source.id = target.id;
END;
GO

IF OBJECT_ID(N'dbo.OperationBilling', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OperationBilling (
        id INT IDENTITY(1,1) NOT NULL,
        operationId INT NOT NULL,
        billingStatus NVARCHAR(20) NOT NULL CONSTRAINT DF_OperationBilling_billingStatus DEFAULT (N'PENDIENTE'),
        invoiceNumber NVARCHAR(80) NULL,
        invoiceDate DATE NULL,
        invoicedAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_OperationBilling_invoicedAmount DEFAULT (0),
        currency NVARCHAR(3) NOT NULL CONSTRAINT DF_OperationBilling_currency DEFAULT (N'USD'),
        observations NVARCHAR(500) NULL,
        createdBy INT NULL,
        createdAt DATETIME2(7) NOT NULL CONSTRAINT DF_OperationBilling_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt DATETIME2(7) NOT NULL CONSTRAINT DF_OperationBilling_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_OperationBilling PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UX_OperationBilling_operationId UNIQUE (operationId),
        CONSTRAINT FK_OperationBilling_Operations FOREIGN KEY (operationId) REFERENCES dbo.Operations(id) ON DELETE CASCADE,
        CONSTRAINT FK_OperationBilling_Users FOREIGN KEY (createdBy) REFERENCES dbo.Users(id),
        CONSTRAINT CK_OperationBilling_billingStatus CHECK (billingStatus IN (N'PENDIENTE', N'PARCIAL', N'FACTURADO'))
    );
END
GO

CREATE OR ALTER TRIGGER dbo.TR_OperationBilling_SetUpdatedAt
ON dbo.OperationBilling
AFTER UPDATE
AS
BEGIN
    SET NOCOUNT ON;
    IF (ROWCOUNT_BIG() = 0) OR UPDATE(updatedAt) RETURN;

    UPDATE target
    SET updatedAt = SYSUTCDATETIME()
    FROM dbo.OperationBilling AS target
    INNER JOIN inserted AS source ON source.id = target.id;
END;
GO

IF COL_LENGTH(N'dbo.OperationDocuments', N'estado') IS NULL
BEGIN
    ALTER TABLE dbo.OperationDocuments ADD estado BIT NOT NULL CONSTRAINT DF_OperationDocuments_estado DEFAULT (1);
END
GO

UPDATE dbo.OperationDocuments
SET documentType = CASE documentType
    WHEN N'factura_comercial' THEN N'commercial_invoice'
    WHEN N'certificado' THEN N'certificate_origin'
    ELSE documentType
END
WHERE documentType IN (N'factura_comercial', N'certificado');
GO

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.OperationDocuments') AND name = N'CK_OperationDocuments_documentType')
BEGIN
    ALTER TABLE dbo.OperationDocuments DROP CONSTRAINT CK_OperationDocuments_documentType;
END
GO

ALTER TABLE dbo.OperationDocuments
    ADD CONSTRAINT CK_OperationDocuments_documentType CHECK (documentType IN (
        N'commercial_invoice', N'packing_list', N'bl', N'awb', N'certificate_origin',
        N'dam', N'delivery_guide', N'pod', N'other'
    ));
GO

-- Optional seed example. Replace the password with a bcrypt hash generated by the app.
-- INSERT INTO dbo.Users (name, email, password, estado, role)
-- VALUES (N'Administrador', N'admin@example.com', N'bcrypt_hash_here', 1, N'admin');
-- GO



