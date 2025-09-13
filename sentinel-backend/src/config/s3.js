const { S3Client } = require('@aws-sdk/client-s3');
const { AWS_REGION } = require('./env');

const s3Client = new S3Client({
  region: AWS_REGION,
  // credentials will be automatically loaded from environment variables
  // AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY
});

module.exports = { s3Client };