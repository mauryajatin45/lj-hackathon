const Submission = require('../models/Submission');
const { logger } = require('../config/logger');

class SubmissionService {
  async createSubmission(userId, data) {
    try {
      const submission = new Submission({
        userId,
        ...data
      });
      await submission.save();
      return submission;
    } catch (error) {
      logger.error('Submission service - create error:', error);
      throw new Error('Failed to create submission');
    }
  }

  async getSubmissions(userId, filters = {}, pagination = {}) {
    try {
      const { page = 1, limit = 20 } = pagination;
      const query = { userId, ...filters };

      const submissions = await Submission.find(query)
        .populate('report')
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit)
        .lean();

      const total = await Submission.countDocuments(query);

      return {
        submissions,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      logger.error('Submission service - get submissions error:', error);
      throw new Error('Failed to get submissions');
    }
  }

  async getSubmissionById(submissionId, userId) {
    try {
      const submission = await Submission.findOne({
        _id: submissionId,
        userId
      }).populate('report').lean();

      if (!submission) {
        throw new Error('Submission not found');
      }

      return submission;
    } catch (error) {
      logger.error('Submission service - get submission error:', error);
      throw error;
    }
  }

  async updateSubmissionStatus(submissionId, status, errorMessage = null) {
    try {
      const updateData = { status };
      if (errorMessage) {
        updateData.lastError = errorMessage;
      }

      const submission = await Submission.findByIdAndUpdate(
        submissionId,
        updateData,
        { new: true }
      );

      if (!submission) {
        throw new Error('Submission not found');
      }

      return submission;
    } catch (error) {
      logger.error('Submission service - update status error:', error);
      throw new Error('Failed to update submission status');
    }
  }
}

module.exports = new SubmissionService();