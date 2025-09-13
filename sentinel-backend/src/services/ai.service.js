const axios = require('axios');
const { AI_BASE_URL, APP_BASE_URL } = require('../config/env');
const { logger } = require('../config/logger');

class AIService {
  constructor() {
    this.baseURL = AI_BASE_URL;
    this.callbackUrl = `${APP_BASE_URL}/api/webhooks/analysis`;
  }

  async analyzeText(submissionId, text, metadata = {}) {
    try {
      const payload = {
        submissionId,
        text,
        meta: metadata,
        callbackUrl: this.callbackUrl
      };

      const response = await axios.post(`${this.baseURL}/analyze/text`, payload, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      logger.error('AI text analysis error:', error);
      throw new Error('Failed to dispatch text analysis to AI service');
    }
  }

  async analyzeFile(submissionId, s3SignedUrl, mimeType, size, metadata = {}) {
    try {
      const payload = {
        submissionId,
        s3SignedUrl,
        mimeType,
        size,
        meta: metadata,
        callbackUrl: this.callbackUrl
      };

      const response = await axios.post(`${this.baseURL}/analyze/file`, payload, {
        timeout: 15000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      logger.error('AI file analysis error:', error);
      throw new Error('Failed to dispatch file analysis to AI service');
    }
  }
}

module.exports = new AIService();