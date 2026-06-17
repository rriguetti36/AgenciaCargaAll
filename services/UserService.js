const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const UserModel = require('../models/UserModel');

const allowedRoles = ['user', 'admin', 'customer_service', 'operativo', 'asesor', 'pricing'];

class UserService {
  static async getAllUsers() {
    return await UserModel.getAll();
  }

  static async getUserById(id) {
    const user = await UserModel.getById(id);
    if (!user) {
      const error = new Error('Usuario no encontrado');
      error.status = 404;
      throw error;
    }
    return user;
  }

  static async createUser(data) {
    if (!data.name || !data.email || !data.password) {
      const error = new Error('Los campos name, email y password son obligatorios');
      error.status = 400;
      throw error;
    }
    if (data.role && !allowedRoles.includes(data.role)) {
      const error = new Error('Rol no permitido');
      error.status = 400;
      throw error;
    }
    const hashed = await bcrypt.hash(data.password, 10);
    const created = await UserModel.create({
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      password: hashed,
      estado: data.estado ?? 1,
      role: data.role ?? 'user',
      commissionPercentage: Number(data.commissionPercentage || 0),
    });
    return created;
  }

  static async updateUser(id, data) {
    const existingUser = await UserModel.getById(id);
    if (!existingUser) {
      const error = new Error('Usuario no encontrado');
      error.status = 404;
      throw error;
    }
    if (!data.name || !data.email) {
      const error = new Error('Los campos name y email son obligatorios');
      error.status = 400;
      throw error;
    }
    if (data.role && !allowedRoles.includes(data.role)) {
      const error = new Error('Rol no permitido');
      error.status = 400;
      throw error;
    }
    return await UserModel.update(id, {
      name: data.name,
      email: data.email,
      phone: data.phone || null,
      estado: data.estado ?? existingUser.estado,
      role: data.role ?? existingUser.role,
      commissionPercentage: Number(data.commissionPercentage ?? existingUser.commissionPercentage ?? 0),
    });
  }

  static async changePassword(id, data) {
    const existingUser = await UserModel.getById(id);
    if (!existingUser) {
      const error = new Error('Usuario no encontrado');
      error.status = 404;
      throw error;
    }
    if (!data.password) {
      const error = new Error('La nueva contraseña es obligatoria');
      error.status = 400;
      throw error;
    }
    const hashed = await bcrypt.hash(data.password, 10);
    return await UserModel.updatePassword(id, hashed);
  }

  static async deleteUser(id) {
    const existingUser = await UserModel.getById(id);
    if (!existingUser) {
      const error = new Error('Usuario no encontrado');
      error.status = 404;
      throw error;
    }
    return await UserModel.delete(id);
  }

  static async loginUser(email, password) {
    if (!email || !password) {
      const error = new Error('Email y password son requeridos');
      error.status = 400;
      throw error;
    }
    const user = await UserModel.getByEmail(email);
    if (!user) {
      const error = new Error('Usuario no encontrado');
      error.status = 404;
      throw error;
    }
    if (!user.estado) {
      const error = new Error('Acceso denegado: usuario inactivo');
      error.status = 403;
      throw error;
    }
    const match = await bcrypt.compare(password, user.password);
    if (!match) {
      const error = new Error('Credenciales inválidas');
      error.status = 401;
      throw error;
    }
    const payload = { id: user.id, email: user.email, name: user.name, role: user.role || 'user' };
    const secret = process.env.JWT_SECRET || 'change_this_secret';
    const token = jwt.sign(payload, secret, { expiresIn: '1h' });
    return { id: user.id, name: user.name, email: user.email, role: user.role || 'user', token };
  }
}

module.exports = UserService;
