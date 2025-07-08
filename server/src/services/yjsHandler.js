const http = require('http');
const WebSocket = require('ws');
const jwt = require('jsonwebtoken');
const Y = require('yjs');
const { setupWSConnection, getPersistence } = require('y-websocket/bin/utils');
const mongoose = require('mongoose');
const Room = require('../models/Room');
const logger = require('../utils/logger');

// Set up Yjs WebSocket handler
const setupYjsHandler = (server) => {
  const wss = new WebSocket.Server({ 
    noServer: true,
    path: '/yjs'
  });

  // Handle WebSocket connections
  server.on('upgrade', (request, socket, head) => {
    // Only handle /yjs connections
    if (request.url.startsWith('/yjs')) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
      });
    }
  });

  // Handle WebSocket connections
  wss.on('connection', async (conn, req) => {
    // Get room ID and token from URL params
    const url = new URL(req.url, 'http://localhost');
    const roomSlug = url.searchParams.get('room');
    const token = url.searchParams.get('token');

    // Verify authentication
    try {
      if (!token) {
        logger.warn('Yjs WebSocket connection rejected: No token provided');
        conn.close(1008, 'Authentication required');
        return;
      }

      // Verify the token
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'collab-ide-secret');
      const userId = decoded.id || decoded.user?.id;

      if (!userId) {
        logger.warn('Yjs WebSocket connection rejected: Invalid token');
        conn.close(1008, 'Invalid token');
        return;
      }

      if (!roomSlug) {
        logger.warn('Yjs WebSocket connection rejected: No room slug provided');
        conn.close(1008, 'Room slug required');
        return;
      }

      // Find the room
      const room = await Room.findOne({ slug: roomSlug });
      
      if (!room) {
        logger.warn(`Yjs WebSocket connection rejected: Room ${roomSlug} not found`);
        conn.close(1008, 'Room not found');
        return;
      }

      // Check if user is in the room
      const userInRoom = room.users.find(user => 
        user.userId && user.userId.toString() === userId
      );

      if (!userInRoom && !room.isPublic) {
        logger.warn(`Yjs WebSocket connection rejected: User ${userId} not in room ${roomSlug}`);
        conn.close(1008, 'Not authorized to access this room');
        return;
      }

      // Set up Yjs connection
      setupWSConnection(conn, req, { 
        docName: roomSlug,
        gc: true
      });

      logger.info(`Yjs WebSocket connection established for user ${userId} in room ${roomSlug}`);

      // Handle document updates to save to database
      const persistence = getPersistence();
      const doc = persistence.getYDoc(roomSlug);
      
      // Set up listener for document updates
      doc.on('update', async (update, origin) => {
        try {
          // Only save if it's not a local update (from the same WebSocket)
          if (origin !== conn) {
            // Get the text content
            const yText = doc.getText('monaco');
            const content = yText.toString();
            
            // Save to database only when content has changed
            await Room.updateOne(
              { slug: roomSlug },
              { 
                code: content,
                version: room.version + 1,
                lastActivity: new Date()
              }
            );
          }
        } catch (error) {
          logger.error(`Error saving Yjs document update: ${error.message}`);
        }
      });

      // Update user activity when connected
      try {
        await Room.updateOne(
          { slug: roomSlug, 'users.userId': mongoose.Types.ObjectId(userId) },
          { 
            $set: { 
              'users.$.isActive': true,
              'users.$.lastActivity': new Date()
            }
          }
        );
      } catch (error) {
        logger.error(`Error updating user activity: ${error.message}`);
      }

      // Handle WebSocket close to update user activity
      conn.on('close', async () => {
        try {
          await Room.updateOne(
            { slug: roomSlug, 'users.userId': mongoose.Types.ObjectId(userId) },
            { 
              $set: { 
                'users.$.isActive': false,
                'users.$.lastActivity': new Date()
              }
            }
          );
          logger.info(`Yjs WebSocket connection closed for user ${userId} in room ${roomSlug}`);
        } catch (error) {
          logger.error(`Error updating user activity on disconnect: ${error.message}`);
        }
      });

    } catch (error) {
      logger.error(`Yjs WebSocket connection error: ${error.message}`);
      conn.close(1008, 'Authentication failed');
    }
  });

  return wss;
};

module.exports = {
  setupYjsHandler
};
