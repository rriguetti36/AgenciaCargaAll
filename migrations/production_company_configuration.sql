/*
    Produccion - Configuracion CIA y pie de PDF
    Fecha: 2026-08-27

    Agrega:
    - dbo.CompanyConfiguration
    - dbo.CompanyBankAccounts
    - dbo.LocationDistricts
    - Seed inicial de ubicaciones Lima/Callao
    - Registro unico de configuracion id = 1

    Script idempotente: puede correrse mas de una vez.
*/

PRINT 'Inicio migracion configuracion CIA';
GO

IF OBJECT_ID(N'dbo.LocationDistricts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.LocationDistricts (
        id INT IDENTITY(1,1) NOT NULL,
        department NVARCHAR(100) NOT NULL,
        province NVARCHAR(100) NOT NULL,
        district NVARCHAR(100) NOT NULL,
        estado BIT NOT NULL CONSTRAINT DF_LocationDistricts_estado DEFAULT (1),
        CONSTRAINT PK_LocationDistricts PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UX_LocationDistricts UNIQUE (department, province, district)
    );
END
GO

IF OBJECT_ID(N'dbo.CompanyConfiguration', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CompanyConfiguration (
        id INT NOT NULL CONSTRAINT DF_CompanyConfiguration_id DEFAULT (1),
        companyName NVARCHAR(150) NULL,
        businessName NVARCHAR(180) NULL,
        legalRepresentative NVARCHAR(150) NULL,
        ruc NVARCHAR(20) NULL,
        address NVARCHAR(250) NULL,
        department NVARCHAR(100) NULL,
        province NVARCHAR(100) NULL,
        district NVARCHAR(100) NULL,
        facebookUrl NVARCHAR(250) NULL,
        instagramUrl NVARCHAR(250) NULL,
        websiteUrl NVARCHAR(250) NULL,
        logoPath NVARCHAR(250) NULL,
        showIncludesInPdf BIT NOT NULL CONSTRAINT DF_CompanyConfiguration_showIncludesInPdf DEFAULT (1),
        showExcludesInPdf BIT NOT NULL CONSTRAINT DF_CompanyConfiguration_showExcludesInPdf DEFAULT (1),
        showDocumentsInPdf BIT NOT NULL CONSTRAINT DF_CompanyConfiguration_showDocumentsInPdf DEFAULT (1),
        showFooterTextInPdf BIT NOT NULL CONSTRAINT DF_CompanyConfiguration_showFooterTextInPdf DEFAULT (1),
        showBankAccountsInPdf BIT NOT NULL CONSTRAINT DF_CompanyConfiguration_showBankAccountsInPdf DEFAULT (1),
        defaultIncludesText NVARCHAR(MAX) NULL,
        defaultExcludesText NVARCHAR(MAX) NULL,
        defaultDocumentsText NVARCHAR(MAX) NULL,
        footerText NVARCHAR(MAX) NULL,
        createdAt DATETIME2(7) NOT NULL CONSTRAINT DF_CompanyConfiguration_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt DATETIME2(7) NOT NULL CONSTRAINT DF_CompanyConfiguration_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_CompanyConfiguration PRIMARY KEY CLUSTERED (id),
        CONSTRAINT CK_CompanyConfiguration_singleton CHECK (id = 1)
    );
END
GO

IF COL_LENGTH(N'dbo.CompanyConfiguration', N'companyName') IS NULL ALTER TABLE dbo.CompanyConfiguration ADD companyName NVARCHAR(150) NULL;
GO
IF COL_LENGTH(N'dbo.CompanyConfiguration', N'businessName') IS NULL ALTER TABLE dbo.CompanyConfiguration ADD businessName NVARCHAR(180) NULL;
GO
IF COL_LENGTH(N'dbo.CompanyConfiguration', N'legalRepresentative') IS NULL ALTER TABLE dbo.CompanyConfiguration ADD legalRepresentative NVARCHAR(150) NULL;
GO
IF COL_LENGTH(N'dbo.CompanyConfiguration', N'ruc') IS NULL ALTER TABLE dbo.CompanyConfiguration ADD ruc NVARCHAR(20) NULL;
GO
IF COL_LENGTH(N'dbo.CompanyConfiguration', N'address') IS NULL ALTER TABLE dbo.CompanyConfiguration ADD address NVARCHAR(250) NULL;
GO
IF COL_LENGTH(N'dbo.CompanyConfiguration', N'department') IS NULL ALTER TABLE dbo.CompanyConfiguration ADD department NVARCHAR(100) NULL;
GO
IF COL_LENGTH(N'dbo.CompanyConfiguration', N'province') IS NULL ALTER TABLE dbo.CompanyConfiguration ADD province NVARCHAR(100) NULL;
GO
IF COL_LENGTH(N'dbo.CompanyConfiguration', N'district') IS NULL ALTER TABLE dbo.CompanyConfiguration ADD district NVARCHAR(100) NULL;
GO
IF COL_LENGTH(N'dbo.CompanyConfiguration', N'facebookUrl') IS NULL ALTER TABLE dbo.CompanyConfiguration ADD facebookUrl NVARCHAR(250) NULL;
GO
IF COL_LENGTH(N'dbo.CompanyConfiguration', N'instagramUrl') IS NULL ALTER TABLE dbo.CompanyConfiguration ADD instagramUrl NVARCHAR(250) NULL;
GO
IF COL_LENGTH(N'dbo.CompanyConfiguration', N'websiteUrl') IS NULL ALTER TABLE dbo.CompanyConfiguration ADD websiteUrl NVARCHAR(250) NULL;
GO
IF COL_LENGTH(N'dbo.CompanyConfiguration', N'logoPath') IS NULL ALTER TABLE dbo.CompanyConfiguration ADD logoPath NVARCHAR(250) NULL;
GO
IF COL_LENGTH(N'dbo.CompanyConfiguration', N'showIncludesInPdf') IS NULL ALTER TABLE dbo.CompanyConfiguration ADD showIncludesInPdf BIT NOT NULL CONSTRAINT DF_CompanyConfiguration_showIncludesInPdf DEFAULT (1);
GO
IF COL_LENGTH(N'dbo.CompanyConfiguration', N'showExcludesInPdf') IS NULL ALTER TABLE dbo.CompanyConfiguration ADD showExcludesInPdf BIT NOT NULL CONSTRAINT DF_CompanyConfiguration_showExcludesInPdf DEFAULT (1);
GO
IF COL_LENGTH(N'dbo.CompanyConfiguration', N'showDocumentsInPdf') IS NULL ALTER TABLE dbo.CompanyConfiguration ADD showDocumentsInPdf BIT NOT NULL CONSTRAINT DF_CompanyConfiguration_showDocumentsInPdf DEFAULT (1);
GO
IF COL_LENGTH(N'dbo.CompanyConfiguration', N'showFooterTextInPdf') IS NULL ALTER TABLE dbo.CompanyConfiguration ADD showFooterTextInPdf BIT NOT NULL CONSTRAINT DF_CompanyConfiguration_showFooterTextInPdf DEFAULT (1);
GO
IF COL_LENGTH(N'dbo.CompanyConfiguration', N'showBankAccountsInPdf') IS NULL ALTER TABLE dbo.CompanyConfiguration ADD showBankAccountsInPdf BIT NOT NULL CONSTRAINT DF_CompanyConfiguration_showBankAccountsInPdf DEFAULT (1);
GO
IF COL_LENGTH(N'dbo.CompanyConfiguration', N'defaultIncludesText') IS NULL ALTER TABLE dbo.CompanyConfiguration ADD defaultIncludesText NVARCHAR(MAX) NULL;
GO
IF COL_LENGTH(N'dbo.CompanyConfiguration', N'defaultExcludesText') IS NULL ALTER TABLE dbo.CompanyConfiguration ADD defaultExcludesText NVARCHAR(MAX) NULL;
GO
IF COL_LENGTH(N'dbo.CompanyConfiguration', N'defaultDocumentsText') IS NULL ALTER TABLE dbo.CompanyConfiguration ADD defaultDocumentsText NVARCHAR(MAX) NULL;
GO
IF COL_LENGTH(N'dbo.CompanyConfiguration', N'footerText') IS NULL ALTER TABLE dbo.CompanyConfiguration ADD footerText NVARCHAR(MAX) NULL;
GO
IF COL_LENGTH(N'dbo.CompanyConfiguration', N'updatedAt') IS NULL ALTER TABLE dbo.CompanyConfiguration ADD updatedAt DATETIME2(7) NOT NULL CONSTRAINT DF_CompanyConfiguration_updatedAt DEFAULT (SYSUTCDATETIME());
GO

IF OBJECT_ID(N'dbo.CompanyBankAccounts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CompanyBankAccounts (
        id INT IDENTITY(1,1) NOT NULL,
        companyConfigId INT NOT NULL CONSTRAINT DF_CompanyBankAccounts_companyConfigId DEFAULT (1),
        bankName NVARCHAR(120) NULL,
        accountNumber NVARCHAR(80) NULL,
        cci NVARCHAR(80) NULL,
        estado BIT NOT NULL CONSTRAINT DF_CompanyBankAccounts_estado DEFAULT (1),
        sortOrder INT NOT NULL CONSTRAINT DF_CompanyBankAccounts_sortOrder DEFAULT (1),
        createdAt DATETIME2(7) NOT NULL CONSTRAINT DF_CompanyBankAccounts_createdAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_CompanyBankAccounts PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_CompanyBankAccounts_CompanyConfiguration FOREIGN KEY (companyConfigId) REFERENCES dbo.CompanyConfiguration(id)
    );
END
GO

MERGE dbo.LocationDistricts AS target
USING (VALUES
    (N'Lima', N'Lima', N'Lima'),
    (N'Lima', N'Lima', N'Miraflores'),
    (N'Lima', N'Lima', N'San Isidro'),
    (N'Lima', N'Lima', N'Santiago de Surco'),
    (N'Lima', N'Lima', N'San Borja'),
    (N'Callao', N'Callao', N'Callao'),
    (N'Callao', N'Callao', N'La Perla'),
    (N'Callao', N'Callao', N'Bellavista')
) AS source (department, province, district)
ON target.department = source.department
   AND target.province = source.province
   AND target.district = source.district
WHEN MATCHED THEN UPDATE SET estado = 1
WHEN NOT MATCHED THEN INSERT (department, province, district) VALUES (source.department, source.province, source.district);
GO

IF NOT EXISTS (SELECT 1 FROM dbo.CompanyConfiguration WHERE id = 1)
BEGIN
    INSERT INTO dbo.CompanyConfiguration (
        id, companyName, logoPath, showIncludesInPdf, showExcludesInPdf, showDocumentsInPdf,
        showFooterTextInPdf, showBankAccountsInPdf, defaultDocumentsText
    )
    VALUES (
        1, N'Agencia de Carga', N'/imagenes/logo.jpeg', 1, 1, 1, 1, 1,
        N'Factura Comercial' + CHAR(10) + N'Packing List' + CHAR(10) + N'BL Original o Telex Release' + CHAR(10) + N'Certificados aplicables segun mercancia'
    );
END
GO

PRINT 'Fin migracion configuracion CIA';
GO
