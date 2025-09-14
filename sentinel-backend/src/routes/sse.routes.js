const express = require('express');
const { handleSSEConnection } = require('../controllers/sse.controller');
const authMiddleware = require('../middleware/auth');
const sseMiddleware = require('../middleware/sse');

const router = express.Router();

router.get('/reports', authMiddleware, handleSSEConnection);

// Test route without auth
router.get('/test', (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Credentials', 'true');
  res.flushHeaders();
  res.write('event: test\ndata: {"message": "SSE test"}\n\n');
  setTimeout(() => {
    res.end();
  }, 5000);
});

module.exports = router;