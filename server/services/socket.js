// Updated
/**
 * Socket.io Real-time Service
 * Handles WebSocket connections for live messaging and notifications
 */
const { Server } = require('socket.io');
const jwt = require('jsonwebtoken');

let io = null;

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
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('No token'));
    try {
      socket.user = jwt.verify(token, process.env.JWT_SECRET);
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

    // Handle real-time message sending
    socket.on('send_message', async ({ receiverId, content }) => {
      try {
        // Rate limiting
        if (isRateLimited(userId)) {
          socket.emit('error_message', { error: 'Rate limit exceeded. Slow down.' });
          return;
        }

        // Validate inputs
        if (!receiverId || typeof receiverId !== 'number') {
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

        if (receiverId === userId) {
          socket.emit('error_message', { error: 'Cannot message yourself.' });
          return;
        }

        const { Message } = require('../models');
        const { findOrCreateDirectConversation } = require('../utils/conversations');
        const conversation = await findOrCreateDirectConversation(userId, receiverId);
        const msg = await Message.create({
          conversationId: conversation.id,
          senderId: userId,
          receiverId,
          body: trimmedContent,
          content: trimmedContent
        });

        // Deliver to receiver if online
        io.to(`user:${receiverId}`).emit('new_message', {
          id: msg.id,
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
      if (receiverId && typeof receiverId === 'number') {
        io.to(`user:${receiverId}`).emit('user_typing', { userId });
      }
    });

    socket.on('stop_typing', ({ receiverId }) => {
      if (receiverId && typeof receiverId === 'number') {
        io.to(`user:${receiverId}`).emit('user_stop_typing', { userId });
      }
    });

    socket.on('disconnect', () => {
      console.log(`🔌 User ${userId} disconnected`);
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

module.exports = { initSocket, notifyUser };

