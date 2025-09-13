const jwt = require('jsonwebtoken');
const { JWT_SECRET } = require('../config/env');
const User = require('../models/User');
const { logger } = require('../config/logger');

const authMiddleware = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization token required' });
    }

    const token = authHeader.split(' ')[1];
    
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await User.findById(decoded.userId).select('-passwordHash');
      
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }

      req.user = user;
      next();
    } catch (jwtError) {
      return res.status(401).json({ error: 'Invalid or expired token' });
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = authMiddleware;