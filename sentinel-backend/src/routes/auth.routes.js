const express = require('express');
const { register, login, getCurrentUser } = require('../controllers/auth.controller');
const authMiddleware = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/register', authLimiter, register);
router.post('/login', authLimiter, login);
router.get('/me', authMiddleware, getCurrentUser);

module.exports = router;