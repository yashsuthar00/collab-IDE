const express = require('express');
const { createRoom, getRoomDetails } = require('../controllers/roomController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// Create a room - protected route
router.post('/', protect, createRoom);

// Get room details
router.get('/:roomId', getRoomDetails);

module.exports = router;
