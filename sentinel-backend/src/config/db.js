const mongoose = require('mongoose');
const { MONGODB_URI, NODE_ENV } = require('./env');
const { logger } = require('./logger');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(MONGODB_URI);

    logger.info(`MongoDB Connected: ${conn.connection.host}`);
    
    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

  } catch (error) {
    logger.error('Error connecting to MongoDB:', error);
    process.exit(1);
  }
};

module.exports = { connectDB };