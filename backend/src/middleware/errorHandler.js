// backend/src/middleware/errorHandler.js
const { Prisma } = require('@prisma/client');
const env = require('../config/env');

const STATUS_CODE_MAP = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  409: 'CONFLICT',
  422: 'UNPROCESSABLE_ENTITY',
  500: 'INTERNAL_ERROR',
  503: 'SERVICE_UNAVAILABLE',
};

class AppError extends Error {
  constructor(statusCode, message, details) {
    super(message);
    this.statusCode = statusCode;
    this.details = details;
    this.isOperational = true;
  }
}

function notFound(req, res) {
  res.status(404).json({
    error: {
      code: 'NOT_FOUND',
      message: `Route not found: ${req.method} ${req.originalUrl}`,
    },
  });
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  if (res.headersSent) {
    return next(err);
  }

  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let code = err.code;

  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    if (err.code === 'P2002') {
      statusCode = 409;
      code = 'UNIQUE_CONSTRAINT_VIOLATION';
      message = 'A record with this value already exists.';
    } else if (err.code === 'P2025') {
      statusCode = 404;
      code = 'RECORD_NOT_FOUND';
      message = 'The requested record does not exist.';
    } else if (err.code === 'P2003') {
      statusCode = 409;
      code = 'FOREIGN_KEY_VIOLATION';
      message = 'The request references a record that does not exist.';
    } else {
      statusCode = 400;
      code = 'PRISMA_ERROR';
      message = 'The request could not be processed.';
    }
  } else if (err instanceof Prisma.PrismaClientInitializationError) {
    statusCode = 503;
    code = 'DATABASE_UNAVAILABLE';
    message = 'The database is currently unavailable.';
  } else if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    statusCode = 400;
    code = 'INVALID_JSON';
    message = 'Request body contains invalid JSON.';
  }

  if (!code) {
    code = STATUS_CODE_MAP[statusCode] || 'INTERNAL_ERROR';
  }

  if (env.nodeEnv !== 'production') {
    console.error('[errorHandler]', err);
  }

  res.status(statusCode).json({
    error: {
      code,
      message,
      ...(err.details ? { details: err.details } : {}),
      ...(env.nodeEnv !== 'production' && err.stack ? { stack: err.stack } : {}),
    },
  });
}

module.exports = { AppError, notFound, errorHandler };