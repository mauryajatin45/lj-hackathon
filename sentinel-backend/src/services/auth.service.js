const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { JWT_SECRET } = require('../config/env');
const { logger } = require('../config/logger');

class AuthService {
  async registerUser(email, password) {
    try {
      // Check if user already exists
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        throw new Error('User already exists');
      }

      // Create new user (password is hashed in pre-save middleware)
      const user = new User({ email });
      user.password = password;
      await user.save();

      // Generate JWT token
      const token = this.generateToken(user._id);

      return { user, token };
    } catch (error) {
      logger.error('Auth service - register error:', error);
      throw error;
    }
  }

  async loginUser(email, password) {
    try {
      // Find user by email
      const user = await User.findOne({ email });
      if (!user) {
        throw new Error('Invalid credentials');
      }

      // Check password
      const isValidPassword = await user.checkPassword(password);
      if (!isValidPassword) {
        throw new Error('Invalid credentials');
      }

      // Generate JWT token
      const token = this.generateToken(user._id);

      return { user, token };
    } catch (error) {
      logger.error('Auth service - login error:', error);
      throw error;
    }
  }

  generateToken(userId) {
    return jwt.sign(
      { userId: userId.toString() },
      JWT_SECRET,
      { expiresIn: '24h' }
    );
  }

  verifyToken(token) {
    try {
      return jwt.verify(token, JWT_SECRET);
    } catch (error) {
      throw new Error('Invalid token');
    }
  }
}

module.exports = new AuthService();