/**
 * Notifications Routes
 * GET    /api/notifications            - Get notifications for logged-in user
 * PATCH  /api/notifications/read       - Mark all as read
 * PATCH  /api/notifications/:id/read   - Mark one as read
 * DELETE /api/notifications/:id        - Delete a notification
 */
const express = require('express');
const router = express.Router();
const { Notification, User } = require('../models');
const { authenticate } = require('../middleware/auth');

// All routes require auth
router.use(authenticate);

// ─── GET NOTIFICATIONS ───
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 30 } = req.query;
    const offset = (parseInt(page) - 1) * parseInt(limit);

    const { rows: notifications, count } = await Notification.findAndCountAll({
      where: { recipientId: req.userId },
      include: [{ model: User, as: 'sender', attributes: ['id', 'firstName', 'lastName', 'avatarUrl', 'role'] }],
      limit: parseInt(limit),
      offset,
      order: [['createdAt', 'DESC']]
    });

    const unreadCount = await Notification.count({
      where: { recipientId: req.userId, isRead: false }
    });

    res.json({
      status: 'ok',
      payload: notifications,
      unreadCount,
      pagination: { total: count, page: parseInt(page), pages: Math.ceil(count / parseInt(limit)) }
    });
  } catch (error) {
    console.error('Get notifications error:', error);
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
});

// ─── MARK ALL AS READ ───
router.patch('/read', async (req, res) => {
  try {
    await Notification.update(
      { isRead: true },
      { where: { recipientId: req.userId, isRead: false } }
    );
    res.json({ status: 'ok', message: 'All notifications marked as read.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to mark notifications as read.' });
  }
});

// ─── MARK ONE AS READ ───
router.patch('/:id/read', async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, recipientId: req.userId }
    });
    if (!notification) return res.status(404).json({ error: 'Notification not found.' });

    await notification.update({ isRead: true });
    res.json({ status: 'ok', message: 'Notification marked as read.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification.' });
  }
});

// ─── DELETE NOTIFICATION ───
router.delete('/:id', async (req, res) => {
  try {
    const notification = await Notification.findOne({
      where: { id: req.params.id, recipientId: req.userId }
    });
    if (!notification) return res.status(404).json({ error: 'Notification not found.' });

    await notification.destroy();
    res.json({ status: 'ok', message: 'Notification deleted.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete notification.' });
  }
});

module.exports = router;

