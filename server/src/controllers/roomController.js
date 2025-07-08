const Room = require('../models/Room');
const User = require('../models/User');
const { nanoid } = require('nanoid');
const mongoose = require('mongoose');

// Helper function to generate a unique slug
const generateUniqueSlug = async () => {
  // Generate a short, URL-friendly ID (8 characters)
  const slug = nanoid(8);
  
  // Check if a room with this slug already exists
  const existingRoom = await Room.findOne({ slug });
  
  // If it exists, try again recursively
  if (existingRoom) {
    return generateUniqueSlug();
  }
  
  return slug;
};

// Create a new room
exports.createRoom = async (req, res) => {
  try {
    const { name, language, description, isPublic } = req.body;
    
    // User must be authenticated to create a room
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    // Generate a unique slug for the room
    const slug = await generateUniqueSlug();
    
    // Create the room with the authenticated user as owner
    const room = await Room.create({
      slug,
      name: name || `Room ${slug}`,
      description: description || '',
      language: language || 'javascript',
      isPublic: !!isPublic,
      ownerId: req.user._id,
      users: [{
        userId: req.user._id,
        name: req.user.displayName || req.user.username,
        accessLevel: 'owner',
        isActive: true,
        joinedAt: new Date()
      }],
      code: '',
      version: 0,
      activeUsers: 1
    });
    
    res.status(201).json({
      success: true,
      room: {
        slug: room.slug,
        name: room.name,
        language: room.language,
        isPublic: room.isPublic,
        createdAt: room.createdAt
      }
    });
  } catch (error) {
    console.error('Error creating room:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to create room' 
    });
  }
};

// Get room details
exports.getRoomDetails = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const room = await Room.findOne({ slug })
      .populate('ownerId', 'username displayName avatar')
      .lean();
    
    if (!room) {
      return res.status(404).json({
        success: false,
        roomExists: false,
        message: 'Room not found'
      });
    }
    
    // Check if room is private and user is not the owner
    if (!room.isPublic && (!req.user || !room.ownerId._id.equals(req.user._id))) {
      // Check if user is in the users array
      const isUserInRoom = room.users.some(user => 
        req.user && user.userId && user.userId.equals(req.user._id)
      );
      
      if (!isUserInRoom) {
        return res.status(403).json({
          success: false,
          message: 'This is a private room'
        });
      }
    }
    
    // Return safe data only
    const safeRoomData = {
      success: true,
      roomExists: true,
      slug: room.slug,
      name: room.name,
      description: room.description,
      isPublic: room.isPublic,
      createdAt: room.createdAt,
      language: room.language,
      owner: {
        id: room.ownerId._id,
        username: room.ownerId.username,
        displayName: room.ownerId.displayName,
        avatar: room.ownerId.avatar
      },
      settings: room.settings,
      activeUsers: room.activeUsers,
      expiresAt: room.expiresAt
    };
    
    res.json(safeRoomData);
  } catch (error) {
    console.error('Error fetching room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch room details'
    });
  }
};

// Update room settings
exports.updateRoomSettings = async (req, res) => {
  try {
    const { slug } = req.params;
    const { name, description, language, isPublic, settings } = req.body;
    
    // Find the room
    const room = await Room.findOne({ slug });
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    // Check if the user is the owner or has edit permissions
    if (!req.user || !room.ownerId.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to update room settings'
      });
    }
    
    // Update the room settings
    const updateData = {};
    
    if (name) updateData.name = name;
    if (description !== undefined) updateData.description = description;
    if (language) updateData.language = language;
    if (isPublic !== undefined) updateData.isPublic = isPublic;
    
    // Update nested settings if provided
    if (settings) {
      Object.keys(settings).forEach(key => {
        if (settings[key] !== undefined) {
          updateData[`settings.${key}`] = settings[key];
        }
      });
    }
    
    // Update lastActivity
    updateData.lastActivity = new Date();
    
    // Save the changes
    const updatedRoom = await Room.findOneAndUpdate(
      { slug },
      { $set: updateData },
      { new: true }
    ).populate('ownerId', 'username displayName avatar');
    
    res.json({
      success: true,
      room: {
        slug: updatedRoom.slug,
        name: updatedRoom.name,
        description: updatedRoom.description,
        language: updatedRoom.language,
        isPublic: updatedRoom.isPublic,
        settings: updatedRoom.settings,
        owner: {
          id: updatedRoom.ownerId._id,
          username: updatedRoom.ownerId.username,
          displayName: updatedRoom.ownerId.displayName,
          avatar: updatedRoom.ownerId.avatar
        }
      }
    });
  } catch (error) {
    console.error('Error updating room settings:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update room settings'
    });
  }
};

