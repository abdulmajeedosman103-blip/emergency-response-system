// backend/src/controllers/notificationController.js
const {
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
} = require('../services/notificationService');

async function list(req, res, next) {
  try {
    const limit = Math.min(Math.max(Number(req.query.limit) || 50, 1), 100);
    const unreadOnly = req.query.unreadOnly === 'true';
    const result = await listNotifications(req.user.id, { limit, unreadOnly });
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

async function markRead(req, res, next) {
  try {
    const notification = await markNotificationRead(req.user.id, req.params.id);
    res.status(200).json({ data: notification });
  } catch (err) {
    next(err);
  }
}

async function markAllRead(req, res, next) {
  try {
    const result = await markAllNotificationsRead(req.user.id);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
}

module.exports = { list, markRead, markAllRead };