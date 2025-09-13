const { v4: uuidv4 } = require('uuid');
const { ObjectId } = require('mongoose').Types;

class IdUtils {
  static generateUUID() {
    return uuidv4();
  }

  static isValidObjectId(id) {
    return ObjectId.isValid(id) && new ObjectId(id).toString() === id;
  }

  static generateShortId(length = 8) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    
    for (let i = 0; i < length; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    
    return result;
  }

  static generateSubmissionId() {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substr(2, 5);
    return `sub_${timestamp}_${random}`;
  }
}

module.exports = IdUtils;