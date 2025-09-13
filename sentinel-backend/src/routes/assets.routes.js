const express = require('express');
const { getSignedUrl } = require('../controllers/assets.controller');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

router.get('/:submissionId/:index/signed-url', authMiddleware, getSignedUrl);

module.exports = router;