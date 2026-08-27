-- Produccion: clientes visibles por asesor creador.
-- Ejecutar una vez antes de desplegar el backend con este cambio.

IF COL_LENGTH(N'dbo.Customers', N'createdBy') IS NULL
BEGIN
    ALTER TABLE dbo.Customers ADD createdBy INT NULL;
END;
GO

IF NOT EXISTS (
    SELECT 1
    FROM sys.foreign_keys
    WHERE name = N'FK_Customers_CreatedBy'
      AND parent_object_id = OBJECT_ID(N'dbo.Customers')
)
BEGIN
    ALTER TABLE dbo.Customers WITH CHECK
    ADD CONSTRAINT FK_Customers_CreatedBy
    FOREIGN KEY (createdBy) REFERENCES dbo.Users(id);
END;
GO
