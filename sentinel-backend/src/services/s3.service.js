// src/services/s3.service.js
const { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const { getSignedUrl } = require('@aws-sdk/s3-request-presigner');
const { v4: uuidv4 } = require('uuid');
const path = require('path');

const { AWS_REGION, S3_BUCKET } = require('../config/env');
const { logger } = require('../config/logger');

const s3Client = new S3Client({ region: AWS_REGION });

/** Build a canonical virtual-hosted–style object URL (non-signed). 
 * NOTE: Private buckets still require a presigned URL to read.
 */
function objectUrl(key) {
  // encodeURI keeps slashes but escapes unsafe chars
  return `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${encodeURI(key)}`;
}

/** Generate a predictable key layout: userId/YYYY/MM/DD/uuid.ext */
function generateKey(userId, fileType, extension) {
  const now = new Date();
  const year = now.getUTCFullYear();
  const month = String(now.getUTCMonth() + 1).padStart(2, '0');
  const day = String(now.getUTCDate()).padStart(2, '0');
  const uuid = uuidv4();
  // We don’t actually use `fileType` in the path here, but you can add it if you like.
  return `${userId}/${year}/${month}/${day}/${uuid}${extension}`;
}

class S3Service {
  constructor() {
    this.bucket = S3_BUCKET;
  }

  /**
   * Upload a file buffer to S3 (kept private).
   * Returns metadata you can persist in Mongo.
   * @param {object} file Multer file: { buffer, mimetype, size, originalname }
   * @param {string} userId
   * @param {'image'|'video'|'document'|'audio'} fileType
   */
  async uploadFile(file, userId, fileType) {
    try {
      const ext = path.extname(file.originalname) || '';
      const key = generateKey(userId, fileType, ext);
      const contentType = file.mimetype || 'application/octet-stream';

      const put = new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: file.buffer,
        ContentType: contentType,
        // Keep private; do not set ACL: 'public-read'
        ContentDisposition: 'inline',
        Metadata: {
          userId: String(userId),
          originalName: file.originalname,
          uploadedAt: new Date().toISOString(),
          fileType: String(fileType || '')
        }
      });

      await s3Client.send(put);

      // Return a rich object — your controller can drop this directly into attachments[0]
      return {
        bucket: this.bucket,
        key,
        mimeType: contentType,
        size: file.size,
        originalName: file.originalname,
        // Canonical S3 object URL (useful for audits). Access still requires signed URL.
        url: objectUrl(key)
      };
    } catch (error) {
      logger.error({ err: error, message: error?.message, stack: error?.stack }, 'S3 upload error');
      throw new Error('Failed to upload file to S3');
    }
  }

  /** Internal presign helper */
  async _getSignedUrl(key, expiresIn) {
    try {
      // Optional: sanity check the object exists — useful for debugging
      try {
        await s3Client.send(new HeadObjectCommand({ Bucket: this.bucket, Key: key }));
      } catch (headErr) {
        // Not always fatal (e.g., policy restrictions on HeadObject); continue to presign
        logger.warn({ err: headErr, key }, 'HeadObject failed before presign');
      }

      const get = new GetObjectCommand({ Bucket: this.bucket, Key: key });
      return await getSignedUrl(s3Client, get, { expiresIn });
    } catch (error) {
      logger.error({ err: error, message: error?.message, stack: error?.stack }, 'S3 signed URL error');
      throw new Error('Failed to generate signed URL');
    }
  }

  /** Pre-signed URL for AI/ML service (longer TTL; default 1 hour) */
  async getAISignedUrl(key, expiresIn = 3600) {
    return this._getSignedUrl(key, expiresIn);
  }

  /** Pre-signed URL for frontend consumption (shorter TTL; default 15 minutes) */
  async getFrontendSignedUrl(key, expiresIn = 900) {
    return this._getSignedUrl(key, expiresIn);
  }

  /** Exported so controllers can build canonical URL too if needed */
  objectUrl(key) {
    return objectUrl(key);
  }
}

module.exports = new S3Service();
