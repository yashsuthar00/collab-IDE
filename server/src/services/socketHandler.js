const Room = require('../models/Room');
const User = require('../models/User');
const roomController = require('../controllers/roomController');
const jwt = require('jsonwebtoken');
const logger = require('../utils/logger');
const mongoose = require('mongoose');

// Socket middleware for authentication
const socketAuth = async (socket, next) => {
  try {
    // Get token from handshake auth
    const token = socket.handshake.auth.token;
    
    if (!token) {
      return next(new Error('Authentication required'));
    }
    
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'collab-ide-secret');
    
    // Get user ID from token
    const userId = decoded.id || decoded.user?.id;
    
    if (!userId) {
      return next(new Error('Invalid token'));
    }
    
    // Fetch user from DB
    const user = await User.findById(userId).select('-password');
    
    if (!user) {
      return next(new Error('User not found'));
    }
    
    // Set user data on socket
    socket.user = user;
    
    next();
  } catch (error) {
    logger.error('Socket authentication error:', error);
    next(new Error('Authentication failed'));
  }
};

// Socket handling for rooms
const setupSocketHandlers = (io) => {
  // Apply authentication middleware
  io.use(socketAuth);
  
  // Create a namespace for rooms
  const roomsNamespace = io.of('/rooms');
  
  // Apply authentication to room namespace
  roomsNamespace.use(socketAuth);
  
  // Connection handler
  roomsNamespace.on('connection', async (socket) => {
    logger.info(`User connected: ${socket.user.username} (${socket.user._id})`);
    
    // Join a room
    socket.on('join-room', async (data) => {
      try {
        const { slug } = data;
        
        if (!slug) {
          socket.emit('error', { message: 'Room slug is required' });
          return;
        }
        
        // Find the room
        const room = await Room.findOne({ slug });
        
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }
        
        // Check if user is already in the room
        const userInRoom = room.users.find(user => 
          user.userId && user.userId.equals(socket.user._id)
        );
        
        if (!userInRoom) {
          // If room is private and user is not the owner, check for invitation
          if (!room.isPublic && !room.ownerId.equals(socket.user._id)) {
            socket.emit('error', { message: 'This is a private room' });
            return;
          }
          
          // Add user to the room with viewer access by default
          await Room.updateOne(
            { slug },
            { 
              $push: { 
                users: {
                  userId: socket.user._id,
                  socketId: socket.id,
                  name: socket.user.displayName || socket.user.username,
                  accessLevel: 'viewer',
                  isActive: true,
                  joinedAt: new Date(),
                  lastActivity: new Date()
                }
              },
              $inc: { activeUsers: 1 },
              $set: { lastActivity: new Date() }
            }
          );
        } else {
          // Update user as active and update socket ID
          await Room.updateOne(
            { slug, 'users.userId': socket.user._id },
            { 
              $set: { 
                'users.$.isActive': true,
                'users.$.socketId': socket.id,
                'users.$.lastActivity': new Date()
              }
            }
          );
        }
        
        // Join the socket room
        socket.join(slug);
        
        // Notify room members
        roomsNamespace.to(slug).emit('user-joined', {
          userId: socket.user._id,
          username: socket.user.username,
          displayName: socket.user.displayName,
          avatar: socket.user.avatar,
          joinedAt: new Date()
        });
        
        // Send room data to the user
        const updatedRoom = await Room.findOne({ slug })
          .populate('ownerId', 'username displayName avatar')
          .populate('users.userId', 'username displayName avatar');
          
        // Get user access level
        const currentUser = updatedRoom.users.find(user => 
          user.userId && user.userId.equals(socket.user._id)
        );
        
        socket.emit('room-joined', {
          slug: updatedRoom.slug,
          name: updatedRoom.name,
          description: updatedRoom.description,
          language: updatedRoom.language,
          code: updatedRoom.code,
          version: updatedRoom.version,
          isPublic: updatedRoom.isPublic,
          owner: {
            id: updatedRoom.ownerId._id,
            username: updatedRoom.ownerId.username,
            displayName: updatedRoom.ownerId.displayName,
            avatar: updatedRoom.ownerId.avatar
          },
          settings: updatedRoom.settings,
          users: updatedRoom.users.filter(u => u.isActive).map(user => ({
            id: user.userId ? user.userId._id : null,
            username: user.userId ? user.userId.username : null,
            displayName: user.userId ? user.userId.displayName : user.name,
            avatar: user.userId ? user.userId.avatar : null,
            accessLevel: user.accessLevel,
            isOwner: updatedRoom.ownerId.equals(user.userId),
            cursor: user.cursor
          })),
          currentUser: {
            accessLevel: currentUser ? currentUser.accessLevel : 'viewer',
            isOwner: updatedRoom.ownerId.equals(socket.user._id)
          }
        });
        
        logger.info(`User ${socket.user.username} joined room ${slug}`);
      } catch (error) {
        logger.error(`Error joining room:`, error);
        socket.emit('error', { message: 'Failed to join room' });
      }
    });
    
    // Leave a room
    socket.on('leave-room', async (data) => {
      try {
        const { slug } = data;
        
        if (!slug) {
          socket.emit('error', { message: 'Room slug is required' });
          return;
        }
        
        // Update user as inactive
        await Room.updateOne(
          { slug, 'users.userId': socket.user._id },
          { 
            $set: { 
              'users.$.isActive': false,
              'users.$.lastActivity': new Date()
            },
            $inc: { activeUsers: -1 }
          }
        );
        
        // Leave the socket room
        socket.leave(slug);
        
        // Notify room members
        roomsNamespace.to(slug).emit('user-left', {
          userId: socket.user._id,
          username: socket.user.username
        });
        
        socket.emit('room-left', { slug });
        
        logger.info(`User ${socket.user.username} left room ${slug}`);
      } catch (error) {
        logger.error(`Error leaving room:`, error);
        socket.emit('error', { message: 'Failed to leave room' });
      }
    });
    
    // Code change
    socket.on('code-change', async (data) => {
      try {
        const { slug, code, version, patches } = data;
        
        if (!slug) {
          socket.emit('error', { message: 'Room slug is required' });
          return;
        }
        
        // Find the room
        const room = await Room.findOne({ slug });
        
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }
        
        // Check if user has permission to edit code
        const userInRoom = room.users.find(user => 
          user.userId && user.userId.equals(socket.user._id)
        );
        
        if (!userInRoom) {
          socket.emit('error', { message: 'You are not a member of this room' });
          return;
        }
        
        const canEdit = ['owner', 'editor'].includes(userInRoom.accessLevel);
        
        if (!canEdit) {
          socket.emit('error', { message: 'You do not have permission to edit code' });
          return;
        }
        
        if (patches) {
          // If using Yjs, broadcast patches to other users
          socket.to(slug).emit('code-update', {
            userId: socket.user._id,
            patches,
            version: room.version + 1
          });
        } else if (code) {
          // Fallback to OT
          // Check version for concurrency control
          if (version && room.version > version) {
            socket.emit('version-conflict', {
              message: 'Version conflict',
              currentVersion: room.version
            });
            return;
          }
          
          // Update code in database
          const newVersion = version ? version + 1 : room.version + 1;
          
          await Room.updateOne(
            { slug },
            { 
              $set: { 
                code,
                version: newVersion,
                lastActivity: new Date()
              }
            }
          );
          
          // Broadcast to other users
          socket.to(slug).emit('code-update', {
            userId: socket.user._id,
            code,
            version: newVersion
          });
        }
        
        // Update user activity timestamp
        await Room.updateOne(
          { slug, 'users.userId': socket.user._id },
          { $set: { 'users.$.lastActivity': new Date() } }
        );
      } catch (error) {
        logger.error(`Error handling code change:`, error);
        socket.emit('error', { message: 'Failed to process code change' });
      }
    });
    
    // Cursor update
    socket.on('cursor-update', async (data) => {
      try {
        const { slug, position, selection } = data;
        
        if (!slug || !position) {
          return; // Silently ignore invalid updates
        }
        
        // Update cursor in database
        await roomController.updateCursorPosition(
          slug, 
          socket.user._id, 
          position,
          selection
        );
        
        // Broadcast to other users
        socket.to(slug).emit('cursor-update', {
          userId: socket.user._id,
          username: socket.user.username,
          displayName: socket.user.displayName,
          position,
          selection
        });
      } catch (error) {
        logger.error(`Error updating cursor:`, error);
      }
    });
    
    // Chat message
    socket.on('chat-message', async (data) => {
      try {
        const { slug, message } = data;
        
        if (!slug || !message) {
          socket.emit('error', { message: 'Room slug and message are required' });
          return;
        }
        
        // Find the room
        const room = await Room.findOne({ slug });
        
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }
        
        // Check if user is in the room
        const userInRoom = room.users.find(user => 
          user.userId && user.userId.equals(socket.user._id)
        );
        
        if (!userInRoom) {
          socket.emit('error', { message: 'You are not a member of this room' });
          return;
        }
        
        // Create chat message
        const chatMessage = {
          userId: socket.user._id,
          userName: socket.user.displayName || socket.user.username,
          message,
          timestamp: new Date()
        };
        
        // Add to database
        await Room.updateOne(
          { slug },
          { 
            $push: { chat: chatMessage },
            $set: { lastActivity: new Date() }
          }
        );
        
        // Broadcast to all users including sender
        roomsNamespace.to(slug).emit('chat-message', {
          ...chatMessage,
          isCurrentUser: false
        });
        
        // Update user activity timestamp
        await Room.updateOne(
          { slug, 'users.userId': socket.user._id },
          { $set: { 'users.$.lastActivity': new Date() } }
        );
      } catch (error) {
        logger.error(`Error sending chat message:`, error);
        socket.emit('error', { message: 'Failed to send chat message' });
      }
    });
    
    // Update user access level
    socket.on('update-access', async (data) => {
      try {
        const { slug, userId, accessLevel } = data;
        
        if (!slug || !userId || !accessLevel) {
          socket.emit('error', { message: 'Room slug, user ID, and access level are required' });
          return;
        }
        
        // Find the room
        const room = await Room.findOne({ slug });
        
        if (!room) {
          socket.emit('error', { message: 'Room not found' });
          return;
        }
        
        // Check if the requesting user is the owner
        if (!room.ownerId.equals(socket.user._id)) {
          socket.emit('error', { message: 'Only the room owner can change access levels' });
          return;
        }
        
        // Validate access level
        const validAccessLevels = ['owner', 'editor', 'runner', 'viewer'];
        if (!validAccessLevels.includes(accessLevel)) {
          socket.emit('error', { message: 'Invalid access level' });
          return;
        }
        
        // Convert userId to ObjectId if it's a string
        const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
          ? new mongoose.Types.ObjectId(userId) 
          : null;
          
        if (!userObjectId) {
          socket.emit('error', { message: 'Invalid user ID' });
          return;
        }
        
        // Prevent owner from changing their own access level
        if (room.ownerId.equals(userObjectId) && accessLevel !== 'owner') {
          socket.emit('error', { message: 'Cannot change the access level of the room owner' });
          return;
        }
        
        // Update access level
        const result = await Room.updateOne(
          { 
            slug, 
            'users.userId': userObjectId 
          },
          { 
            $set: { 
              'users.$.accessLevel': accessLevel,
              lastActivity: new Date()
            }
          }
        );
        
        if (result.nModified === 0) {
          socket.emit('error', { message: 'User not found in room' });
          return;
        }
        
        // Broadcast to all users
        roomsNamespace.to(slug).emit('access-updated', {
          userId,
          accessLevel
        });
        
        logger.info(`User ${socket.user.username} updated access level of ${userId} to ${accessLevel} in room ${slug}`);
      } catch (error) {
        logger.error(`Error updating access level:`, error);
        socket.emit('error', { message: 'Failed to update access level' });
      }
    });
    
    // Disconnect handler
    socket.on('disconnect', async () => {
      try {
        logger.info(`User disconnected: ${socket.user.username} (${socket.user._id})`);
        
        // Find all rooms the user is active in
        const rooms = await Room.find({
          'users.userId': socket.user._id,
          'users.isActive': true,
          'users.socketId': socket.id
        });
        
        // Update user as inactive in all rooms
        for (const room of rooms) {
          await Room.updateOne(
            { 
              slug: room.slug, 
              'users.userId': socket.user._id,
              'users.socketId': socket.id
            },
            { 
              $set: { 
                'users.$.isActive': false,
                'users.$.lastActivity': new Date()
              },
              $inc: { activeUsers: -1 }
            }
          );
          
          // Notify room members
          roomsNamespace.to(room.slug).emit('user-left', {
            userId: socket.user._id,
            username: socket.user.username
          });
          
          logger.info(`User ${socket.user.username} marked inactive in room ${room.slug} due to disconnect`);
        }
      } catch (error) {
        logger.error(`Error handling disconnect:`, error);
      }
    });
  });
  
  return roomsNamespace;
};

module.exports = {
  setupSocketHandlers
};
