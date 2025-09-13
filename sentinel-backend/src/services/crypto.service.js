const crypto = require('crypto');
const { AI_WEBHOOK_SECRET } = require('../config/env');

class CryptoService {
  generateHMAC(payload, secret = AI_WEBHOOK_SECRET) {
    const hmac = crypto.createHmac('sha256', secret);
    return hmac.update(JSON.stringify(payload)).digest('hex');
  }

  verifyHMAC(payload, signature, secret = AI_WEBHOOK_SECRET) {
    const calculatedSignature = this.generateHMAC(payload, secret);
    return calculatedSignature === signature.replace('sha256=', '');
  }

  generateRandomString(length = 32) {
    return crypto.randomBytes(length).toString('hex');
  }

  hashString(input, algorithm = 'sha256') {
    return crypto.createHash(algorithm).update(input).digest('hex');
  }
}

module.exports = new CryptoService();