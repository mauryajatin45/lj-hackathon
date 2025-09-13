class TimeUtils {
  static getCurrentTimestamp() {
    return new Date().toISOString();
  }

  static formatDate(date, format = 'iso') {
    const d = new Date(date);
    
    switch (format) {
      case 'iso':
        return d.toISOString();
      case 'human':
        return d.toLocaleString();
      case 'date':
        return d.toLocaleDateString();
      case 'time':
        return d.toLocaleTimeString();
      default:
        return d.toISOString();
    }
  }

  static getTimeAgo(timestamp) {
    const now = new Date();
    const past = new Date(timestamp);
    const diffInSeconds = Math.floor((now - past) / 1000);

    if (diffInSeconds < 60) {
      return `${diffInSeconds} seconds ago`;
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes} minutes ago`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours} hours ago`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      return `${diffInDays} days ago`;
    }

    const diffInMonths = Math.floor(diffInDays / 30);
    if (diffInMonths < 12) {
      return `${diffInMonths} months ago`;
    }

    const diffInYears = Math.floor(diffInMonths / 12);
    return `${diffInYears} years ago`;
  }

  static isExpired(timestamp, ttlSeconds) {
    const now = new Date();
    const target = new Date(timestamp);
    return (now - target) > (ttlSeconds * 1000);
  }

  static addSeconds(seconds) {
    const date = new Date();
    date.setSeconds(date.getSeconds() + seconds);
    return date;
  }

  static addMinutes(minutes) {
    return this.addSeconds(minutes * 60);
  }

  static addHours(hours) {
    return this.addMinutes(hours * 60);
  }
}

module.exports = TimeUtils;