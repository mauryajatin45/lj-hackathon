const { ZodError } = require('zod');
const authService = require('../services/auth.service');
const { loginSchema, registerSchema } = require('../middleware/validate');
const { logger } = require('../config/logger');

const register = async (req, res) => {
  try {
    const validated = registerSchema.parse(req.body);

    const result = await authService.registerUser(
      validated.email,
      validated.password
    );

    res.status(201).json({
      token: result.token,
      user: { email: result.user.email }
    });

  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    if (error.message === 'User already exists') {
      return res.status(409).json({ error: error.message });
    }

    logger.error('Registration error:', error);
    res.status(500).json({ error: error.message || 'Registration failed' });
  }
};

const login = async (req, res) => {
  try {
    const validated = loginSchema.parse(req.body);

    const result = await authService.loginUser(
      validated.email,
      validated.password
    );

    res.json({
      token: result.token,
      user: { email: result.user.email }
    });

  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }

    if (error.message === 'Invalid credentials') {
      return res.status(401).json({ error: error.message });
    }

    logger.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
};

const getCurrentUser = async (req, res) => {
  try {
    res.json({ email: req.user.email });
  } catch (error) {
    logger.error('Get current user error:', error);
    res.status(500).json({ error: 'Failed to get user information' });
  }
};

module.exports = { register, login, getCurrentUser };