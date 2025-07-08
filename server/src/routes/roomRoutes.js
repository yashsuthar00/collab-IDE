const express = require('express');
const roomController = require('../controllers/roomController');
const { protect } = require('../middleware/authMiddleware');
const { optionalAuth } = require('../middleware/optionalAuth');

const router = express.Router();

// Public routes - no authentication required
// Get room details (with optional auth for checking access)
router.get('/:slug', optionalAuth, roomController.getRoomDetails);

// List public rooms
router.get('/', roomController.listPublicRooms);

// Protected routes - authentication required
// Create a room
router.post('/', protect, roomController.createRoom);

// Join a room
router.post('/:slug/join', protect, roomController.joinRoom);

// Leave a room
router.post('/:slug/leave', protect, roomController.leaveRoom);

// Update room settings
router.put('/:slug/settings', protect, roomController.updateRoomSettings);

// Get room users
router.get('/:slug/users', optionalAuth, roomController.getRoomUsers);

// Update user access level
router.put('/:slug/users/:userId/access', protect, roomController.updateUserAccess);

// Add chat message
router.post('/:slug/chat', protect, roomController.addChatMessage);

// Get room chat history
router.get('/:slug/chat', protect, roomController.getRoomChat);

// Transfer room ownership
router.post('/:slug/transfer-ownership', protect, roomController.transferOwnership);

// Delete a room
router.delete('/:slug', protect, roomController.deleteRoom);

// Update room code
router.put('/:slug/code', protect, roomController.updateRoomCode);

// Extend room expiration
router.post('/:slug/extend', protect, roomController.extendRoomExpiration);

// Get user's rooms
router.get('/user/rooms', protect, roomController.getUserRooms);

module.exports = router;
