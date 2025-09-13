const axios = require('axios');

class HttpUtils {
  static createApiClient(baseURL, timeout = 10000) {
    return axios.create({
      baseURL,
      timeout,
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Sentinel-Backend/1.0.0'
      }
    });
  }

  static withRetry(apiCall, maxRetries = 3, baseDelay = 1000) {
    return async (...args) => {
      let lastError;
      
      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          return await apiCall(...args);
        } catch (error) {
          lastError = error;
          
          if (attempt === maxRetries) break;
          
          const delay = baseDelay * Math.pow(2, attempt - 1);
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
      
      throw lastError;
    };
  }

  static isTimeoutError(error) {
    return error.code === 'ECONNABORTED' || error.message.includes('timeout');
  }

  static isNetworkError(error) {
    return error.code === 'ENOTFOUND' || error.code === 'ECONNREFUSED';
  }
}

module.exports = HttpUtils;