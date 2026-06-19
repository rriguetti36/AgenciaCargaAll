USE BD_AGEN_CARGA;
GO

SET ANSI_NULLS ON;
GO

SET QUOTED_IDENTIFIER ON;
GO

-- Incremental idempotente para alinear una BD existente con el codigo actual.

IF COL_LENGTH(N'dbo.Customers', N'creditEnabled') IS NULL
    ALTER TABLE dbo.Customers ADD creditEnabled BIT NOT NULL CONSTRAINT DF_Customers_creditEnabled DEFAULT (0);
GO
IF COL_LENGTH(N'dbo.Customers', N'creditLimit') IS NULL
    ALTER TABLE dbo.Customers ADD creditLimit DECIMAL(18,2) NOT NULL CONSTRAINT DF_Customers_creditLimit DEFAULT (0);
GO
IF COL_LENGTH(N'dbo.Customers', N'creditCurrency') IS NULL
    ALTER TABLE dbo.Customers ADD creditCurrency NVARCHAR(3) NOT NULL CONSTRAINT DF_Customers_creditCurrency DEFAULT (N'USD');
GO
IF COL_LENGTH(N'dbo.Customers', N'creditDays') IS NULL
    ALTER TABLE dbo.Customers ADD creditDays INT NOT NULL CONSTRAINT DF_Customers_creditDays DEFAULT (0);
