const { poolPromise, sql } = require('../config/db');

class UserModel {
  static async getAll() {
    const pool = await poolPromise;
    const result = await pool.request().query('SELECT id, name, email, phone, estado, role, commissionPercentage, createdAt, updatedAt FROM Users');
    return result.recordset;
  }

  static async getById(id) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .query('SELECT id, name, email, phone, estado, role, commissionPercentage, createdAt, updatedAt FROM Users WHERE id = @id');
    return result.recordset[0];
  }

  static async getByEmail(email) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('email', sql.NVarChar(150), email)
      .query('SELECT id, name, email, phone, password, estado, role, commissionPercentage FROM Users WHERE email = @email');
    return result.recordset[0];
  }

  static async create(user) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('name', sql.NVarChar(100), user.name)
      .input('email', sql.NVarChar(150), user.email)
      .input('phone', sql.NVarChar(50), user.phone || null)
      .input('password', sql.NVarChar(255), user.password)
      .input('estado', sql.Bit, user.estado ?? 1)
      .input('role', sql.NVarChar(20), user.role ?? 'user')
      .input('commissionPercentage', sql.Decimal(9, 4), user.commissionPercentage ?? 0)
      .query(
        'INSERT INTO Users (name, email, phone, password, estado, role, commissionPercentage) OUTPUT INSERTED.id, INSERTED.name, INSERTED.email, INSERTED.phone, INSERTED.role, INSERTED.commissionPercentage VALUES (@name, @email, @phone, @password, @estado, @role, @commissionPercentage)'
      );
    return result.recordset[0];
  }

  static async update(id, user) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .input('name', sql.NVarChar(100), user.name)
      .input('email', sql.NVarChar(150), user.email)
      .input('phone', sql.NVarChar(50), user.phone || null)
      .input('estado', sql.Bit, user.estado ?? 1)
      .input('role', sql.NVarChar(20), user.role ?? 'user')
      .input('commissionPercentage', sql.Decimal(9, 4), user.commissionPercentage ?? 0)
      .query(
        'UPDATE Users SET name = @name, email = @email, phone = @phone, estado = @estado, role = @role, commissionPercentage = @commissionPercentage WHERE id = @id; SELECT id, name, email, phone, estado, role, commissionPercentage, createdAt, updatedAt FROM Users WHERE id = @id'
      );
    return result.recordset[0];
  }

  static async updatePassword(id, password) {
    const pool = await poolPromise;
    const result = await pool
      .request()
      .input('id', sql.Int, id)
      .input('password', sql.NVarChar(255), password)
      .query(
        'UPDATE Users SET password = @password WHERE id = @id; SELECT id, name, email, phone, estado, role, commissionPercentage, createdAt, updatedAt FROM Users WHERE id = @id'
      );
    return result.recordset[0];
  }

  static async delete(id) {
    const pool = await poolPromise;
    await pool
      .request()
      .input('id', sql.Int, id)
      .query('DELETE FROM Users WHERE id = @id');
    return { deleted: true };
  }
}

module.exports = UserModel;
