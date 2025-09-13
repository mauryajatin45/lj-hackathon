const mongoose = require('mongoose');

const timestampSchema = new mongoose.Schema({
  start: {
    type: Number,
    required: true
  },
  end: {
    type: Number,
    required: true
  },
  label: {
    type: String
  }
});

const reportSchema = new mongoose.Schema({
  submissionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Submission',
    required: true,
    unique: true
  },
  suspicious: {
    type: Boolean,
    required: true
  },
  riskScore: {
    type: Number,
    required: true,
    min: 0,
    max: 1
  },
  reasons: [{
    type: String
  }],
  timestamps: [timestampSchema],
  raw: {
    type: mongoose.Schema.Types.Mixed
  }
}, {
  timestamps: true
});

// Indexes
reportSchema.index({ createdAt: -1 });
reportSchema.index({ riskScore: 1 });

module.exports = mongoose.model('Report', reportSchema);