// Get room users
exports.getRoomUsers = async (req, res) => {
  try {
    const { slug } = req.params;
    
    const room = await Room.findOne({ slug })
      .populate('users.userId', 'username displayName avatar');
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    // Check if user has access to view room users
    if (!room.isPublic && (!req.user || !room.ownerId.equals(req.user._id))) {
      const isUserInRoom = room.users.some(user => 
        req.user && user.userId && user.userId.equals(req.user._id)
      );
      
      if (!isUserInRoom) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to view room users'
        });
      }
    }
    
    // Map users to a safe format
    const safeUsers = room.users.map(user => ({
      id: user.userId ? user.userId._id : user._id,
      username: user.userId ? user.userId.username : null,
      displayName: user.userId ? user.userId.displayName : user.name,
      avatar: user.userId ? user.userId.avatar : null,
      accessLevel: user.accessLevel,
      isActive: user.isActive,
      joinedAt: user.joinedAt,
      isOwner: room.ownerId.equals(user.userId)
    }));
    
    res.json({
      success: true,
      users: safeUsers
    });
  } catch (error) {
    console.error('Error fetching room users:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch room users'
    });
  }
};

// Update user access level
exports.updateUserAccess = async (req, res) => {
  try {
    const { slug } = req.params;
    const { userId, accessLevel } = req.body;
    
    // Validate access level
    const validAccessLevels = ['owner', 'editor', 'runner', 'viewer'];
    if (!validAccessLevels.includes(accessLevel)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid access level'
      });
    }
    
    // Find the room
    const room = await Room.findOne({ slug });
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    // Check if the requesting user is the owner
    if (!req.user || !room.ownerId.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only the room owner can change access levels'
      });
    }
    
    // Convert userId to ObjectId if it's a string
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
      ? new mongoose.Types.ObjectId(userId) 
      : null;
      
    if (!userObjectId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    // Prevent owner from changing their own access level
    if (room.ownerId.equals(userObjectId) && accessLevel !== 'owner') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change the access level of the room owner'
      });
    }
    
    // Update access level
    const updatedRoom = await Room.findOneAndUpdate(
      { 
        slug, 
        'users.userId': userObjectId 
      },
      { 
        $set: { 
          'users.$.accessLevel': accessLevel,
          lastActivity: new Date()
        }
      },
      { new: true }
    );
    
    if (!updatedRoom) {
      return res.status(404).json({
        success: false,
        message: 'User not found in room'
      });
    }
    
    res.json({
      success: true,
      message: 'User access level updated',
      userId,
      accessLevel
    });
  } catch (error) {
    console.error('Error updating user access:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update user access'
    });
  }
};

