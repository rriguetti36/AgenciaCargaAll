const { poolPromise, sql } = require('../config/db');

async function migrateAddRoleColumn() {
  try {
    const pool = await poolPromise;
    
    // Verificar si la columna ya existe
    const checkColumn = await pool.request().query(`
      SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_NAME = 'Users' AND COLUMN_NAME = 'role'
    `);

    if (checkColumn.recordset.length === 0) {
      // Agregar columna role si no existe
      await pool.request().query(`
        ALTER TABLE Users ADD role NVARCHAR(20) DEFAULT 'user'
      `);
      console.log('✓ Columna role agregada a tabla Users');
    } else {
      console.log('✓ Columna role ya existe en tabla Users');
    }

    await pool.request().query(`
      IF EXISTS (
        SELECT 1
        FROM sys.check_constraints
        WHERE parent_object_id = OBJECT_ID(N'dbo.Users')
          AND name = N'CK_Users_role'
      )
      BEGIN
        ALTER TABLE dbo.Users DROP CONSTRAINT CK_Users_role;
      END;

      ALTER TABLE dbo.Users WITH CHECK ADD CONSTRAINT CK_Users_role
        CHECK (role IN (N'user', N'admin', N'customer_service', N'operativo', N'asesor', N'pricing'));
    `);
  } catch (err) {
    console.error('Error en migración:', err.message);
  }
}

// Ejecutar al iniciar
migrateAddRoleColumn();

module.exports = { migrateAddRoleColumn };
