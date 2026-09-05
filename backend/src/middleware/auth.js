// backend/src/middleware/auth.js
// Authenticates requests carrying a Bearer access token.
const { verifyToken } = require('../utils/jwt');
const { AppError } = require('./errorHandler');

function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  if (!header.startsWith('Bearer ')) {
    return next(new AppError(401, 'Missing access token.'));
  }

  const token = header.slice('Bearer '.length).trim();
  if (!token) {
    return next(new AppError(401, 'Missing access token.'));
  }

  try {
    const payload = verifyToken(token);
    req.user = { id: payload.sub, role: payload.role };
    return next();
  } catch (err) {
    return next(err);
  }
}

module.exports = { authenticate };