// backend/src/validators/auth.js
const { AppError } = require('../middleware/errorHandler');

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function validateRegister(req, res, next) {
  const issues = [];
  const { email, fullName, password } = req.body || {};

  if (!fullName || typeof fullName !== 'string' || !fullName.trim()) {
    issues.push('fullName is required.');
  }
  if (!email || typeof email !== 'string' || !EMAIL_RE.test(email.trim())) {
    issues.push('email must be a valid email address.');
  }
  if (!password || typeof password !== 'string' || password.length < 8) {
    issues.push('password must be at least 8 characters long.');
  }

  if (issues.length > 0) {
    return next(new AppError(400, 'Validation failed.', { issues }));
  }
  return next();
}

function validateLogin(req, res, next) {
  const issues = [];
  const { email, password } = req.body || {};

  if (!email || typeof email !== 'string' || !email.trim()) {
    issues.push('email is required.');
  }
  if (!password || typeof password !== 'string' || password.length === 0) {
    issues.push('password is required.');
  }

  if (issues.length > 0) {
    return next(new AppError(400, 'Validation failed.', { issues }));
  }
  return next();
}

module.exports = { validateRegister, validateLogin };