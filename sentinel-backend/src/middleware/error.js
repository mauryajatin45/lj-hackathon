const { ZodError } = require('zod');
const { logger } = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  let statusCode = err.statusCode || 500;
  let message = err.message || 'Internal Server Error';
  let details = null;

  // Zod validation errors
  if (err instanceof ZodError) {
    statusCode = 400;
    message = 'Validation failed';
    details = err.errors;
  }

  // MongoDB duplicate key error
  if (err.code === 11000) {
    statusCode = 409;
    message = 'Duplicate entry';
    const field = Object.keys(err.keyValue)[0];
    details = { [field]: `${field} already exists` };
  }

  // MongoDB validation error
  if (err.name === 'ValidationError') {
    statusCode = 400;
    message = 'Validation failed';
    details = Object.values(err.errors).map(e => ({
      field: e.path,
      message: e.message
    }));
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    statusCode = 401;
    message = 'Invalid token';
  }

  if (err.name === 'TokenExpiredError') {
    statusCode = 401;
    message = 'Token expired';
  }

  // Log unexpected errors
  if (statusCode >= 500) {
    logger.error('Server error:', {
      message: err.message,
      stack: err.stack,
      url: req.url,
      method: req.method
    });
  }

  // Don't expose internal errors in production
  if (statusCode >= 500 && process.env.NODE_ENV === 'production') {
    message = 'Internal Server Error';
    details = null;
  }

  res.status(statusCode).json({
    error: message,
    ...(details && { details })
  });
};

module.exports = errorHandler;