require('dotenv').config();

const env = {
  PORT: process.env.PORT || 4000,
  NODE_ENV: process.env.NODE_ENV || 'development',
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/sentinel',
  JWT_SECRET: process.env.JWT_SECRET,
  CORS_ORIGIN: process.env.CORS_ORIGIN || 'http://localhost:5173',
  
  // AWS S3
  AWS_REGION: process.env.AWS_REGION,
  AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
  AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
  S3_BUCKET: process.env.S3_BUCKET,
  
  // AI/ML
  AI_BASE_URL: process.env.AI_BASE_URL,
  AI_WEBHOOK_SECRET: process.env.AI_WEBHOOK_SECRET,
  APP_BASE_URL: process.env.APP_BASE_URL || 'http://localhost:4000',
  
  // Rate limiting
  RATE_LIMIT_WINDOW_MS: parseInt(process.env.RATE_LIMIT_WINDOW_MS) || 60000,
  RATE_LIMIT_MAX_REQUESTS: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS) || 100,
  
  // File upload
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 50 * 1024 * 1024, // 50MB
  UPLOAD_TIMEOUT: parseInt(process.env.UPLOAD_TIMEOUT) || 300000, // 5 minutes
};

// Validate required environment variables
const required = ['JWT_SECRET', 'AWS_REGION', 'S3_BUCKET', 'AI_BASE_URL', 'AI_WEBHOOK_SECRET'];
required.forEach(key => {
  if (!env[key]) {
    throw new Error(`Environment variable ${key} is required`);
  }
});

module.exports = env;