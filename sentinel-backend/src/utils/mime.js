class MimeUtils {
  static allowedMimeTypes = {
    image: [
      'image/jpeg',
      'image/png',
      'image/gif',
      'image/webp',
      'image/svg+xml'
    ],
    video: [
      'video/mp4',
      'video/mpeg',
      'video/quicktime',
      'video/webm',
      'video/x-msvideo'
    ],
    document: [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'text/plain'
    ],
    audio: [
      'audio/mpeg',
      'audio/wav',
      'audio/ogg',
      'audio/webm',
      'audio/x-m4a'
    ]
  };

  static getCategoryFromMime(mimeType) {
    for (const [category, mimes] of Object.entries(this.allowedMimeTypes)) {
      if (mimes.includes(mimeType)) {
        return category;
      }
    }
    return null;
  }

  static isValidMimeType(mimeType, category = null) {
    if (category) {
      return this.allowedMimeTypes[category]?.includes(mimeType) || false;
    }
    
    return Object.values(this.allowedMimeTypes)
      .flat()
      .includes(mimeType);
  }

  static getExtensionFromMime(mimeType) {
    const mimeToExt = {
      'image/jpeg': '.jpg',
      'image/png': '.png',
      'image/gif': '.gif',
      'image/webp': '.webp',
      'image/svg+xml': '.svg',
      'video/mp4': '.mp4',
      'video/mpeg': '.mpeg',
      'video/quicktime': '.mov',
      'video/webm': '.webm',
      'video/x-msvideo': '.avi',
      'application/pdf': '.pdf',
      'application/msword': '.doc',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': '.docx',
      'application/vnd.ms-excel': '.xls',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': '.xlsx',
      'text/plain': '.txt',
      'audio/mpeg': '.mp3',
      'audio/wav': '.wav',
      'audio/ogg': '.ogg',
      'audio/webm': '.weba',
      'audio/x-m4a': '.m4a'
    };

    return mimeToExt[mimeType] || '';
  }
}

module.exports = MimeUtils;