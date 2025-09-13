const { logger } = require('../config/logger');

class SSEService {
  constructor() {
    this.clients = new Map(); // userId -> Set of response objects
  }

  addClient(userId, res) {
    if (!this.clients.has(userId)) {
      this.clients.set(userId, new Set());
    }
    
    const userClients = this.clients.get(userId);
    userClients.add(res);
    
    // Remove client when connection closes
    res.on('close', () => {
      this.removeClient(userId, res);
    });
    
    logger.info(`SSE client added for user ${userId}. Total clients: ${userClients.size}`);
  }

  removeClient(userId, res) {
    const userClients = this.clients.get(userId);
    if (userClients) {
      userClients.delete(res);
      if (userClients.size === 0) {
        this.clients.delete(userId);
      }
    }
    
    logger.info(`SSE client removed for user ${userId}`);
  }

  sendToUser(userId, event, data) {
    const userClients = this.clients.get(userId);
    if (!userClients) return;

    const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
    
    userClients.forEach(res => {
      try {
        res.write(message);
      } catch (error) {
        logger.error('Error sending SSE message:', error);
        this.removeClient(userId, res);
      }
    });
  }

  sendHeartbeat() {
    this.clients.forEach((clients, userId) => {
      const heartbeatData = { t: new Date().toISOString() };
      this.sendToUser(userId, 'heartbeat', heartbeatData);
    });
  }

  startHeartbeat(interval = 25000) {
    setInterval(() => {
      this.sendHeartbeat();
    }, interval);
  }
}

module.exports = new SSEService();