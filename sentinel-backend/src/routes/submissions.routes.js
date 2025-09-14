const express = require('express');
const {
  handleTextSubmission,
  handleFileSubmission,
  getSubmissions,
  getSubmission,
  handleProcessDocument,
  handleDetectSpam
} = require('../controllers/submissions.controller');
const authMiddleware = require('../middleware/auth');
const { uploadLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.post('/text', authMiddleware, uploadLimiter, handleTextSubmission);
router.post('/file', authMiddleware, uploadLimiter, handleFileSubmission);
router.post('/process_document', authMiddleware, uploadLimiter, handleProcessDocument);
router.post('/detect_spam', authMiddleware, uploadLimiter, handleDetectSpam);
router.get('/', authMiddleware, getSubmissions);
router.get('/:id', authMiddleware, getSubmission);

module.exports = router;
