const Submission = require('../models/Submission');
const s3Service = require('../services/s3.service');
const { logger } = require('../config/logger');

const getSignedUrl = async (req, res) => {
  try {
    const { submissionId, index } = req.params;
    const indexNum = parseInt(index);

    const submission = await Submission.findOne({
      _id: submissionId,
      userId: req.user._id
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    if (!submission.attachments || submission.attachments.length === 0) {
      return res.status(404).json({ error: 'No attachments found' });
    }

    if (indexNum < 0 || indexNum >= submission.attachments.length) {
      return res.status(400).json({ error: 'Invalid attachment index' });
    }

    const attachment = submission.attachments[indexNum];
    const signedUrl = await s3Service.getFrontendSignedUrl(attachment.key);

    res.json({
      signedUrl,
      expiresIn: 900 // 15 minutes in seconds
    });

  } catch (error) {
    logger.error('Get signed URL error:', error);
    res.status(500).json({ error: 'Failed to generate signed URL' });
  }
};

module.exports = { getSignedUrl };