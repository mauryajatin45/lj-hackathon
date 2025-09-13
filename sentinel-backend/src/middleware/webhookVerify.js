const crypto = require('crypto');
const { AI_WEBHOOK_SECRET } = require('../config/env');
const { logger } = require('../config/logger');

const verifyWebhookSignature = (req, res, next) => {
  try {
    const signature = req.headers['x-signature'];
    
    if (!signature) {
      return res.status(401).json({ error: 'Missing signature header' });
    }

    // Extract the hex digest from the signature header
    const hexDigest = signature.replace('sha256=', '');
    
    // Calculate HMAC
    const hmac = crypto.createHmac('sha256', AI_WEBHOOK_SECRET);
    const calculatedDigest = hmac.update(JSON.stringify(req.body)).digest('hex');

    // Compare digests
    if (calculatedDigest !== hexDigest) {
      logger.warn('Invalid webhook signature', {
        received: hexDigest,
        calculated: calculatedDigest
      });
      return res.status(401).json({ error: 'Invalid signature' });
    }

    next();
  } catch (error) {
    logger.error('Webhook verification error:', error);
    res.status(500).json({ error: 'Signature verification failed' });
  }
};

module.exports = verifyWebhookSignature;