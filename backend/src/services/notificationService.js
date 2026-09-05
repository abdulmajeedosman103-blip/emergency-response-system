// backend/src/services/notificationService.js
// Persistent notifications backed by the existing (frozen) Notification model.
// Ownership is always enforced by the authenticated user identity.
const prisma = require('../config/prisma');
const { AppError } = require('../middleware/errorHandler');

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const NOTIFICATION_FIELDS = {
  id: true,
  type: true,
  title: true,
  message: true,
  data: true,
  isRead: true,
  createdAt: true,
};

// Creates a persistent notification for a single target user. Callers emit the
// real-time "notification:created" event only after this resolves.
async function createNotification(userId, { type, title, message, data = null }) {
  return prisma.notification.create({
    data: {
      userId,
      type,
      title,
      message,
      data: data === null ? undefined : data,
    },
    select: NOTIFICATION_FIELDS,
  });
}

async function listNotifications(userId, { limit = 50, unreadOnly = false } = {}) {
  const where = { userId };
  if (unreadOnly) {
    where.isRead = false;
  }

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: limit,
      select: NOTIFICATION_FIELDS,
    }),
    prisma.notification.count({ where: { userId, isRead: false } }),
  ]);

  return { notifications, unreadCount };
}

async function markNotificationRead(userId, notificationId) {
  if (!UUID_RE.test(notificationId)) {
    throw new AppError(404, 'Notification not found.');
  }

  const notification = await prisma.notification.findFirst({
    where: { id: notificationId, userId },
    select: NOTIFICATION_FIELDS,
  });

  if (!notification) {
    throw new AppError(404, 'Notification not found.');
  }

  if (notification.isRead) {
    return notification;
  }

  return prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
    select: NOTIFICATION_FIELDS,
  });
}

async function markAllNotificationsRead(userId) {
  const result = await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
  return { updated: result.count };
}

module.exports = {
  createNotification,
  listNotifications,
  markNotificationRead,
  markAllNotificationsRead,
};