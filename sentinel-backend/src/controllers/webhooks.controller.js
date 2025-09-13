const { ZodError } = require('zod');
const reportService = require('../services/report.service');
const sseService = require('../services/sse.service');
const { webhookSchema } = require('../middleware/validate');
const Submission = require('../models/Submission');
const { logger } = require('../config/logger');

const handleAnalysisWebhook = async (req, res) => {
  try {
    const validated = webhookSchema.parse(req.body);

    const submission = await Submission.findById(validated.submissionId);
    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    // Update submission status based on webhook status
    submission.status = validated.status;
    if (validated.status === 'ERROR' && validated.note) {
      submission.lastError = validated.note;
    }
    await submission.save();

    // Handle different webhook statuses
    switch (validated.status) {
      case 'ANALYSIS_STARTED':
        sseService.sendToUser(submission.userId.toString(), 'analysis_started', {
          submissionId: submission._id
        });
        break;

      case 'ANALYSIS_UPDATE':
        sseService.sendToUser(submission.userId.toString(), 'analysis_update', {
          submissionId: submission._id,
          progress: validated.progress,
          note: validated.note
        });
        break;

      case 'REPORT_READY':
        const report = await reportService.createReport({
          submissionId: submission._id,
          suspicious: validated.suspicious,
          riskScore: validated.riskScore,
          reasons: validated.reasons,
          timestamps: validated.timestamps,
          raw: validated.raw
        });

        sseService.sendToUser(submission.userId.toString(), 'report_ready', {
          submissionId: submission._id,
          suspicious: report.suspicious,
          riskScore: report.riskScore,
          reasons: report.reasons,
          timestamps: report.timestamps
        });
        break;

      case 'ERROR':
        sseService.sendToUser(submission.userId.toString(), 'error', {
          submissionId: submission._id,
          message: validated.note || 'Analysis failed'
        });
        break;
    }

    res.status(200).json({ received: true });

  } catch (error) {
    if (error instanceof ZodError) {
      logger.warn('Webhook validation error:', error.errors);
      return res.status(400).json({
        error: 'Invalid webhook payload',
        details: error.errors
      });
    }

    logger.error('Webhook processing error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
};

module.exports = { handleAnalysisWebhook };