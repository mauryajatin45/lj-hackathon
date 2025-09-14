const multer = require('multer');
const { ZodError } = require('zod');

const Submission = require('../models/Submission');
const Report = require('../models/Report');
const s3Service = require('../services/s3.service');
const aiService = require('../services/ai.service');
const sseService = require('../services/sse.service');
const { submissionSchema, fileUploadSchema } = require('../middleware/validate');
const { MAX_FILE_SIZE, AWS_REGION, S3_BUCKET } = require('../config/env');
const { logger } = require('../config/logger');

/* ---------- helpers ---------- */
function buildS3ObjectUrl(key) {
  // Canonical virtual-hosted style (private buckets still require signed URLs to read)
  return `https://${S3_BUCKET}.s3.${AWS_REGION}.amazonaws.com/${encodeURIComponent(key)}`;
}

/* ---------- multer ---------- */
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (req, file, cb) => {
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/mpeg', 'video/quicktime',
      'application/pdf', 'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'audio/mpeg', 'audio/wav', 'audio/ogg'
    ];
    if (allowedMimes.includes(file.mimetype)) return cb(null, true);
    return cb(new Error('Invalid file type'), false);
  }
}).single('file');

/* ---------- TEXT SUBMISSION ---------- */
const handleTextSubmission = async (req, res) => {
  try {
    const validated = submissionSchema.parse({
      ...req.body,
      userId: req.user._id.toString()
    });

    const submission = new Submission({
      userId: req.user._id,
      channel: validated.channel,
      contentText: validated.content,
      sender: validated.sender,
      subject: validated.subject,
      status: 'SUBMITTED'
    });

    await submission.save();

    // SSE: created
    sseService.sendToUser(req.user._id.toString(), 'submission_created', {
      submissionId: submission._id,
      createdAt: submission.createdAt,
      channel: submission.channel
    });

    // SSE: analysis started
    sseService.sendToUser(req.user._id.toString(), 'analysis_started', {
      submissionId: submission._id
    });

    // Try AI dispatch (non-fatal to the request)
    try {
      const aiResult = await aiService.analyzeText(
        submission._id.toString(),
        validated.content,
        { sender: validated.sender, subject: validated.subject, channel: validated.channel }
      );

      // Create report
      const report = new Report({
        submissionId: submission._id,
        suspicious: aiResult.is_spam,
        riskScore: aiResult.probability,
        reasons: aiResult.is_spam ? ['Detected as spam'] : [],
        raw: aiResult
      });
      await report.save();

      submission.status = 'COMPLETED';
      submission.report = report._id;
      await submission.save();

      // SSE: report ready
      sseService.sendToUser(req.user._id.toString(), 'report_ready', {
        submissionId: submission._id,
        suspicious: report.suspicious,
        riskScore: report.riskScore,
        reasons: report.reasons
      });

    } catch (aiError) {
      logger.error({ err: aiError, message: aiError?.message, stack: aiError?.stack }, 'AI dispatch error (text)');
      submission.status = 'QUEUED'; // can be retried
      submission.lastError = aiError.message;
      await submission.save({ validateBeforeSave: false });

      sseService.sendToUser(req.user._id.toString(), 'error', {
        submissionId: submission._id,
        message: 'Analysis dispatch failed; queued for retry'
      });
    }

    return res.status(201).json({
      submissionId: submission._id,
      status: submission.status
    });

  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({ error: 'Validation failed', details: error.errors });
    }
    logger.error({ err: error, message: error?.message, stack: error?.stack }, 'Text submission error');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/* ---------- FILE SUBMISSION ---------- */
const handleFileSubmission = async (req, res) => {
  upload(req, res, async (err) => {
    try {
      // Multer errors
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'File too large' });
        }
        return res.status(400).json({ error: err.message || 'Upload error' });
      }

      // Auth guard
      if (!req.user || !req.user._id) {
        return res.status(401).json({ error: 'Unauthorized' });
      }

      // File presence
      if (!req.file) {
        return res.status(400).json({ error: 'File is required' });
      }

      // Normalize body keys (fix "type " etc.)
      const trimmedBody = {};
      for (const k of Object.keys(req.body || {})) trimmedBody[k.trim()] = req.body[k];
      if (!trimmedBody.type && trimmedBody.kind) trimmedBody.type = trimmedBody.kind;

      // Zod validate
      const validated = fileUploadSchema.parse({
        ...trimmedBody,
        userId: req.user._id.toString(),
        file: req.file
      });

      // Create submission in "UPLOADING"
      const submission = new Submission({
        userId: req.user._id,
        channel: validated.type, // 'image' | 'video' | 'document' | 'audio'
        status: 'UPLOADING'
      });
      await submission.save();

      /* ---- S3 upload block ---- */
      let attachment;
      try {
        const s3Data = await s3Service.uploadFile(
          req.file,
          req.user._id.toString(),
          validated.type
        );

        // Build canonical object URL (non-signed)
        const objectUrl = s3Service.objectUrl
          ? s3Service.objectUrl(s3Data.key)
          : buildS3ObjectUrl(s3Data.key);

        // Build a VALID attachment (schema requires `type`)
        attachment = {
          key: s3Data.key,
          bucket: s3Data.bucket || S3_BUCKET,
          mimeType: s3Data.mimeType || req.file.mimetype,
          size: s3Data.size ?? req.file.size,
          originalName: s3Data.originalName || req.file.originalname,
          type: validated.type,
          url: objectUrl
        };

        submission.attachments = [attachment];
        submission.status = 'UPLOADED';
        await submission.save();

      } catch (uploadErr) {
        logger.error({ err: uploadErr, message: uploadErr?.message, stack: uploadErr?.stack }, 'S3 upload error');
        submission.status = 'ERROR';
        submission.lastError = uploadErr?.message || 'S3 upload failed';
        await submission.save({ validateBeforeSave: false });

        sseService.sendToUser(req.user._id.toString(), 'error', {
          submissionId: submission._id,
          message: 'File upload failed'
        });

        return res.status(500).json({ error: 'File upload failed' });
      }

      // SSE: created
      sseService.sendToUser(req.user._id.toString(), 'submission_created', {
        submissionId: submission._id,
        createdAt: submission.createdAt,
        channel: submission.channel
      });

      // Respond immediately to client so dialog can close
      res.status(201).json({
        submissionId: submission._id,
        status: submission.status
      });

      // Dispatch AI analysis asynchronously (do not await)
      (async () => {
        try {
          // Use a PRE-SIGNED URL for AI (private bucket)
          const signedUrl = await s3Service.getAISignedUrl(attachment.key);

          // SSE: analysis started
          sseService.sendToUser(req.user._id.toString(), 'analysis_started', {
            submissionId: submission._id
          });

          const aiResult = await aiService.analyzeFile(
            submission._id.toString(),
            signedUrl,
            attachment.mimeType,
            attachment.size,
            { channel: validated.type }
          );

          // Create report
          const report = new Report({
            submissionId: submission._id,
            suspicious: aiResult.suspicious,
            riskScore: aiResult.riskScore,
            reasons: aiResult.reasons,
            raw: aiResult.raw
          });
          await report.save();

          submission.status = 'COMPLETED';
          submission.report = report._id;
          await submission.save();

          // SSE: report ready
          sseService.sendToUser(req.user._id.toString(), 'report_ready', {
            submissionId: submission._id,
            suspicious: report.suspicious,
            riskScore: report.riskScore,
            reasons: report.reasons
          });

        } catch (aiErr) {
          logger.error({ err: aiErr, message: aiErr?.message, stack: aiErr?.stack }, 'AI file analysis error');

          submission.status = 'ERROR';
          submission.lastError = aiErr?.message || 'Failed to analyze file with AI service';
          await submission.save({ validateBeforeSave: false });

          sseService.sendToUser(req.user._id.toString(), 'error', {
            submissionId: submission._id,
            message: 'Analysis failed'
          });
        }
      })();

    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({ error: 'Validation failed', details: error.errors });
      }
      logger.error({ err: error, message: error?.message, stack: error?.stack }, 'File submission error');
      return res.status(500).json({ error: 'Internal server error' });
    }
  });
};

