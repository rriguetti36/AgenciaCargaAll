USE BD_AGEN_CARGA;
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
