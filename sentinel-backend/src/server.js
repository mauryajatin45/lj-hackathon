const app = require('./app');
const { connectDB } = require('./config/db');
const { PORT, NODE_ENV } = require('./config/env');
const { logger } = require('./config/logger');

const { s3Client } = require('./config/s3');
const { ListBucketsCommand } = require('@aws-sdk/client-s3');

const startServer = async () => {
  try {
    await connectDB();

    // Test S3 connection by listing buckets
    try {
      await s3Client.send(new ListBucketsCommand({}));
      logger.info('AWS S3 connection successful');
    } catch (s3Error) {
      logger.error('AWS S3 connection failed:', s3Error.message);
    }
    
    const server = app.listen(PORT, () => {
      logger.info(`Server running in ${NODE_ENV} mode on port ${PORT}`);
    });

    // Graceful shutdown
    const gracefulShutdown = (signal) => {
      logger.info(`Received ${signal}, shutting down gracefully`);
      
      server.close(() => {
        logger.info('HTTP server closed');
        process.exit(0);
      });

      // Force close after 10 seconds
      setTimeout(() => {
        logger.error('Could not close connections in time, forcefully shutting down');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGINT', () => gracefulShutdown('SIGINT'));
    process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();