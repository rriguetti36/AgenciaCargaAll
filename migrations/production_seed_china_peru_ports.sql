/*
    Produccion - Seed paises y puertos base
    Fecha: 2026-08-25

    Agrega:
    - China / Shanghai
    - Peru / Callao

    Script idempotente: puede correrse mas de una vez.
*/

PRINT 'Inicio seed paises y puertos base';
GO

MERGE dbo.Countries AS target
USING (VALUES
    (N'China', N'CN'),
    (N'Peru', N'PE')
) AS source (name, code)
ON target.name = source.name
WHEN MATCHED THEN UPDATE SET code = COALESCE(target.code, source.code), estado = 1
WHEN NOT MATCHED THEN INSERT (name, code) VALUES (source.name, source.code);
GO

MERGE dbo.Ports AS target
USING (
    SELECT country.id AS countryId, source.name, source.code, source.portType
    FROM (VALUES
        (N'China', N'Shanghai', N'CNSHA', N'maritimo'),
        (N'Peru', N'Callao', N'PECLL', N'maritimo')
    ) AS source (countryName, name, code, portType)
    INNER JOIN dbo.Countries AS country ON country.name = source.countryName
) AS source
ON target.countryId = source.countryId
   AND target.name = source.name
WHEN MATCHED THEN UPDATE SET code = COALESCE(target.code, source.code), portType = COALESCE(target.portType, source.portType), estado = 1
WHEN NOT MATCHED THEN INSERT (countryId, name, code, portType) VALUES (source.countryId, source.name, source.code, source.portType);
GO

PRINT 'Fin seed paises y puertos base';
GO