// Join a room
exports.joinRoom = async (req, res) => {
  try {
    const { slug } = req.params;
    
    // User must be authenticated to join a room
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const room = await Room.findOne({ slug });
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    // Check if room is private and user is not the owner
    if (!room.isPublic && !room.ownerId.equals(req.user._id)) {
      // Check if user has an invitation (we'll implement this later)
      // For now, reject private room access
      return res.status(403).json({
        success: false,
        message: 'This is a private room'
      });
    }
    
    // Check if user is already in the room
    const userInRoom = room.users.find(user => 
      user.userId && user.userId.equals(req.user._id)
    );
    
    if (userInRoom) {
      // Update user as active
      await Room.updateOne(
        { slug, 'users.userId': req.user._id },
        { 
          $set: { 
            'users.$.isActive': true,
            'users.$.lastActivity': new Date()
          }
        }
      );
      
      return res.json({
        success: true,
        message: 'Rejoined room',
        accessLevel: userInRoom.accessLevel
      });
    }
    
    // Add user to the room with viewer access by default
    await Room.updateOne(
      { slug },
      { 
        $push: { 
          users: {
            userId: req.user._id,
            name: req.user.displayName || req.user.username,
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
    
    res.json({
      success: true,
      message: 'Joined room',
      accessLevel: 'viewer'
    });
  } catch (error) {
    console.error('Error joining room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to join room'
    });
  }
};

// Leave a room
exports.leaveRoom = async (req, res) => {
  try {
    const { slug } = req.params;
    
    // User must be authenticated to leave a room
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const room = await Room.findOne({ slug });
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    // If user is the owner, they can't leave - they must transfer ownership or delete the room
    if (room.ownerId.equals(req.user._id)) {
      return res.status(400).json({
        success: false,
        message: 'Room owner cannot leave. Transfer ownership or delete the room instead.'
      });
    }
    
    // Update user as inactive
    const result = await Room.updateOne(
      { slug, 'users.userId': req.user._id },
      { 
        $set: { 
          'users.$.isActive': false,
          'users.$.lastActivity': new Date()
        },
        $inc: { activeUsers: -1 },
        $set: { lastActivity: new Date() }
      }
    );
    
    if (result.nModified === 0) {
      return res.status(404).json({
        success: false,
        message: 'User not found in room'
      });
    }
    
    res.json({
      success: true,
      message: 'Left room'
    });
  } catch (error) {
    console.error('Error leaving room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to leave room'
    });
  }
};

// Delete a room
exports.deleteRoom = async (req, res) => {
  try {
    const { slug } = req.params;
    
    // User must be authenticated to delete a room
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const room = await Room.findOne({ slug });
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    // Only the room owner can delete the room
    if (!room.ownerId.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only the room owner can delete the room'
      });
    }
    
    // Delete the room
    await Room.deleteOne({ slug });
    
    res.json({
      success: true,
      message: 'Room deleted'
    });
  } catch (error) {
    console.error('Error deleting room:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete room'
    });
  }
};

// Update room code (for OT fallback or initial sync)
exports.updateRoomCode = async (req, res) => {
  try {
    const { slug } = req.params;
    const { code, version } = req.body;
    
    // User must be authenticated to update room code
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const room = await Room.findOne({ slug });
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    // Check user permission to edit code
    const userInRoom = room.users.find(user => 
      user.userId && user.userId.equals(req.user._id)
    );
    
    if (!userInRoom) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this room'
      });
    }
    
    // Check if user has permission to edit code
    const canEdit = ['owner', 'editor'].includes(userInRoom.accessLevel);
    
    if (!canEdit) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to edit code'
      });
    }
    
    // Check version for concurrency control
    if (version && room.version > version) {
      return res.status(409).json({
        success: false,
        message: 'Version conflict - someone else has updated the code',
        currentVersion: room.version
      });
    }
    
    // Update the code
    const updatedRoom = await Room.findOneAndUpdate(
      { slug },
      { 
        $set: { 
          code,
          version: version ? version + 1 : room.version + 1,
          lastActivity: new Date()
        }
      },
      { new: true }
    );
    
    res.json({
      success: true,
      version: updatedRoom.version
    });
  } catch (error) {
    console.error('Error updating room code:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update room code'
    });
  }
};