GO
IF COL_LENGTH(N'dbo.Customers', N'creditNotes') IS NULL
    ALTER TABLE dbo.Customers ADD creditNotes NVARCHAR(500) NULL;
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
IF COL_LENGTH(N'dbo.Quotations', N'pricingUserId') IS NULL ALTER TABLE dbo.Quotations ADD pricingUserId INT NULL;
GO
IF COL_LENGTH(N'dbo.Quotations', N'pricingSubmittedAt') IS NULL ALTER TABLE dbo.Quotations ADD pricingSubmittedAt DATETIME2(7) NULL;
GO
IF COL_LENGTH(N'dbo.Quotations', N'sentToCustomerAt') IS NULL ALTER TABLE dbo.Quotations ADD sentToCustomerAt DATETIME2(7) NULL;
GO
IF COL_LENGTH(N'dbo.Quotations', N'customerApprovedAt') IS NULL ALTER TABLE dbo.Quotations ADD customerApprovedAt DATETIME2(7) NULL;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Quotations_PricingUser')
    ALTER TABLE dbo.Quotations WITH NOCHECK ADD CONSTRAINT FK_Quotations_PricingUser FOREIGN KEY (pricingUserId) REFERENCES dbo.Users(id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Quotations_QuantityUnit')
    ALTER TABLE dbo.Quotations WITH NOCHECK ADD CONSTRAINT FK_Quotations_QuantityUnit FOREIGN KEY (quantityUnitId) REFERENCES dbo.MeasurementUnits(id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Quotations_WeightUnit')
    ALTER TABLE dbo.Quotations WITH NOCHECK ADD CONSTRAINT FK_Quotations_WeightUnit FOREIGN KEY (weightUnitId) REFERENCES dbo.MeasurementUnits(id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Quotations_VolumeUnit')
    ALTER TABLE dbo.Quotations WITH NOCHECK ADD CONSTRAINT FK_Quotations_VolumeUnit FOREIGN KEY (volumeUnitId) REFERENCES dbo.MeasurementUnits(id);
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

IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.Quotations') AND name = N'CK_Quotations_status')
    ALTER TABLE dbo.Quotations DROP CONSTRAINT CK_Quotations_status;
GO
ALTER TABLE dbo.Quotations WITH NOCHECK ADD CONSTRAINT CK_Quotations_status CHECK (status IN (
    N'borrador', N'solicitada_pricing', N'pricing_completado', N'enviada', N'aceptada', N'rechazada'
));
GO

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

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Operations_CommercialUser')
    ALTER TABLE dbo.Operations WITH NOCHECK ADD CONSTRAINT FK_Operations_CommercialUser FOREIGN KEY (commercialUserId) REFERENCES dbo.Users(id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Operations_OperativeUser')
    ALTER TABLE dbo.Operations WITH NOCHECK ADD CONSTRAINT FK_Operations_OperativeUser FOREIGN KEY (operativeUserId) REFERENCES dbo.Users(id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Operations_ClosedBy')
    ALTER TABLE dbo.Operations WITH NOCHECK ADD CONSTRAINT FK_Operations_ClosedBy FOREIGN KEY (closedBy) REFERENCES dbo.Users(id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Operations_QuantityUnit')
    ALTER TABLE dbo.Operations WITH NOCHECK ADD CONSTRAINT FK_Operations_QuantityUnit FOREIGN KEY (quantityUnitId) REFERENCES dbo.MeasurementUnits(id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Operations_WeightUnit')
    ALTER TABLE dbo.Operations WITH NOCHECK ADD CONSTRAINT FK_Operations_WeightUnit FOREIGN KEY (weightUnitId) REFERENCES dbo.MeasurementUnits(id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_Operations_VolumeUnit')
    ALTER TABLE dbo.Operations WITH NOCHECK ADD CONSTRAINT FK_Operations_VolumeUnit FOREIGN KEY (volumeUnitId) REFERENCES dbo.MeasurementUnits(id);
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
WHERE status IN (N'booking_confirmado', N'carga_recibida', N'embarcado', N'en_transito', N'arribado', N'en_aduanas', N'liberado', N'entregado', N'cerrado', N'cancelado');
GO
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.Operations') AND name = N'CK_Operations_status')
    ALTER TABLE dbo.Operations DROP CONSTRAINT CK_Operations_status;
GO
ALTER TABLE dbo.Operations WITH NOCHECK ADD CONSTRAINT CK_Operations_status CHECK (status IN (
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

IF COL_LENGTH(N'dbo.OperationBooking', N'carrier') IS NULL ALTER TABLE dbo.OperationBooking ADD carrier NVARCHAR(150) NULL;
GO
IF COL_LENGTH(N'dbo.OperationBooking', N'bookingDate') IS NULL ALTER TABLE dbo.OperationBooking ADD bookingDate DATE NULL;
GO
IF COL_LENGTH(N'dbo.OperationBooking', N'vessel') IS NULL ALTER TABLE dbo.OperationBooking ADD vessel NVARCHAR(120) NULL;
GO
IF COL_LENGTH(N'dbo.OperationBooking', N'voyage') IS NULL ALTER TABLE dbo.OperationBooking ADD voyage NVARCHAR(80) NULL;
GO
IF COL_LENGTH(N'dbo.OperationBooking', N'blNumber') IS NULL ALTER TABLE dbo.OperationBooking ADD blNumber NVARCHAR(80) NULL;
GO
IF COL_LENGTH(N'dbo.OperationBooking', N'awbNumber') IS NULL ALTER TABLE dbo.OperationBooking ADD awbNumber NVARCHAR(80) NULL;
GO
IF COL_LENGTH(N'dbo.OperationBooking', N'mblNumber') IS NULL ALTER TABLE dbo.OperationBooking ADD mblNumber NVARCHAR(80) NULL;
GO
IF COL_LENGTH(N'dbo.OperationBooking', N'hblNumber') IS NULL ALTER TABLE dbo.OperationBooking ADD hblNumber NVARCHAR(80) NULL;
GO
IF COL_LENGTH(N'dbo.OperationBooking', N'mblIssueDate') IS NULL ALTER TABLE dbo.OperationBooking ADD mblIssueDate DATE NULL;
GO
IF COL_LENGTH(N'dbo.OperationBooking', N'mblShipper') IS NULL ALTER TABLE dbo.OperationBooking ADD mblShipper NVARCHAR(200) NULL;
GO
IF COL_LENGTH(N'dbo.OperationBooking', N'mblConsignee') IS NULL ALTER TABLE dbo.OperationBooking ADD mblConsignee NVARCHAR(200) NULL;
GO
IF COL_LENGTH(N'dbo.OperationBooking', N'mblNotifyParty') IS NULL ALTER TABLE dbo.OperationBooking ADD mblNotifyParty NVARCHAR(200) NULL;
GO
IF COL_LENGTH(N'dbo.OperationBooking', N'containerNumber') IS NULL ALTER TABLE dbo.OperationBooking ADD containerNumber NVARCHAR(80) NULL;
GO
IF COL_LENGTH(N'dbo.OperationBooking', N'cutOff') IS NULL ALTER TABLE dbo.OperationBooking ADD cutOff DATETIME2(7) NULL;
GO
IF COL_LENGTH(N'dbo.OperationBooking', N'etd') IS NULL ALTER TABLE dbo.OperationBooking ADD etd DATE NULL;
GO
IF COL_LENGTH(N'dbo.OperationBooking', N'eta') IS NULL ALTER TABLE dbo.OperationBooking ADD eta DATE NULL;
GO
IF COL_LENGTH(N'dbo.OperationBooking', N'observations') IS NULL ALTER TABLE dbo.OperationBooking ADD observations NVARCHAR(500) NULL;
GO
IF COL_LENGTH(N'dbo.OperationBooking', N'createdBy') IS NULL ALTER TABLE dbo.OperationBooking ADD createdBy INT NULL;
GO
IF COL_LENGTH(N'dbo.OperationBooking', N'createdAt') IS NULL ALTER TABLE dbo.OperationBooking ADD createdAt DATETIME2(7) NOT NULL CONSTRAINT DF_OperationBooking_createdAt DEFAULT (SYSUTCDATETIME());
GO
IF COL_LENGTH(N'dbo.OperationBooking', N'updatedAt') IS NULL ALTER TABLE dbo.OperationBooking ADD updatedAt DATETIME2(7) NOT NULL CONSTRAINT DF_OperationBooking_updatedAt DEFAULT (SYSUTCDATETIME());
GO

IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.OperationBooking') AND name = N'UX_OperationBooking_operationId')
    ALTER TABLE dbo.OperationBooking DROP CONSTRAINT UX_OperationBooking_operationId;
GO
IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.OperationBooking') AND name = N'UX_OperationBooking_operationId')
    DROP INDEX UX_OperationBooking_operationId ON dbo.OperationBooking;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.OperationBooking') AND name = N'IX_OperationBooking_operationId')
    CREATE INDEX IX_OperationBooking_operationId ON dbo.OperationBooking (operationId, createdAt DESC, id DESC);
GO

IF OBJECT_ID(N'dbo.OperationBookingHbl', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OperationBookingHbl (
        id INT IDENTITY(1,1) NOT NULL,
        operationId INT NOT NULL,
        bookingId INT NOT NULL,
        hblNumber NVARCHAR(80) NOT NULL,
        customerName NVARCHAR(200) NULL,
        weight DECIMAL(18,3) NULL,
        volume DECIMAL(18,3) NULL,
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
    CREATE INDEX IX_OperationBookingHbl_operation_booking ON dbo.OperationBookingHbl (operationId, bookingId, createdAt DESC, id DESC);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.OperationBookingHbl') AND name = N'UX_OperationBookingHbl_booking_hblNumber')
    CREATE UNIQUE INDEX UX_OperationBookingHbl_booking_hblNumber ON dbo.OperationBookingHbl (bookingId, hblNumber);
GO

IF COL_LENGTH(N'dbo.TrackingEvents', N'bookingId') IS NULL ALTER TABLE dbo.TrackingEvents ADD bookingId INT NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_TrackingEvents_OperationBooking')
    ALTER TABLE dbo.TrackingEvents WITH NOCHECK ADD CONSTRAINT FK_TrackingEvents_OperationBooking FOREIGN KEY (bookingId) REFERENCES dbo.OperationBooking(id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.TrackingEvents') AND name = N'IX_TrackingEvents_operation_booking')
    CREATE INDEX IX_TrackingEvents_operation_booking ON dbo.TrackingEvents (operationId, bookingId, eventDate DESC, createdAt DESC);
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
IF EXISTS (SELECT 1 FROM sys.check_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.TrackingEvents') AND name = N'CK_TrackingEvents_status')
    ALTER TABLE dbo.TrackingEvents DROP CONSTRAINT CK_TrackingEvents_status;
GO
ALTER TABLE dbo.TrackingEvents WITH NOCHECK ADD CONSTRAINT CK_TrackingEvents_status CHECK (status IN (
    N'CREATED', N'ASSIGNED', N'BOOKING', N'DOCS_PENDING', N'DOCS_COMPLETE',
    N'SHIPPED', N'IN_TRANSIT', N'ARRIVED', N'CUSTOMS', N'RELEASED',
    N'DELIVERY_SCHEDULED', N'DELIVERED', N'INVOICED', N'CLOSED', N'CANCELLED'
));
GO

IF OBJECT_ID(N'dbo.OperationCustoms', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OperationCustoms (
        id INT IDENTITY(1,1) NOT NULL,
        operationId INT NOT NULL,
        bookingId INT NULL,
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
        CONSTRAINT FK_OperationCustoms_Operations FOREIGN KEY (operationId) REFERENCES dbo.Operations(id) ON DELETE CASCADE,
        CONSTRAINT FK_OperationCustoms_Users FOREIGN KEY (createdBy) REFERENCES dbo.Users(id)
    );
END
GO
IF COL_LENGTH(N'dbo.OperationCustoms', N'bookingId') IS NULL ALTER TABLE dbo.OperationCustoms ADD bookingId INT NULL;
GO

IF OBJECT_ID(N'dbo.OperationLocalTransport', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OperationLocalTransport (
        id INT IDENTITY(1,1) NOT NULL,
        operationId INT NOT NULL,
        bookingId INT NULL,
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
        CONSTRAINT FK_OperationLocalTransport_Operations FOREIGN KEY (operationId) REFERENCES dbo.Operations(id) ON DELETE CASCADE,
        CONSTRAINT FK_OperationLocalTransport_Users FOREIGN KEY (createdBy) REFERENCES dbo.Users(id)
    );
END
GO
IF COL_LENGTH(N'dbo.OperationLocalTransport', N'bookingId') IS NULL ALTER TABLE dbo.OperationLocalTransport ADD bookingId INT NULL;
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

IF COL_LENGTH(N'dbo.OperationDocuments', N'bookingId') IS NULL ALTER TABLE dbo.OperationDocuments ADD bookingId INT NULL;
GO
IF COL_LENGTH(N'dbo.OperationDocuments', N'estado') IS NULL ALTER TABLE dbo.OperationDocuments ADD estado BIT NOT NULL CONSTRAINT DF_OperationDocuments_estado DEFAULT (1);
GO

IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.OperationCustoms') AND name = N'UX_OperationCustoms_operationId')
    ALTER TABLE dbo.OperationCustoms DROP CONSTRAINT UX_OperationCustoms_operationId;
GO
IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.OperationCustoms') AND name = N'UX_OperationCustoms_operationId')
    DROP INDEX UX_OperationCustoms_operationId ON dbo.OperationCustoms;
GO
IF EXISTS (SELECT 1 FROM sys.key_constraints WHERE parent_object_id = OBJECT_ID(N'dbo.OperationLocalTransport') AND name = N'UX_OperationLocalTransport_operationId')
    ALTER TABLE dbo.OperationLocalTransport DROP CONSTRAINT UX_OperationLocalTransport_operationId;
GO
IF EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.OperationLocalTransport') AND name = N'UX_OperationLocalTransport_operationId')
    DROP INDEX UX_OperationLocalTransport_operationId ON dbo.OperationLocalTransport;
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_OperationDocuments_OperationBooking')
    ALTER TABLE dbo.OperationDocuments WITH NOCHECK ADD CONSTRAINT FK_OperationDocuments_OperationBooking FOREIGN KEY (bookingId) REFERENCES dbo.OperationBooking(id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_OperationCustoms_OperationBooking')
    ALTER TABLE dbo.OperationCustoms WITH NOCHECK ADD CONSTRAINT FK_OperationCustoms_OperationBooking FOREIGN KEY (bookingId) REFERENCES dbo.OperationBooking(id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_OperationLocalTransport_OperationBooking')
    ALTER TABLE dbo.OperationLocalTransport WITH NOCHECK ADD CONSTRAINT FK_OperationLocalTransport_OperationBooking FOREIGN KEY (bookingId) REFERENCES dbo.OperationBooking(id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.OperationCustoms') AND name = N'UX_OperationCustoms_operation_booking')
    CREATE UNIQUE INDEX UX_OperationCustoms_operation_booking ON dbo.OperationCustoms (operationId, bookingId) WHERE bookingId IS NOT NULL;
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.OperationLocalTransport') AND name = N'UX_OperationLocalTransport_operation_booking')
    CREATE UNIQUE INDEX UX_OperationLocalTransport_operation_booking ON dbo.OperationLocalTransport (operationId, bookingId) WHERE bookingId IS NOT NULL;
GO

IF COL_LENGTH(N'dbo.Users', N'commissionPercentage') IS NULL
    ALTER TABLE dbo.Users ADD commissionPercentage DECIMAL(9,4) NOT NULL CONSTRAINT DF_Users_commissionPercentage DEFAULT (0);
GO

IF OBJECT_ID(N'dbo.OperationCosts', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.OperationCosts (
        id INT IDENTITY(1,1) NOT NULL,
        operationId INT NOT NULL,
        bookingId INT NULL,
        quotationChargeId INT NULL,
        costScope NVARCHAR(20) NOT NULL CONSTRAINT DF_OperationCosts_costScope DEFAULT (N'OPERATION'),
        chargeSection NVARCHAR(50) NULL,
        concept NVARCHAR(200) NOT NULL,
        provider NVARCHAR(180) NULL,
        estimatedCost DECIMAL(18,2) NOT NULL CONSTRAINT DF_OperationCosts_estimatedCost DEFAULT (0),
        realCost DECIMAL(18,2) NOT NULL CONSTRAINT DF_OperationCosts_realCost DEFAULT (0),
        saleAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_OperationCosts_saleAmount DEFAULT (0),
        estimatedProfit AS (saleAmount - estimatedCost) PERSISTED,
        realProfit AS (saleAmount - realCost) PERSISTED,
        currency NVARCHAR(3) NOT NULL CONSTRAINT DF_OperationCosts_currency DEFAULT (N'USD'),
        documentNumber NVARCHAR(80) NULL,
        observations NVARCHAR(500) NULL,
        status NVARCHAR(20) NOT NULL CONSTRAINT DF_OperationCosts_status DEFAULT (N'PENDING'),
        costResponsibility NVARCHAR(20) NOT NULL CONSTRAINT DF_OperationCosts_costResponsibility DEFAULT (N'COMPANY'),
        customerPaymentStatus NVARCHAR(20) NOT NULL CONSTRAINT DF_OperationCosts_customerPaymentStatus DEFAULT (N'UNPAID'),
        createdBy INT NULL,
        updatedBy INT NULL,
        createdAt DATETIME2(7) NOT NULL CONSTRAINT DF_OperationCosts_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt DATETIME2(7) NOT NULL CONSTRAINT DF_OperationCosts_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_OperationCosts PRIMARY KEY CLUSTERED (id),
        CONSTRAINT FK_OperationCosts_Operations FOREIGN KEY (operationId) REFERENCES dbo.Operations(id) ON DELETE CASCADE,
        CONSTRAINT FK_OperationCosts_OperationBooking FOREIGN KEY (bookingId) REFERENCES dbo.OperationBooking(id),
        CONSTRAINT FK_OperationCosts_QuotationCharges FOREIGN KEY (quotationChargeId) REFERENCES dbo.QuotationCharges(id)
    );
END
GO

IF COL_LENGTH(N'dbo.OperationCosts', N'bookingId') IS NULL ALTER TABLE dbo.OperationCosts ADD bookingId INT NULL;
GO
IF COL_LENGTH(N'dbo.OperationCosts', N'quotationChargeId') IS NULL ALTER TABLE dbo.OperationCosts ADD quotationChargeId INT NULL;
GO
IF COL_LENGTH(N'dbo.OperationCosts', N'costScope') IS NULL ALTER TABLE dbo.OperationCosts ADD costScope NVARCHAR(20) NOT NULL CONSTRAINT DF_OperationCosts_costScope DEFAULT (N'OPERATION');
GO
IF COL_LENGTH(N'dbo.OperationCosts', N'chargeSection') IS NULL ALTER TABLE dbo.OperationCosts ADD chargeSection NVARCHAR(50) NULL;
GO
IF COL_LENGTH(N'dbo.OperationCosts', N'concept') IS NULL ALTER TABLE dbo.OperationCosts ADD concept NVARCHAR(200) NOT NULL CONSTRAINT DF_OperationCosts_concept DEFAULT (N'Sin concepto');
GO
IF COL_LENGTH(N'dbo.OperationCosts', N'provider') IS NULL ALTER TABLE dbo.OperationCosts ADD provider NVARCHAR(180) NULL;
GO
IF COL_LENGTH(N'dbo.OperationCosts', N'estimatedCost') IS NULL ALTER TABLE dbo.OperationCosts ADD estimatedCost DECIMAL(18,2) NOT NULL CONSTRAINT DF_OperationCosts_estimatedCost DEFAULT (0);
GO
IF COL_LENGTH(N'dbo.OperationCosts', N'realCost') IS NULL ALTER TABLE dbo.OperationCosts ADD realCost DECIMAL(18,2) NOT NULL CONSTRAINT DF_OperationCosts_realCost DEFAULT (0);
GO
IF COL_LENGTH(N'dbo.OperationCosts', N'saleAmount') IS NULL ALTER TABLE dbo.OperationCosts ADD saleAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_OperationCosts_saleAmount DEFAULT (0);
GO
IF COL_LENGTH(N'dbo.OperationCosts', N'estimatedProfit') IS NULL ALTER TABLE dbo.OperationCosts ADD estimatedProfit AS (saleAmount - estimatedCost) PERSISTED;
GO
IF COL_LENGTH(N'dbo.OperationCosts', N'realProfit') IS NULL ALTER TABLE dbo.OperationCosts ADD realProfit AS (saleAmount - realCost) PERSISTED;
GO
IF COL_LENGTH(N'dbo.OperationCosts', N'currency') IS NULL ALTER TABLE dbo.OperationCosts ADD currency NVARCHAR(3) NOT NULL CONSTRAINT DF_OperationCosts_currency DEFAULT (N'USD');
GO
IF COL_LENGTH(N'dbo.OperationCosts', N'documentNumber') IS NULL ALTER TABLE dbo.OperationCosts ADD documentNumber NVARCHAR(80) NULL;
GO
IF COL_LENGTH(N'dbo.OperationCosts', N'observations') IS NULL ALTER TABLE dbo.OperationCosts ADD observations NVARCHAR(500) NULL;
GO
IF COL_LENGTH(N'dbo.OperationCosts', N'status') IS NULL ALTER TABLE dbo.OperationCosts ADD status NVARCHAR(20) NOT NULL CONSTRAINT DF_OperationCosts_status DEFAULT (N'PENDING');
GO
IF COL_LENGTH(N'dbo.OperationCosts', N'costResponsibility') IS NULL ALTER TABLE dbo.OperationCosts ADD costResponsibility NVARCHAR(20) NOT NULL CONSTRAINT DF_OperationCosts_costResponsibility DEFAULT (N'COMPANY');
GO
IF COL_LENGTH(N'dbo.OperationCosts', N'customerPaymentStatus') IS NULL ALTER TABLE dbo.OperationCosts ADD customerPaymentStatus NVARCHAR(20) NOT NULL CONSTRAINT DF_OperationCosts_customerPaymentStatus DEFAULT (N'UNPAID');
GO
IF COL_LENGTH(N'dbo.OperationCosts', N'createdBy') IS NULL ALTER TABLE dbo.OperationCosts ADD createdBy INT NULL;
GO
IF COL_LENGTH(N'dbo.OperationCosts', N'updatedBy') IS NULL ALTER TABLE dbo.OperationCosts ADD updatedBy INT NULL;
GO
IF COL_LENGTH(N'dbo.OperationCosts', N'createdAt') IS NULL ALTER TABLE dbo.OperationCosts ADD createdAt DATETIME2(7) NOT NULL CONSTRAINT DF_OperationCosts_createdAt DEFAULT (SYSUTCDATETIME());
GO
IF COL_LENGTH(N'dbo.OperationCosts', N'updatedAt') IS NULL ALTER TABLE dbo.OperationCosts ADD updatedAt DATETIME2(7) NOT NULL CONSTRAINT DF_OperationCosts_updatedAt DEFAULT (SYSUTCDATETIME());
GO

IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_OperationCosts_OperationBooking')
    ALTER TABLE dbo.OperationCosts WITH NOCHECK ADD CONSTRAINT FK_OperationCosts_OperationBooking FOREIGN KEY (bookingId) REFERENCES dbo.OperationBooking(id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.foreign_keys WHERE name = N'FK_OperationCosts_QuotationCharges')
    ALTER TABLE dbo.OperationCosts WITH NOCHECK ADD CONSTRAINT FK_OperationCosts_QuotationCharges FOREIGN KEY (quotationChargeId) REFERENCES dbo.QuotationCharges(id);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.OperationCosts') AND name = N'IX_OperationCosts_bookingId')
    CREATE INDEX IX_OperationCosts_bookingId ON dbo.OperationCosts (bookingId, costScope);
GO
IF NOT EXISTS (SELECT 1 FROM sys.indexes WHERE object_id = OBJECT_ID(N'dbo.OperationCosts') AND name = N'UX_OperationCosts_quotationChargeId')
    CREATE UNIQUE INDEX UX_OperationCosts_quotationChargeId ON dbo.OperationCosts (quotationChargeId) WHERE quotationChargeId IS NOT NULL;
GO

IF OBJECT_ID(N'dbo.CommercialCommissions', N'U') IS NULL
BEGIN
    CREATE TABLE dbo.CommercialCommissions (
        id INT IDENTITY(1,1) NOT NULL,
        operationId INT NOT NULL,
        commercialUserId INT NOT NULL,
        commissionPercentage DECIMAL(9,4) NOT NULL CONSTRAINT DF_CommercialCommissions_commissionPercentage DEFAULT (0),
        baseProfit DECIMAL(18,2) NOT NULL CONSTRAINT DF_CommercialCommissions_baseProfit DEFAULT (0),
        commissionAmount DECIMAL(18,2) NOT NULL CONSTRAINT DF_CommercialCommissions_commissionAmount DEFAULT (0),
        status NVARCHAR(20) NOT NULL CONSTRAINT DF_CommercialCommissions_status DEFAULT (N'PENDING'),
        calculatedAt DATETIME2(7) NOT NULL CONSTRAINT DF_CommercialCommissions_calculatedAt DEFAULT (SYSUTCDATETIME()),
        paidAt DATETIME2(7) NULL,
        createdBy INT NULL,
        updatedBy INT NULL,
        createdAt DATETIME2(7) NOT NULL CONSTRAINT DF_CommercialCommissions_createdAt DEFAULT (SYSUTCDATETIME()),
        updatedAt DATETIME2(7) NOT NULL CONSTRAINT DF_CommercialCommissions_updatedAt DEFAULT (SYSUTCDATETIME()),
        CONSTRAINT PK_CommercialCommissions PRIMARY KEY CLUSTERED (id),
        CONSTRAINT UX_CommercialCommissions_operationId UNIQUE (operationId),
        CONSTRAINT FK_CommercialCommissions_Operations FOREIGN KEY (operationId) REFERENCES dbo.Operations(id) ON DELETE CASCADE,
        CONSTRAINT FK_CommercialCommissions_CommercialUser FOREIGN KEY (commercialUserId) REFERENCES dbo.Users(id)
    );
END
GO

SELECT item, missingCount
FROM (
    SELECT N'Customers credit columns' AS item, COUNT(1) AS missingCount
    FROM (VALUES (N'creditEnabled'), (N'creditLimit'), (N'creditCurrency'), (N'creditDays'), (N'creditNotes')) AS c(name)
    WHERE COL_LENGTH(N'dbo.Customers', c.name) IS NULL
    UNION ALL
    SELECT N'Quotations current columns', COUNT(1)
    FROM (VALUES (N'grossWeight'), (N'volume'), (N'pricingUserId'), (N'pricingSubmittedAt'), (N'sentToCustomerAt'), (N'customerApprovedAt')) AS c(name)
    WHERE COL_LENGTH(N'dbo.Quotations', c.name) IS NULL
    UNION ALL
    SELECT N'OperationCosts current columns', COUNT(1)
    FROM (VALUES (N'bookingId'), (N'costScope'), (N'chargeSection'), (N'costResponsibility'), (N'customerPaymentStatus')) AS c(name)
    WHERE COL_LENGTH(N'dbo.OperationCosts', c.name) IS NULL
) AS checks;
GO
