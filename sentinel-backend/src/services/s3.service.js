const { S3Client, PutObjectCommand, GetObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const { AWS_REGION, S3_BUCKET } = require('../config/env');
const { logger } = require('../config/logger');

const s3Client = new S3Client({
  region: AWS_REGION,
});

class S3Service {
  constructor() {
    this.bucket = S3_BUCKET;
  }

  async uploadFile(file, userId, fileType) {
    try {
      const fileExtension = path.extname(file.originalname);
      const key = this.generateKey(userId, fileType, fileExtension);
      
      const command = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
        ContentDisposition: 'inline',
        Metadata: {
          userId: userId.toString(),
          originalName: file.originalname,
          uploadedAt: new Date().toISOString()
        }
      });

      await s3Client.send(command);

      return {
        bucket: this.bucket,
        key,
        mimeType: file.mimetype,
        size: file.size
      };
    } catch (error) {
      logger.error('S3 upload error:', error);
      throw new Error('Failed to upload file to S3');
    }
  }

  async getSignedUrl(key, expiresIn = 3600) {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucket,
        Key: key
      });

      return await getSignedUrl(s3Client, command, { expiresIn });
    } catch (error) {
      logger.error('S3 signed URL error:', error);
      throw new Error('Failed to generate signed URL');
    }
  }

  generateKey(userId, fileType, extension) {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, '0');
    const day = String(now.getDate()).padStart(2, '0');
    const uuid = uuidv4();
    
    return `${userId}/${year}/${month}/${day}/${uuid}${extension}`;
  }

  // For AI/ML server access (longer expiration)
  async getAISignedUrl(key) {
    return this.getSignedUrl(key, 3600); // 1 hour
  }

  // For frontend access (shorter expiration)
  async getFrontendSignedUrl(key) {
    return this.getSignedUrl(key, 900); // 15 minutes
  }
}

module.exports = new S3Service();