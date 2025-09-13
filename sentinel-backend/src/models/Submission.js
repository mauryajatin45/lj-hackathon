const mongoose = require('mongoose');

const attachmentSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['image', 'video', 'document', 'audio'],
    required: true
  },
  bucket: {
    type: String,
    required: true
  },
  key: {
    type: String,
    required: true
  },
  mimeType: {
    type: String,
    required: true
  },
  size: {
    type: Number,
    required: true
  }
});

const submissionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  channel: {
    type: String,
    enum: ['sms', 'email', 'chat', 'image', 'video', 'document', 'audio'],
    required: true
  },
  contentText: {
    type: String,
    maxlength: 2000,
    trim: true
  },
  attachments: [attachmentSchema],
  status: {
    type: String,
    enum: ['SUBMITTED', 'UPLOADING', 'UPLOADED', 'DISPATCHED', 'ANALYSIS_STARTED', 'REPORT_READY', 'ERROR'],
    default: 'SUBMITTED'
  },
  lastError: {
    type: String
  }
}, {
  timestamps: true
});

// Indexes
submissionSchema.index({ userId: 1, createdAt: -1 });
submissionSchema.index({ channel: 1 });
submissionSchema.index({ status: 1 });
submissionSchema.index({ updatedAt: -1 });

module.exports = mongoose.model('Submission', submissionSchema);