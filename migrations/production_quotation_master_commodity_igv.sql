/*
    Produccion - Cambios cotizaciones / mercaderia / cantidad / IGV
    Fecha: 2026-08-25

    Ejecutar sobre la base de datos de produccion antes de desplegar backend/frontend.
    Script idempotente: puede correrse mas de una vez.
*/

PRINT 'Inicio migracion cotizaciones mercaderia frecuencia cantidad IGV';
GO

IF OBJECT_ID(N'dbo.CommodityCatalog', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CommodityCatalog (
        id INT IDENTITY(1,1) NOT NULL,
        name NVARCHAR(120) NOT NULL,
        estado BIT NOT NULL CONSTRAINT DF_CommodityCatalog_estado DEFAULT (1),
        CONSTRAINT PK_CommodityCatalog PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UX_CommodityCatalog_name UNIQUE (name)
    );
END
GO

MERGE dbo.CommodityCatalog AS target
USING (VALUES (N'Carga General')) AS source (name)
ON target.name = source.name
WHEN MATCHED THEN UPDATE SET estado = 1
WHEN NOT MATCHED THEN INSERT (name) VALUES (source.name);
GO

IF COL_LENGTH(N'dbo.Quotations', N'commodityCatalogId') IS NULL
BEGIN
    ALTER TABLE dbo.Quotations ADD commodityCatalogId INT NULL;
END
GO

IF COL_LENGTH(N'dbo.Quotations', N'frequency') IS NULL
BEGIN
    ALTER TABLE dbo.Quotations ADD frequency NVARCHAR(120) NULL;
END
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Quotations_CommodityCatalog')
BEGIN
    ALTER TABLE dbo.Quotations
        ADD CONSTRAINT FK_Quotations_CommodityCatalog
        FOREIGN KEY (commodityCatalogId) REFERENCES dbo.CommodityCatalog(id);
END
GO

UPDATE q
SET commodityCatalogId = cc.id
FROM dbo.Quotations AS q
INNER JOIN dbo.CommodityCatalog AS cc ON cc.name = q.commodity
WHERE q.commodityCatalogId IS NULL
  AND q.commodity IS NOT NULL;
GO

IF COL_LENGTH(N'dbo.QuotationCharges', N'section') IS NULL
BEGIN
    ALTER TABLE dbo.QuotationCharges ADD section NVARCHAR(50) NULL;
END
GO

IF COL_LENGTH(N'dbo.QuotationCharges', N'currency') IS NULL
BEGIN
    ALTER TABLE dbo.QuotationCharges
        ADD currency NVARCHAR(3) NOT NULL CONSTRAINT DF_QuotationCharges_currency DEFAULT (N'USD');
END
GO

IF COL_LENGTH(N'dbo.QuotationCharges', N'quantity') IS NULL
BEGIN
    ALTER TABLE dbo.QuotationCharges
        ADD quantity DECIMAL(18,3) NOT NULL CONSTRAINT DF_QuotationCharges_quantity DEFAULT (1);
END
GO

IF COL_LENGTH(N'dbo.QuotationCharges', N'igvRate') IS NULL
BEGIN
    ALTER TABLE dbo.QuotationCharges
        ADD igvRate DECIMAL(9,4) NOT NULL CONSTRAINT DF_QuotationCharges_igvRate DEFAULT (0);
END
GO

IF COL_LENGTH(N'dbo.QuotationCharges', N'igvAmount') IS NULL
BEGIN
    ALTER TABLE dbo.QuotationCharges
        ADD igvAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_QuotationCharges_igvAmount DEFAULT (0);
END
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

UPDATE dbo.QuotationCharges
SET section = N'gastos_destino',
    chargeType = N'gastos_destino'
WHERE section IN (N'flete_internacional', N'seguro_internacional', N'servicio_aduanas', N'transporte_local')
   OR chargeType IN (N'flete', N'seguro', N'aduana', N'transporte_local', N'flete_internacional', N'seguro_internacional', N'servicio_aduanas');
GO

UPDATE dbo.QuotationCharges
SET igvRate = CASE WHEN section = N'gastos_destino' THEN 0.18 ELSE 0 END,
    igvAmount = CASE
        WHEN section = N'gastos_destino'
            THEN ROUND(saleAmount * quantity * 0.18, 2)
        ELSE 0
    END;
GO

IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID(N'dbo.QuotationCharges')
      AND name = N'CK_QuotationCharges_chargeType'
)
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

PRINT 'Fin migracion cotizaciones mercaderia frecuencia cantidad IGV';
GO
