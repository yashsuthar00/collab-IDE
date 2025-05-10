const express = require('express');
const router = express.Router();
const Friendship = require('../models/Friendship');
const FriendRequest = require('../models/FriendRequest');
const User = require('../models/User'); // Added User model for search functionality

// Enhanced friend removal endpoint
router.delete('/remove', async (req, res) => {
  try {
    const { userId, friendId, fullRemoval } = req.body;
    
    if (!userId || !friendId) {
      return res.status(400).json({ 
        success: false, 
        message: 'User ID and friend ID are required' 
      });
    }

    // Find and remove the friendship document
    const friendship = await Friendship.findOneAndDelete({
      $or: [
        { user1: userId, user2: friendId },
        { user1: friendId, user2: userId }
      ]
    });

    if (!friendship) {
      return res.status(404).json({ 
        success: false, 
        message: 'Friendship not found' 
      });
    }
    
    // If fullRemoval is true, also remove pending requests
    if (fullRemoval) {
      // Remove any existing friend request between these users
      await FriendRequest.deleteMany({
        $or: [
          { sender: userId, recipient: friendId },
          { sender: friendId, recipient: userId }
        ]
      });
      
      console.log(`Completed full removal of friendship between ${userId} and ${friendId}`);
    }

    res.json({ 
      success: true, 
      message: 'Friend removed successfully' 
    });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to remove friend', 
      error: error.message 
    });
  }
});

// Enhanced search users endpoint with better error handling
router.get('/search', async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 3) {
      return res.status(400).json({ 
        success: false, 
        message: 'Search query must be at least 3 characters long',
        users: []
      });
    }

    // Find users matching the query
    const users = await User.find({
      username: { $regex: query, $options: 'i' },
      _id: { $ne: req.user._id } // Exclude current user
    }).limit(10).select('username email avatar status');

    // Get the current user's friends and pending requests
    const friends = await Friendship.find({
      $or: [
        { user1: req.user._id },
        { user2: req.user._id }
      ]
    });
    
    const friendIds = friends.map(friendship => {
      return friendship.user1.toString() === req.user._id.toString() 
        ? friendship.user2
        : friendship.user1;
    });

    // Get pending requests (sent and received)
    const pendingRequests = await FriendRequest.find({
      $or: [
        { sender: req.user._id },
        { recipient: req.user._id }
      ],
      status: 'pending'
    });

    // Update user list with friendship status
    const enrichedUsers = users.map(user => {
      const userData = user.toObject();
      
      // Check if user is already a friend
      if (friendIds.some(id => id.toString() === userData._id.toString())) {
        userData.friendStatus = 'friend';
      } 
      // Check if there's a pending request from current user to this user
      else if (pendingRequests.some(req => 
        req.sender.toString() === req.user._id.toString() && 
        req.recipient.toString() === userData._id.toString()
      )) {
        userData.friendStatus = 'request_sent';
      } 
      // Check if there's a pending request from this user to current user
      else if (pendingRequests.some(req => 
        req.sender.toString() === userData._id.toString() && 
        req.recipient.toString() === req.user._id.toString()
      )) {
        userData.friendStatus = 'request_received';
      } 
      else {
        userData.friendStatus = 'not_friend';
      }
      
      return userData;
    });

    res.json({ success: true, users: enrichedUsers });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to search users', 
      error: error.message,
      users: [] // Always include empty users array even on error
    });
  }
});

module.exports = router;