// List public rooms
exports.listPublicRooms = async (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    
    const rooms = await Room.find({ isPublic: true })
      .sort({ lastActivity: -1 })
      .skip(skip)
      .limit(limit)
      .populate('ownerId', 'username displayName avatar')
      .lean();
    
    const totalRooms = await Room.countDocuments({ isPublic: true });
    
    const safeRooms = rooms.map(room => ({
      slug: room.slug,
      name: room.name,
      description: room.description,
      language: room.language,
      activeUsers: room.activeUsers,
      createdAt: room.createdAt,
      lastActivity: room.lastActivity,
      owner: {
        username: room.ownerId.username,
        displayName: room.ownerId.displayName,
        avatar: room.ownerId.avatar
      }
    }));
    
    res.json({
      success: true,
      rooms: safeRooms,
      pagination: {
        total: totalRooms,
        page,
        limit,
        totalPages: Math.ceil(totalRooms / limit)
      }
    });
  } catch (error) {
    console.error('Error listing public rooms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list public rooms'
    });
  }
};

// Get user's rooms
exports.getUserRooms = async (req, res) => {
  try {
    // User must be authenticated to get their rooms
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const limit = parseInt(req.query.limit) || 10;
    const page = parseInt(req.query.page) || 1;
    const skip = (page - 1) * limit;
    
    // Find rooms where user is owner or member
    const rooms = await Room.find({
      $or: [
        { ownerId: req.user._id },
        { 'users.userId': req.user._id }
      ]
    })
    .sort({ lastActivity: -1 })
    .skip(skip)
    .limit(limit)
    .populate('ownerId', 'username displayName avatar')
    .lean();
    
    const totalRooms = await Room.countDocuments({
      $or: [
        { ownerId: req.user._id },
        { 'users.userId': req.user._id }
      ]
    });
    
    const safeRooms = rooms.map(room => {
      const userRecord = room.users.find(user => 
        user.userId && user.userId.equals(req.user._id)
      );
      
      return {
        slug: room.slug,
        name: room.name,
        description: room.description,
        language: room.language,
        isPublic: room.isPublic,
        activeUsers: room.activeUsers,
        createdAt: room.createdAt,
        lastActivity: room.lastActivity,
        isOwner: room.ownerId.equals(req.user._id),
        accessLevel: userRecord ? userRecord.accessLevel : 'viewer',
        owner: {
          username: room.ownerId.username,
          displayName: room.ownerId.displayName,
          avatar: room.ownerId.avatar
        }
      };
    });
    
    res.json({
      success: true,
      rooms: safeRooms,
      pagination: {
        total: totalRooms,
        page,
        limit,
        totalPages: Math.ceil(totalRooms / limit)
      }
    });
  } catch (error) {
    console.error('Error getting user rooms:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get user rooms'
    });
  }
};

// Update user cursor position
exports.updateCursorPosition = async (slug, userId, position, selection) => {
  try {
    // Convert userId to ObjectId if it's a string
    const userObjectId = mongoose.Types.ObjectId.isValid(userId) 
      ? new mongoose.Types.ObjectId(userId) 
      : null;
      
    if (!userObjectId) {
      console.error('Invalid user ID for cursor update');
      return null;
    }
    
    // Update cursor position
    const result = await Room.updateOne(
      { slug, 'users.userId': userObjectId },
      { 
        $set: { 
          'users.$.cursor.position': position,
          'users.$.cursor.selection': selection,
          'users.$.lastActivity': new Date()
        }
      }
    );
    
    return result.nModified > 0;
  } catch (error) {
    console.error(`Error updating cursor for ${userId} in room ${slug}:`, error);
    return false;
  }
};

// Add chat message
exports.addChatMessage = async (req, res) => {
  try {
    const { slug } = req.params;
    const { message } = req.body;
    
    // User must be authenticated to send a chat message
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const room = await Room.findOne({ slug });
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    // Check if user is in the room
    const userInRoom = room.users.find(user => 
      user.userId && user.userId.equals(req.user._id)
    );
    
    if (!userInRoom) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this room'
      });
    }
    
    // Add chat message
    const chatMessage = {
      userId: req.user._id,
      userName: req.user.displayName || req.user.username,
      message,
      timestamp: new Date()
    };
    
    await Room.updateOne(
      { slug },
      { 
        $push: { chat: chatMessage },
        $set: { lastActivity: new Date() }
      }
    );
    
    res.json({
      success: true,
      message: 'Chat message added',
      chat: chatMessage
    });
  } catch (error) {
    console.error('Error adding chat message:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to add chat message'
    });
  }
};

