USE BD_AGEN_CARGA;
GO

IF COL_LENGTH(N'dbo.Users', N'phone') IS NULL
BEGIN
    ALTER TABLE dbo.Users ADD phone NVARCHAR(50) NULL;
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

ALTER TABLE dbo.Users
    ADD CONSTRAINT CK_Users_role CHECK (role IN (
        N'user',
        N'admin',
        N'customer_service',
        N'operativo',
        N'asesor',
        N'pricing'
    ));
GO

IF OBJECT_ID(N'dbo.Roles', N'U') IS NOT NULL
BEGIN
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
END
GO
