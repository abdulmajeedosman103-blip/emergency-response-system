// backend/src/controllers/authController.js
const { registerUser, loginUser } = require('../services/authService');

async function register(req, res) {
  const user = await registerUser(req.body, req.ip);
  res.status(201).json({ data: user });
}

async function login(req, res) {
  const result = await loginUser(req.body, req.ip);
  res.status(200).json({ data: result });
}

module.exports = { register, login };