// Get room chat history
exports.getRoomChat = async (req, res) => {
  try {
    const { slug } = req.params;
    const limit = parseInt(req.query.limit) || 50;
    
    // User must be authenticated to view chat history
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const room = await Room.findOne({ slug });
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    // Check if user is in the room
    const userInRoom = room.users.find(user => 
      user.userId && user.userId.equals(req.user._id)
    );
    
    if (!userInRoom) {
      return res.status(403).json({
        success: false,
        message: 'You are not a member of this room'
      });
    }
    
    // Get recent chat messages
    const chatHistory = room.chat
      .slice(-limit)
      .map(msg => ({
        userId: msg.userId,
        userName: msg.userName,
        message: msg.message,
        timestamp: msg.timestamp,
        isCurrentUser: msg.userId.equals(req.user._id)
      }));
    
    res.json({
      success: true,
      chat: chatHistory
    });
  } catch (error) {
    console.error('Error getting room chat:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get room chat'
    });
  }
};

// Transfer room ownership
exports.transferOwnership = async (req, res) => {
  try {
    const { slug } = req.params;
    const { newOwnerId } = req.body;
    
    // User must be authenticated to transfer ownership
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const room = await Room.findOne({ slug });
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    // Only the room owner can transfer ownership
    if (!room.ownerId.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only the room owner can transfer ownership'
      });
    }
    
    // Convert newOwnerId to ObjectId if it's a string
    const newOwnerObjectId = mongoose.Types.ObjectId.isValid(newOwnerId) 
      ? new mongoose.Types.ObjectId(newOwnerId) 
      : null;
      
    if (!newOwnerObjectId) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID'
      });
    }
    
    // Check if new owner is in the room
    const newOwnerInRoom = room.users.find(user => 
      user.userId && user.userId.equals(newOwnerObjectId)
    );
    
    if (!newOwnerInRoom) {
      return res.status(404).json({
        success: false,
        message: 'New owner is not a member of this room'
      });
    }
    
    // Update new owner's access level
    await Room.updateOne(
      { slug, 'users.userId': newOwnerObjectId },
      { 
        $set: { 
          'users.$.accessLevel': 'owner',
        }
      }
    );
    
    // Update old owner's access level
    await Room.updateOne(
      { slug, 'users.userId': req.user._id },
      { 
        $set: { 
          'users.$.accessLevel': 'editor',
        }
      }
    );
    
    // Update room owner
    await Room.updateOne(
      { slug },
      { 
        $set: { 
          ownerId: newOwnerObjectId,
          lastActivity: new Date()
        }
      }
    );
    
    res.json({
      success: true,
      message: 'Room ownership transferred'
    });
  } catch (error) {
    console.error('Error transferring room ownership:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to transfer room ownership'
    });
  }
};

// Extend room expiration
exports.extendRoomExpiration = async (req, res) => {
  try {
    const { slug } = req.params;
    const { days } = req.body;
    
    // User must be authenticated to extend room expiration
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required'
      });
    }
    
    const room = await Room.findOne({ slug });
    
    if (!room) {
      return res.status(404).json({
        success: false,
        message: 'Room not found'
      });
    }
    
    // Only the room owner can extend expiration
    if (!room.ownerId.equals(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Only the room owner can extend room expiration'
      });
    }
    
    // Calculate new expiration date
    const extensionDays = Math.min(Math.max(parseInt(days) || 30, 1), 90); // Between 1 and 90 days
    const newExpiryDate = new Date(room.expiresAt);
    newExpiryDate.setDate(newExpiryDate.getDate() + extensionDays);
    
    // Update expiration date
    await Room.updateOne(
      { slug },
      { 
        $set: { 
          expiresAt: newExpiryDate,
          lastActivity: new Date()
        }
      }
    );
    
    res.json({
      success: true,
      message: `Room expiration extended by ${extensionDays} days`,
      newExpiryDate
    });
  } catch (error) {
    console.error('Error extending room expiration:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to extend room expiration'
    });
  }
};
