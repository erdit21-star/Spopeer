// Updated
/**
 * Socket.io Real-time Service
 * Handles WebSocket connections for live messaging and notifications
 */
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');
const ACCESS_JWT_SECRET = process.env.JWT_ACCESS_SECRET || process.env.JWT_SECRET;

let io = null;

// PHASE 2 STEP 9: Track online users
const onlineUsers = new Map(); // userId -> Set of socket IDs

// Simple per-user rate limiter for socket events
const rateLimitMap = new Map();
const RATE_LIMIT_WINDOW = 10000; // 10 seconds
const RATE_LIMIT_MAX = 20; // max events per window

function isRateLimited(userId) {
  const now = Date.now();
  const entry = rateLimitMap.get(userId);
  if (!entry || now - entry.start > RATE_LIMIT_WINDOW) {
    rateLimitMap.set(userId, { start: now, count: 1 });
    return false;
  }
  entry.count++;
  return entry.count > RATE_LIMIT_MAX;
}

// Max message content length
const MAX_MESSAGE_LENGTH = 5000;

function readCookieValue(cookieHeader, name) {
  const source = String(cookieHeader || '');
  if (!source) return '';
  const parts = source.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=');
    if (k === name) return decodeURIComponent(rest.join('='));
  }
  return '';
}

function initSocket(httpServer) {
  const allowedOrigins = [
    process.env.FRONTEND_URL,
    'http://localhost:5000',
    'http://localhost:3000',
    'http://127.0.0.1:5000'
  ].filter(Boolean);

  io = new Server(httpServer, {
    cors: {
      origin: process.env.NODE_ENV === 'production'
        ? (process.env.FRONTEND_URL || false)
        : allowedOrigins,
      credentials: true
    },
    maxHttpBufferSize: 1e6 // 1MB max payload
  });

  // Authenticate socket connections
  io.use((socket, next) => {
    const token = socket.handshake.auth && socket.handshake.auth.token
      ? socket.handshake.auth.token
      : readCookieValue(socket.handshake.headers && socket.handshake.headers.cookie, 'access_token');
    if (!token) return next(new Error('No token'));
    if (!ACCESS_JWT_SECRET) return next(new Error('Server token configuration error'));
    try {
      socket.user = jwt.verify(token, ACCESS_JWT_SECRET);
      next();
    } catch {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.user.userId || socket.user.id;

    // Join the user's personal room for targeted events
    socket.join(`user:${userId}`);
    console.log(`🔌 User ${userId} connected via WebSocket`);

    // PHASE 2 STEP 9: Track online users
    if (!onlineUsers.has(userId)) {
      onlineUsers.set(userId, new Set());
      // Broadcast user is online (only on first connection)
      io.emit('user_online', { userId });
    }
    onlineUsers.get(userId).add(socket.id);

    // Handle disconnect
    socket.on('disconnect', () => {
      const sockets = onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(socket.id);
        if (sockets.size === 0) {
          onlineUsers.delete(userId);
          // Broadcast user is offline
          io.emit('user_offline', { userId });
        }
      }
      console.log(`🔌 User ${userId} disconnected`);
    });

    // Handle real-time message sending
    socket.on('send_message', async ({ receiverId, content }) => {
      try {
        // Rate limiting
        if (isRateLimited(userId)) {
          socket.emit('error_message', { error: 'Rate limit exceeded. Slow down.' });
          return;
        }

        // Validate and normalize receiverId from socket payload (often arrives as string)
        const parsedReceiverId = parseInt(receiverId, 10);
        if (!Number.isFinite(parsedReceiverId) || parsedReceiverId <= 0) {
          socket.emit('error_message', { error: 'Invalid receiverId.' });
          return;
        }
        if (!content || typeof content !== 'string') {
          socket.emit('error_message', { error: 'Invalid message content.' });
          return;
        }

        const trimmedContent = content.trim().substring(0, MAX_MESSAGE_LENGTH);
        if (trimmedContent.length === 0) {
          socket.emit('error_message', { error: 'Message cannot be empty.' });
          return;
        }

        if (parsedReceiverId === userId) {
          socket.emit('error_message', { error: 'Cannot message yourself.' });
          return;
        }

        const { Message, Notification, User } = require('../models');
        const { findOrCreateDirectConversation } = require('../utils/conversations');
        const conversation = await findOrCreateDirectConversation(userId, parsedReceiverId);
        const msg = await Message.create({
          conversationId: conversation.id,
          senderId: userId,
          receiverId: parsedReceiverId,
          body: trimmedContent,
          content: trimmedContent
        });

        try {
          const sender = await User.findByPk(userId, {
            attributes: ['displayName', 'firstName', 'lastName']
          });
          const senderName = sender
            ? (sender.displayName || [sender.firstName, sender.lastName].filter(Boolean).join(' '))
            : 'Someone';
          const notification = await Notification.create({
            recipientId: parsedReceiverId,
            senderId: userId,
            type: 'message',
            text: `${senderName || 'Someone'} sent you a message.`,
            href: '/pages/messaging/inbox.html'
          });
          io.to(`user:${parsedReceiverId}`).emit('notification:new', {
            id: notification.id,
            recipientId: notification.recipientId,
            senderId: notification.senderId,
            type: notification.type,
            text: notification.text,
            href: notification.href,
            isRead: notification.isRead,
            createdAt: notification.createdAt,
            updatedAt: notification.updatedAt
          });
        } catch (notificationError) {
          console.warn('Socket notification create failed:', notificationError && notificationError.message);
        }

        // Deliver to receiver if online
        io.to(`user:${parsedReceiverId}`).emit('new_message', {
          id: msg.id,
          conversationId: conversation.id,
          fromId: userId,
          toId: parsedReceiverId,
          senderId: userId,
          content: trimmedContent,
          timestamp: msg.createdAt
        });

        // Acknowledge to sender
        socket.emit('message_sent', { id: msg.id, timestamp: msg.createdAt });
      } catch (err) {
        console.error('Socket message error:', err);
        socket.emit('error_message', { error: 'Failed to send message.' });
      }
    });

    // Typing indicator
    socket.on('typing', ({ receiverId }) => {
      if (isRateLimited(userId)) return;
      const parsedReceiverId = parseInt(receiverId, 10);
      if (Number.isFinite(parsedReceiverId) && parsedReceiverId > 0) {
        io.to(`user:${parsedReceiverId}`).emit('user_typing', { userId });
      }
    });

    socket.on('stop_typing', ({ receiverId }) => {
      const parsedReceiverId = parseInt(receiverId, 10);
      if (Number.isFinite(parsedReceiverId) && parsedReceiverId > 0) {
        io.to(`user:${parsedReceiverId}`).emit('user_stop_typing', { userId });
      }
    });
  });

  // Periodic cleanup of rate limit map
  setInterval(() => {
    const now = Date.now();
    for (const [key, entry] of rateLimitMap) {
      if (now - entry.start > RATE_LIMIT_WINDOW * 2) {
        rateLimitMap.delete(key);
      }
    }
  }, 60000);

  return io;
}

// Helper to send notifications from routes
function notifyUser(userId, event, data) {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

// PHASE 2 STEP 9: Helper to check if user is online
function isUserOnline(userId) {
  const sockets = onlineUsers.get(userId);
  return sockets ? sockets.size > 0 : false;
}

module.exports = { initSocket, notifyUser, isUserOnline };

