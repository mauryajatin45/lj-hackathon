const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const morgan = require('morgan');
const pinoHttp = require('pino-http');

const { CORS_ORIGIN, NODE_ENV } = require('./config/env');
const errorHandler = require('./middleware/error');
const routes = require('./routes');
const { logger } = require('./config/logger');
const { generalLimiter } = require('./middleware/rateLimit');
const sseService = require('./services/sse.service');

const app = express();

// Security middleware
app.use(helmet());

// CORS configuration
app.use(cors({
  origin: CORS_ORIGIN,
  credentials: true
}));

// Logging
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
} else {
  app.use(pinoHttp({ logger }));
}

// General rate limiting
app.use(generalLimiter);

// Body parsing
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Routes
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.status(200).json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Error handling
app.use(errorHandler);

// 404 handler
app.use('*', (req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Start SSE heartbeat
sseService.startHeartbeat(5000);

module.exports = app;