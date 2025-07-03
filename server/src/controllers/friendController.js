const User = require('../models/User');
const FriendRequest = require('../models/FriendRequest');

// Get all friends for the current user
exports.getFriends = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('friends', 'username email avatar status lastActive');
    
    res.status(200).json({
      success: true,
      friends: user.friends
    });
  } catch (error) {
    console.error('Error getting friends:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting friends'
    });
  }
};

// Send friend request
exports.sendFriendRequest = async (req, res) => {
  try {
    const { recipientId } = req.body;
    
    // Check if trying to add self
    if (recipientId === req.user.id) {
      return res.status(400).json({
        success: false,
        message: 'You cannot add yourself as a friend'
      });
    }
    
    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient user not found'
      });
    }
    
    // Check if already friends
    const currentUser = await User.findById(req.user.id);
    if (currentUser.friends.includes(recipientId)) {
      return res.status(400).json({
        success: false,
        message: 'You are already friends with this user'
      });
    }
    
    // Check if request already exists
    const existingRequest = await FriendRequest.findOne({
      $or: [
        { sender: req.user.id, recipient: recipientId },
        { sender: recipientId, recipient: req.user.id }
      ]
    });
    
    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: 'Friend request already exists'
      });
    }
    
    // Create new friend request
    const friendRequest = await FriendRequest.create({
      sender: req.user.id,
      recipient: recipientId
    });
    
    res.status(201).json({
      success: true,
      message: 'Friend request sent',
      request: friendRequest
    });
  } catch (error) {
    console.error('Error sending friend request:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending friend request'
    });
  }
};

// Accept friend request
exports.acceptFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // Get the friend request
    const friendRequest = await FriendRequest.findById(requestId);
    
    if (!friendRequest) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
    }
    
    // Check if user is the recipient
    if (friendRequest.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to accept this request'
      });
    }
    
    // Update request status
    friendRequest.status = 'accepted';
    await friendRequest.save();
    
    // Add each user to the other's friends list
    await User.findByIdAndUpdate(
      friendRequest.sender,
      { $addToSet: { friends: friendRequest.recipient } }
    );
    
    await User.findByIdAndUpdate(
      friendRequest.recipient,
      { $addToSet: { friends: friendRequest.sender } }
    );
    
    res.status(200).json({
      success: true,
      message: 'Friend request accepted'
    });
  } catch (error) {
    console.error('Error accepting friend request:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting friend request'
    });
  }
};

// Reject friend request
exports.rejectFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // Get the friend request
    const friendRequest = await FriendRequest.findById(requestId);
    
    if (!friendRequest) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
    }
    
    // Check if user is the recipient
    if (friendRequest.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to reject this request'
      });
    }
    
    // Update request status
    friendRequest.status = 'rejected';
    await friendRequest.save();
    
    res.status(200).json({
      success: true,
      message: 'Friend request rejected'
    });
  } catch (error) {
    console.error('Error rejecting friend request:', error);
    res.status(500).json({
      success: false,
      message: 'Error rejecting friend request'
    });
  }
};

// Cancel friend request (by sender)
exports.cancelFriendRequest = async (req, res) => {
  try {
    const { requestId } = req.params;
    
    // Get the friend request
    const friendRequest = await FriendRequest.findById(requestId);
    
    if (!friendRequest) {
      return res.status(404).json({
        success: false,
        message: 'Friend request not found'
      });
    }
    
    // Check if user is the sender
    if (friendRequest.sender.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel this request'
      });
    }
    
    // Delete the friend request
    await FriendRequest.findByIdAndDelete(requestId);
    
    res.status(200).json({
      success: true,
      message: 'Friend request cancelled'
    });
  } catch (error) {
    console.error('Error cancelling friend request:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling friend request'
    });
  }
};

// Remove friend - completely rewritten to ensure thorough cleanup
exports.removeFriend = async (req, res) => {
  try {
    const { friendId } = req.params;
    const userId = req.user.id;
    
    console.log(`Removing friendship between ${userId} and ${friendId}`);
    
    // 1. Remove from both users' friend arrays
    const updatePromises = [
      // Remove friend from current user's friends list
      User.findByIdAndUpdate(
        userId,
        { $pull: { friends: friendId } }
      ),
      
      // Remove current user from friend's friends list
      User.findByIdAndUpdate(
        friendId,
        { $pull: { friends: userId } }
      )
    ];
    
    // Execute both updates in parallel
    await Promise.all(updatePromises);
    
    // 2. Delete any existing friend requests between these users (in any direction)
    await FriendRequest.deleteMany({
      $or: [
        { sender: userId, recipient: friendId },
        { sender: friendId, recipient: userId }
      ]
    });
    
    console.log(`Successfully removed friendship between ${userId} and ${friendId}`);
    
    res.status(200).json({
      success: true,
      message: 'Friend removed successfully'
    });
  } catch (error) {
    console.error('Error removing friend:', error);
    res.status(500).json({
      success: false,
      message: 'Error removing friend',
      error: error.message
    });
  }
};

// Get pending friend requests
exports.getPendingRequests = async (req, res) => {
  try {
    const pendingRequests = await FriendRequest.find({
      recipient: req.user.id,
      status: 'pending'
    }).populate('sender', 'username email avatar');
    
    res.status(200).json({
      success: true,
      pendingRequests
    });
  } catch (error) {
    console.error('Error getting pending requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting pending requests'
    });
  }
};

// Get sent friend requests
exports.getSentRequests = async (req, res) => {
  try {
    const sentRequests = await FriendRequest.find({
      sender: req.user.id,
      status: 'pending'
    }).populate('recipient', 'username email avatar');
    
    res.status(200).json({
      success: true,
      sentRequests
    });
  } catch (error) {
    console.error('Error getting sent requests:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting sent requests'
    });
  }
};

// Search users for adding friends - fixed friend check logic
exports.searchUsers = async (req, res) => {
  try {
    const { query } = req.query;
    
    if (!query || query.length < 3) {
      return res.status(400).json({
        success: false,
        message: 'Search query must be at least 3 characters'
      });
    }

    // Find users matching the query, excluding current user
    const currentUser = await User.findById(req.user.id);
    
    // We need to ensure we exclude current friends properly
    const users = await User.find({
      $and: [
        { _id: { $ne: req.user.id } }, // Not self
        { _id: { $nin: currentUser.friends || [] } }, // Not in friends array
        { 
          $or: [
            { username: { $regex: query, $options: 'i' } },
            { email: { $regex: query, $options: 'i' } }
          ]
        }
      ]
    }).select('username email avatar').limit(10);
    
    // Get pending requests to mark users who already have requests
    const pendingRequests = await FriendRequest.find({
      $or: [
        { sender: req.user.id },
        { recipient: req.user.id }
      ],
      status: 'pending'
    });
    
    // Add friend status to each user
    const usersWithStatus = users.map(user => {
      const pendingRequest = pendingRequests.find(request => 
        (request.sender.toString() === req.user.id && request.recipient.toString() === user._id.toString()) ||
        (request.recipient.toString() === req.user.id && request.sender.toString() === user._id.toString())
      );
      
      let friendStatus = 'none';
      if (pendingRequest) {
        if (pendingRequest.sender.toString() === req.user.id) {
          friendStatus = 'request_sent';
        } else {
          friendStatus = 'request_received';
        }
      }
      
      return {
        ...user.toObject(),
        friendStatus
      };
    });
    
    res.status(200).json({
      success: true,
      users: usersWithStatus
    });
  } catch (error) {
    console.error('Error searching users:', error);
    res.status(500).json({
      success: false,
      message: 'Error searching users'
    });
  }
};
