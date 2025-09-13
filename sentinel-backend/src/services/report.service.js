const Report = require('../models/Report');
const { logger } = require('../config/logger');

class ReportService {
  async createReport(reportData) {
    try {
      // Check if report already exists
      const existingReport = await Report.findOne({ submissionId: reportData.submissionId });
      
      if (existingReport) {
        // Update existing report
        const updatedReport = await Report.findByIdAndUpdate(
          existingReport._id,
          reportData,
          { new: true, runValidators: true }
        );
        return updatedReport;
      }

      // Create new report
      const report = new Report(reportData);
      await report.save();
      return report;
    } catch (error) {
      logger.error('Report service - create error:', error);
      throw new Error('Failed to create report');
    }
  }

  async getReportBySubmissionId(submissionId) {
    try {
      return await Report.findOne({ submissionId }).lean();
    } catch (error) {
      logger.error('Report service - get error:', error);
      throw new Error('Failed to get report');
    }
  }

  async getReportsByUserId(userId, filters = {}) {
    try {
      // This would typically join with submissions table
      // For now, we'll implement a basic version
      const reports = await Report.find(filters).lean();
      return reports;
    } catch (error) {
      logger.error('Report service - get user reports error:', error);
      throw new Error('Failed to get user reports');
    }
  }
}

module.exports = new ReportService();