const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  getFriends,
  sendFriendRequest,
  acceptFriendRequest,
  rejectFriendRequest,
  cancelFriendRequest,
  removeFriend,
  getPendingRequests,
  getSentRequests,
  searchUsers
} = require('../controllers/friendController');

// Protect all routes
router.use(protect);

// Friend management routes
router.get('/', getFriends);
router.delete('/:friendId', removeFriend);

// Friend request routes
router.post('/requests', sendFriendRequest);
router.put('/requests/:requestId/accept', acceptFriendRequest);
router.put('/requests/:requestId/reject', rejectFriendRequest);
router.delete('/requests/:requestId', cancelFriendRequest);

// Get pending/sent requests
router.get('/requests/pending', getPendingRequests);
router.get('/requests/sent', getSentRequests);

// Search users
router.get('/search', searchUsers);

module.exports = router;
