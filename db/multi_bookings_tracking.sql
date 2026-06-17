USE BD_AGEN_CARGA;
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

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_TrackingEvents_OperationBooking'
)
BEGIN
    ALTER TABLE dbo.TrackingEvents
        ADD CONSTRAINT FK_TrackingEvents_OperationBooking
        FOREIGN KEY (bookingId) REFERENCES dbo.OperationBooking(id);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.OperationBooking')
      AND name = N'IX_OperationBooking_operationId'
)
BEGIN
    CREATE INDEX IX_OperationBooking_operationId
        ON dbo.OperationBooking (operationId, createdAt DESC, id DESC);
END
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.indexes
    WHERE object_id = OBJECT_ID(N'dbo.TrackingEvents')
      AND name = N'IX_TrackingEvents_operation_booking'
)
BEGIN
    CREATE INDEX IX_TrackingEvents_operation_booking
        ON dbo.TrackingEvents (operationId, bookingId, eventDate DESC, createdAt DESC);
END
GO
