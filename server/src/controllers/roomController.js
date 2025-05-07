const Room = require('../models/Room');
const { v4: uuidv4 } = require('uuid');

// Create a new room
exports.createRoom = async (req, res) => {
  try {
    const { name, language, owner, userName } = req.body;
    
    const roomId = uuidv4().slice(0, 8);
    
    const room = await Room.create({
      id: roomId,
      name: name || `Room ${roomId}`,
      language: language || 'javascript',
      owner,
      users: [{
        id: owner,
        name: userName,
        accessLevel: 'owner',
        isActive: true,
        joinedAt: new Date()
      }],
      code: '',
      version: 0
    });
    
    res.status(201).json({
      success: true,
      roomId: room.id
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
    const { roomId } = req.params;
    
    const room = await Room.findOne({ id: roomId });
    
    if (!room) {
      return res.status(404).json({
        success: false,
        roomExists: false,
        message: 'Room not found'
      });
    }
    
    // Return safe data only
    const safeRoomData = {
      success: true,
      roomExists: true,
      id: room.id,
      name: room.name,
      createdAt: room.createdAt,
      language: room.language,
      owner: room.owner,
      userCount: room.users.length
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

// Update room code
exports.updateRoomCode = async (roomId, code, version) => {
  try {
    const room = await Room.findOneAndUpdate(
      { id: roomId },
      { 
        $set: { 
          code,
          version,
          lastActivity: new Date()
        }
      },
      { new: true }
    );
    
    return room;
  } catch (error) {
    console.error(`Error updating room code for ${roomId}:`, error);
    return null;
  }
};

// Update user access level
exports.updateUserAccess = async (roomId, userId, accessLevel) => {
  try {
    const room = await Room.findOneAndUpdate(
      { 
        id: roomId,
        'users.id': userId 
      },
      { 
        $set: { 
          'users.$.accessLevel': accessLevel,
          lastActivity: new Date()
        }
      },
      { new: true }
    );
    
    return room;
  } catch (error) {
    console.error(`Error updating user access in ${roomId}:`, error);
    return null;
  }
};

// Remove user from room
exports.removeUser = async (roomId, userId) => {
  try {
    const room = await Room.findOneAndUpdate(
      { id: roomId },
      { 
        $pull: { users: { id: userId } },
        lastActivity: new Date()
      },
      { new: true }
    );
    
    return room;
  } catch (error) {
    console.error(`Error removing user ${userId} from ${roomId}:`, error);
    return null;
  }
};

// Delete room
exports.deleteRoom = async (roomId) => {
  try {
    await Room.deleteOne({ id: roomId });
    return true;
  } catch (error) {
    console.error(`Error deleting room ${roomId}:`, error);
    return false;
  }
};