/* ---------- LIST ---------- */
const getSubmissions = async (req, res) => {
  try {
    const {
      page = 1,
      limit = 20,
      channel,
      riskMin,
      riskMax,
      from,
      to,
      query
    } = req.query;

    const filter = { userId: req.user._id };

    if (channel) filter.channel = channel;
    if (from || to) {
      filter.createdAt = {};
      if (from) filter.createdAt.$gte = new Date(from);
      if (to) filter.createdAt.$lte = new Date(to);
    }

    const submissions = await Submission.find(filter)
      .populate('report')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Add short-lived signed URLs and ensure canonical url exists
    const submissionsWithUrls = await Promise.all(
      submissions.map(async (doc) => {
        const s = doc.toObject();
        if (s.attachments?.length) {
          for (const att of s.attachments) {
            try {
              att.signedUrl = await s3Service.getFrontendSignedUrl(att.key); // short TTL for UI
              if (!att.url) att.url = buildS3ObjectUrl(att.key);
            } catch (err) {
              logger.error({ err, message: err?.message }, 'Error generating signed URL');
              att.signedUrl = null;
            }
          }
        }
        return s;
      })
    );

    const total = await Submission.countDocuments(filter);

    return res.json({
      submissions: submissionsWithUrls,
      pagination: {
        page: Number(page),
        limit: Number(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error({ err: error, message: error?.message, stack: error?.stack }, 'Get submissions error');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/* ---------- GET ONE ---------- */
const getSubmission = async (req, res) => {
  try {
    const { id } = req.params;

    const submission = await Submission.findOne({
      _id: id,
      userId: req.user._id
    }).populate({
      path: 'report',
      strictPopulate: false
    });

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const s = submission.toObject();
    if (s.attachments?.length) {
      for (const att of s.attachments) {
        try {
          att.signedUrl = await s3Service.getFrontendSignedUrl(att.key);
          if (!att.url) att.url = buildS3ObjectUrl(att.key);
        } catch (err) {
          logger.error({ err, message: err?.message }, 'Error generating signed URL');
          att.signedUrl = null;
        }
      }
    }

    return res.json(s);

  } catch (error) {
    logger.error({ err: error, message: error?.message, stack: error?.stack }, 'Get submission error');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/* ---------- PROCESS DOCUMENT ---------- */
const handleProcessDocument = async (req, res) => {
  try {
    const { file_url, doc_title = 'Untitled Document', doc_issuer, compact = true } = req.body;

    if (!file_url) {
      return res.status(400).json({ error: 'file_url is required' });
    }

    // Create submission
    const submission = new Submission({
      userId: req.user._id,
      channel: 'document',
      status: 'PROCESSING'
    });
    await submission.save();

    // Call AI service
    const aiResult = await aiService.processDocument(file_url, doc_title, doc_issuer, compact);

    // Create report
    const report = new Report({
      submissionId: submission._id,
      suspicious: !aiResult.legitimate,
      riskScore: 1 - aiResult.confidence_score, // Assuming higher confidence means lower risk
      reasons: aiResult.legitimate ? [] : ['Document verification failed'],
      raw: aiResult
    });
    await report.save();

    // Update submission
    submission.status = 'COMPLETED';
    submission.report = report._id;
    await submission.save();

    // SSE: report ready
    sseService.sendToUser(req.user._id.toString(), 'report_ready', {
      submissionId: submission._id,
      suspicious: report.suspicious,
      riskScore: report.riskScore,
      reasons: report.reasons
    });

    return res.json(aiResult);

  } catch (error) {
    logger.error({ err: error, message: error?.message, stack: error?.stack }, 'Process document error');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

/* ---------- DETECT SPAM ---------- */
const handleDetectSpam = async (req, res) => {
  try {
    const { text } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }

    // Create submission
    const submission = new Submission({
      userId: req.user._id,
      channel: 'text',
      contentText: text,
      status: 'PROCESSING'
    });
    await submission.save();
    console.log('Submission created:', submission._id);

    // SSE: analysis started
    sseService.sendToUser(req.user._id.toString(), 'analysis_started', {
      submissionId: submission._id
    });

    // Call AI service with submission._id as reference_id
    const aiResult = await aiService.detectSpam(text, submission._id.toString());
    console.log('AI result:', aiResult);

    // Create report
    const report = new Report({
      submissionId: submission._id,
      suspicious: aiResult.is_spam,
      riskScore: aiResult.probability,
      reasons: aiResult.is_spam ? ['Detected as spam'] : [],
      raw: aiResult
    });
    await report.save();
    console.log('Report created:', report._id);

    // Update submission
    submission.status = 'COMPLETED';
    submission.report = report._id;
    await submission.save();
    console.log('Submission updated:', submission._id);

    // SSE: report ready
    sseService.sendToUser(req.user._id.toString(), 'report_ready', {
      submissionId: submission._id,
      suspicious: report.suspicious,
      riskScore: report.riskScore,
      reasons: report.reasons
    });

    return res.json(aiResult);

  } catch (error) {
    logger.error({ err: error, message: error?.message, stack: error?.stack }, 'Detect spam error');
    return res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  handleTextSubmission,
  handleFileSubmission,
  getSubmissions,
  getSubmission,
  handleProcessDocument,
  handleDetectSpam
};
