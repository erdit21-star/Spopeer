const { Notification } = require('../models');
const { notifyUser } = require('./socket');

async function emitUnreadCount(recipientId) {
  if (!Number.isInteger(recipientId) || recipientId <= 0) return;
  try {
    const unreadCount = await Notification.count({
      where: { recipientId, isRead: false }
    });
    notifyUser(recipientId, 'notification:unread', { unreadCount });
  } catch (_error) {
    // Best effort only.
  }
}

async function createNotification(payload) {
  try {
    const recipientId = Number(payload && payload.recipientId);
    const senderId = payload && payload.senderId != null ? Number(payload.senderId) : null;
    const type = String((payload && payload.type) || '').trim().toLowerCase();
    const text = String((payload && payload.text) || '').trim();
    const href = payload && payload.href ? String(payload.href) : null;

    if (!Number.isInteger(recipientId) || recipientId <= 0) return null;
    if (senderId && recipientId === senderId) return null;
    if (!type || !text) return null;

    const notification = await Notification.create({
      recipientId,
      senderId: Number.isInteger(senderId) && senderId > 0 ? senderId : null,
      type,
      text,
      href
    });

    const data = {
      id: notification.id,
      recipientId: notification.recipientId,
      senderId: notification.senderId,
      type: notification.type,
      text: notification.text,
      href: notification.href,
      isRead: notification.isRead,
      createdAt: notification.createdAt,
      updatedAt: notification.updatedAt
    };

    notifyUser(recipientId, 'notification:new', data);
    await emitUnreadCount(recipientId);
    return notification;
  } catch (error) {
    console.warn('Failed to create notification:', error && error.message ? error.message : error);
    return null;
  }
}

module.exports = {
  createNotification,
  emitUnreadCount
};
