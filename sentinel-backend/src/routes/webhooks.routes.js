const express = require('express');
const { handleAnalysisWebhook } = require('../controllers/webhooks.controller');
const verifyWebhookSignature = require('../middleware/webhookVerify');

const router = express.Router();

router.post('/analysis', verifyWebhookSignature, handleAnalysisWebhook);

module.exports = router;