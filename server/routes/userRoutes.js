const express = require('express');
const router = express.Router();
const Friendship = require('../models/Friendship');
const FriendRequest = require('../models/FriendRequest');

// Enhanced add friend endpoint
router.post('/add-friend', async (req, res) => {
  try {
    const { senderId, recipientId, senderName, recipientName } = req.body;
    
    if (!senderId || !recipientId) {
      return res.status(400).json({ success: false, message: 'Sender and recipient IDs are required' });
    }
    
    // Check if users are already friends
    const existingFriendship = await Friendship.findOne({
      $or: [
        { user1: senderId, user2: recipientId },
        { user1: recipientId, user2: senderId }
      ]
    });
    
    if (existingFriendship) {
      return res.status(400).json({ success: false, message: 'Users are already friends' });
    }
    
    // Check for existing requests - we need to be thorough here
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: senderId, recipient: recipientId },
        { sender: recipientId, recipient: senderId }
      ]
    });
    
    // Important: Delete any stale request that might be causing the bug
    if (existingRequest) {
      await FriendRequest.deleteOne({ _id: existingRequest._id });
      console.log(`Removed stale friend request between ${senderId} and ${recipientId}`);
    }
    
    // Create a new friend request
    const newRequest = new FriendRequest({
      sender: senderId,
      recipient: recipientId,
      senderName,
      recipientName,
      status: 'pending',
      createdAt: new Date()
    });
    
    await newRequest.save();
    
    res.json({ 
      success: true, 
      message: 'Friend request sent', 
      request: newRequest 
    });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send friend request', 
      error: error.message 
    });
  }
});

module.exports = router;