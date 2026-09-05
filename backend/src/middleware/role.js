// backend/src/middleware/role.js
const { AppError } = require('./errorHandler');

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return next(new AppError(403, 'You do not have permission to perform this action.'));
    }
    return next();
  };
}

module.exports = { requireRole };