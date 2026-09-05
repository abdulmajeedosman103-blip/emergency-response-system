// backend/src/utils/jwt.js
const jwt = require('jsonwebtoken');
const env = require('../config/env');
const { AppError } = require('../middleware/errorHandler');

function signToken(payload) {
  return jwt.sign(payload, env.jwtSecret, { expiresIn: env.jwtExpiresIn });
}

function verifyToken(token) {
  try {
    return jwt.verify(token, env.jwtSecret);
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      throw new AppError(401, 'Access token has expired.');
    }
    throw new AppError(401, 'Invalid access token.');
  }
}

module.exports = { signToken, verifyToken };