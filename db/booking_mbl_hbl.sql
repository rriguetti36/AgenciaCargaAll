SET ANSI_NULLS ON
GO
SET QUOTED_IDENTIFIER ON
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

