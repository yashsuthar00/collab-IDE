const express = require('express');
const router = express.Router();
const sharedCodeController = require('../controllers/sharedCodeController');
const { protect, optionalAuth } = require('../middleware/authMiddleware');

// Create a new shared code (auth optional)
router.post('/', optionalAuth, sharedCodeController.createSharedCode);

// Get shared code by slug (public)
router.get('/:slug', sharedCodeController.getSharedCode);

// Delete shared code (auth required)
router.delete('/:slug', protect, sharedCodeController.deleteSharedCode);

// Get all user's shared codes (auth required)
router.get('/user/all', protect, sharedCodeController.getUserSharedCodes);

module.exports = router;
