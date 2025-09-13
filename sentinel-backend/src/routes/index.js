const express = require('express');
const authRoutes = require('./auth.routes');
const submissionsRoutes = require('./submissions.routes');
const assetsRoutes = require('./assets.routes');
const sseRoutes = require('./sse.routes');
const webhooksRoutes = require('./webhooks.routes');

const router = express.Router();

router.use('/auth', authRoutes);
router.use('/submissions', submissionsRoutes);
router.use('/assets', assetsRoutes);
router.use('/sse', sseRoutes);
router.use('/webhooks', webhooksRoutes);

module.exports = router;