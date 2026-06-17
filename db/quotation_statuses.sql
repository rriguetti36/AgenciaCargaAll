USE BD_AGEN_CARGA;
GO

IF EXISTS (
    SELECT 1
    FROM sys.check_constraints
    WHERE parent_object_id = OBJECT_ID(N'dbo.Quotations')
      AND name = N'CK_Quotations_status'
)
BEGIN
    ALTER TABLE dbo.Quotations DROP CONSTRAINT CK_Quotations_status;
END
GO

ALTER TABLE dbo.Quotations
    ADD CONSTRAINT CK_Quotations_status CHECK (status IN (
        N'borrador',
        N'solicitada_pricing',
        N'pricing_completado',
        N'enviada',
        N'aceptada',
        N'rechazada'
    ));
GO
