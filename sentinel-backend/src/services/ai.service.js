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
        text,
        reference_id: submissionId
      };

      const response = await axios.post(`${this.baseURL}/detect_spam`, payload, {
        timeout: 100000,
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
      const response = await this.processDocument(s3SignedUrl, `${metadata.channel || 'File'} Analysis`, null, true);

      const confidenceScore = parseFloat(response.confidence_score);
      let riskScore;
      if (isNaN(confidenceScore)) {
        riskScore = response.legitimate ? 0.2 : 0.8; // Default based on legitimate
      } else {
        // If legitimate, low risk; if not, high risk based on confidence
        riskScore = response.legitimate ? (1 - confidenceScore) : confidenceScore;
        riskScore = Math.max(0, Math.min(1, riskScore)); // Clamp between 0 and 1
      }

      return {
        suspicious: !response.legitimate,
        riskScore: riskScore,
        reasons: [],
        raw: response
      };
    } catch (error) {
      logger.error('AI file analysis error:', error);
      throw new Error('Failed to analyze file with AI service');
    }
  }

  async processDocument(fileUrl, docTitle = 'Untitled Document', docIssuer = null, compact = true) {
    try {
      // Add prefix to fileUrl if not present
      const prefix = 'https://sentinelassets.s3.ap-south-1.amazonaws.com/';
      let urlToSend = fileUrl;
      if (!fileUrl.startsWith(prefix)) {
        urlToSend = prefix + fileUrl;
      }

      const payload = new URLSearchParams();
      payload.append('file_url', urlToSend);
      payload.append('doc_title', docTitle);
      if (docIssuer) {
        payload.append('doc_issuer', docIssuer);
      }
      payload.append('compact', compact.toString());

      const response = await axios.post(`${this.baseURL}/process_document`, payload.toString(), {
        timeout: 120000, // Increased to 2 minutes for file analysis
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      });

      return response.data;
    } catch (error) {
      logger.error('AI process document error:', error);
      throw new Error('Failed to process document with AI service');
    }
  }

  async detectSpam(text, referenceId) {
    try {
      const payload = {
        text,
        reference_id: referenceId
      };

      const response = await axios.post(`${this.baseURL}/detect_spam`, payload, {
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      });

      return response.data;
    } catch (error) {
      logger.error('AI detect spam error:', error);
      throw new Error('Failed to detect spam with AI service');
    }
  }
}

module.exports = new AIService();
