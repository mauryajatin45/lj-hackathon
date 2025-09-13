const multer = require('multer');
const { ZodError } = require('zod');

const Submission = require('../models/Submission');
const s3Service = require('../services/s3.service');
const aiService = require('../services/ai.service');
const sseService = require('../services/sse.service');
const { submissionSchema, fileUploadSchema } = require('../middleware/validate');
const { MAX_FILE_SIZE } = require('../config/env');
const { logger } = require('../config/logger');

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: MAX_FILE_SIZE
  },
  fileFilter: (req, file, cb) => {
    // Basic MIME type validation
    const allowedMimes = [
      'image/jpeg', 'image/png', 'image/gif', 'image/webp',
      'video/mp4', 'video/mpeg', 'video/quicktime',
      'application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'audio/mpeg', 'audio/wav', 'audio/ogg'
    ];
    
    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'), false);
    }
  }
}).single('file');

const handleTextSubmission = async (req, res) => {
  try {
    const validated = submissionSchema.parse({
      ...req.body,
      userId: req.user._id
    });

    const submission = new Submission({
      userId: req.user._id,
      channel: validated.channel,
      contentText: validated.content,
      status: 'SUBMITTED'
    });

    await submission.save();

    // Emit SSE event
    sseService.sendToUser(req.user._id.toString(), 'submission_created', {
      submissionId: submission._id,
      createdAt: submission.createdAt,
      channel: submission.channel
    });

    // Dispatch to AI service
    try {
      await aiService.analyzeText(
        submission._id.toString(),
        validated.content,
        {
          sender: validated.sender,
          subject: validated.subject,
          channel: validated.channel
        }
      );
      
      submission.status = 'DISPATCHED';
      await submission.save();
      
    } catch (aiError) {
      logger.error('AI dispatch error:', aiError);
      submission.status = 'ERROR';
      submission.lastError = aiError.message;
      await submission.save();
      
      sseService.sendToUser(req.user._id.toString(), 'error', {
        submissionId: submission._id,
        message: 'Failed to dispatch for analysis'
      });
    }

    res.status(201).json({
      submissionId: submission._id,
      status: submission.status
    });

  } catch (error) {
    if (error instanceof ZodError) {
      return res.status(400).json({
        error: 'Validation failed',
        details: error.errors
      });
    }
    
    logger.error('Text submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const handleFileSubmission = async (req, res) => {
  upload(req, res, async (err) => {
    try {
      if (err) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(413).json({ error: 'File too large' });
        }
        return res.status(400).json({ error: err.message });
      }

      if (!req.file) {
        return res.status(400).json({ error: 'File is required' });
      }

      const validated = fileUploadSchema.parse({
        ...req.body,
        userId: req.user._id,
        file: req.file
      });

      // Create submission with UPLOADING status
      const submission = new Submission({
        userId: req.user._id,
        channel: validated.type,
        status: 'UPLOADING'
      });

      await submission.save();

      try {
        // Upload to S3
        const s3Data = await s3Service.uploadFile(
          req.file,
          req.user._id.toString(),
          validated.type
        );

        // Update submission with attachment info
        submission.attachments = [s3Data];
        submission.status = 'UPLOADED';
        await submission.save();

        // Generate signed URL for AI service
        const signedUrl = await s3Service.getAISignedUrl(s3Data.key);

        // Dispatch to AI service
        await aiService.analyzeFile(
          submission._id.toString(),
          signedUrl,
          s3Data.mimeType,
          s3Data.size,
          {
            channel: validated.type
          }
        );

        submission.status = 'DISPATCHED';
        await submission.save();

        // Emit SSE event
        sseService.sendToUser(req.user._id.toString(), 'submission_created', {
          submissionId: submission._id,
          createdAt: submission.createdAt,
          channel: submission.channel
        });

        res.status(201).json({
          submissionId: submission._id,
          status: submission.status
        });

      } catch (uploadError) {
        logger.error('File upload error:', uploadError);
        submission.status = 'ERROR';
        submission.lastError = uploadError.message;
        await submission.save();

        sseService.sendToUser(req.user._id.toString(), 'error', {
          submissionId: submission._id,
          message: 'File upload failed'
        });

        res.status(500).json({ error: 'File upload failed' });
      }

    } catch (error) {
      if (error instanceof ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
      }
      
      logger.error('File submission error:', error);
      res.status(500).json({ error: 'Internal server error' });
    }
  });
};

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
      .populate({
        path: 'report',
        match: {
          ...(riskMin && { riskScore: { $gte: parseFloat(riskMin) } }),
          ...(riskMax && { riskScore: { $lte: parseFloat(riskMax) } })
        }
      })
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    // Get signed URLs for attachments
    const submissionsWithUrls = await Promise.all(
      submissions.map(async (submission) => {
        const submissionObj = submission.toObject();
        
        if (submissionObj.attachments && submissionObj.attachments.length > 0) {
          for (let attachment of submissionObj.attachments) {
            try {
              attachment.signedUrl = await s3Service.getFrontendSignedUrl(attachment.key);
            } catch (error) {
              logger.error('Error generating signed URL:', error);
              attachment.signedUrl = null;
            }
          }
        }
        
        return submissionObj;
      })
    );

    const total = await Submission.countDocuments(filter);

    res.json({
      submissions: submissionsWithUrls,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / limit)
      }
    });

  } catch (error) {
    logger.error('Get submissions error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

const getSubmission = async (req, res) => {
  try {
    const { id } = req.params;
    
    const submission = await Submission.findOne({
      _id: id,
      userId: req.user._id
    }).populate('report');

    if (!submission) {
      return res.status(404).json({ error: 'Submission not found' });
    }

    const submissionObj = submission.toObject();
    
    // Generate signed URLs for attachments
    if (submissionObj.attachments && submissionObj.attachments.length > 0) {
      for (let attachment of submissionObj.attachments) {
        try {
          attachment.signedUrl = await s3Service.getFrontendSignedUrl(attachment.key);
        } catch (error) {
          logger.error('Error generating signed URL:', error);
          attachment.signedUrl = null;
        }
      }
    }

    res.json(submissionObj);

  } catch (error) {
    logger.error('Get submission error:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
};

module.exports = {
  handleTextSubmission,
  handleFileSubmission,
  getSubmissions,
  getSubmission
};