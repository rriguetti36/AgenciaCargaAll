const UserService = require('../services/UserService');

class AuthController {
  static async login(req, res, next) {
    try {
      const { email, password } = req.body;
      const user = await UserService.loginUser(email, password);
      res.json(user);
    } catch (err) {
      next(err);
    }
  }

  static async register(req, res, next) {
    try {
      const { name, email, password, estado } = req.body;
      const created = await UserService.createUser({ name, email, password, estado });
      res.status(201).json(created);
    } catch (err) {
      next(err);
    }
  }
}

module.exports = AuthController;
