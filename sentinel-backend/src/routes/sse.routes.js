const express = require('express');
const { handleSSEConnection } = require('../controllers/sse.controller');
const authMiddleware = require('../middleware/auth');
const sseMiddleware = require('../middleware/sse');

const router = express.Router();

router.get('/reports', authMiddleware, sseMiddleware, handleSSEConnection);

module.exports = router;