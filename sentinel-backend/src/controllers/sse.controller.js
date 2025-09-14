const sseService = require('../services/sse.service');
const { logger } = require('../config/logger');

const handleSSEConnection = (req, res) => {
  try {
    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('Access-Control-Allow-Origin', req.headers.origin || '*');
    res.setHeader('Access-Control-Allow-Credentials', 'true');

    // Flush headers
    res.flushHeaders();

    // Send initial connection message
    res.write('event: connection\ndata: {"status": "connected"}\n\n');

    // Add client to SSE service
    sseService.addClient(req.user._id.toString(), res);

    // Handle client disconnect
    req.on('close', () => {
      sseService.removeClient(req.user._id.toString(), res);
      res.end();
    });

    // Send immediate heartbeat
    sseService.sendToUser(req.user._id.toString(), 'heartbeat', {
      t: new Date().toISOString()
    });

  } catch (error) {
    logger.error('SSE connection error:', error);
    if (!res.headersSent) {
      res.status(500).json({ error: 'SSE connection failed' });
    }
  }
};

module.exports = { handleSSEConnection };