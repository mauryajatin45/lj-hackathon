const { logger } = require('../config/logger');

const sseMiddleware = (req, res, next) => {
  // Set SSE-specific headers
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  
  // Flush headers immediately
  res.flushHeaders();

  // Send initial connection message
  res.write('event: connected\ndata: {}\n\n');

  // Add heartbeat function to response
  res.heartbeat = () => {
    try {
      res.write(`event: heartbeat\ndata: {"t":"${new Date().toISOString()}"}\n\n`);
    } catch (error) {
      logger.warn('SSE heartbeat failed:', error);
    }
  };

  next();
};

module.exports = sseMiddleware;