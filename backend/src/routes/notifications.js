// backend/src/routes/notifications.js
// Minimal notification API backed by the frozen Notification model. Users can
// only ever read or mutate their own notifications (identity from the JWT).
const express = require('express');

const { list, markRead, markAllRead } = require('../controllers/notificationController');
const { authenticate } = require('../middleware/auth');

const router = express.Router();

router.use(authenticate);

router.get('/', list);
router.patch('/:id/read', markRead);
router.patch('/read-all', markAllRead);

module.exports = router;