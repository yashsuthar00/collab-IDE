const RoomInvitation = require('../models/RoomInvitation');
const User = require('../models/User');

// Send room invitation
exports.sendInvitation = async (req, res) => {
  try {
    const { recipientId, roomId, roomName } = req.body;
    
    if (!recipientId || !roomId || !roomName) {
      return res.status(400).json({
        success: false,
        message: 'Missing required fields'
      });
    }
    
    // Check if recipient exists
    const recipient = await User.findById(recipientId);
    if (!recipient) {
      return res.status(404).json({
        success: false,
        message: 'Recipient not found'
      });
    }
    
    // Check if sender and recipient are friends
    const sender = await User.findById(req.user.id);
    if (!sender.friends.includes(recipientId)) {
      return res.status(403).json({
        success: false,
        message: 'You can only invite friends to rooms'
      });
    }
    
    // Check if invitation already exists
    let invitation = await RoomInvitation.findOne({
      sender: req.user.id,
      recipient: recipientId,
      roomId
    });
    
    if (invitation) {
      // Update existing invitation if it exists
      invitation.status = 'pending';
      invitation.roomName = roomName;
      invitation.createdAt = Date.now();
      await invitation.save();
    } else {
      // Create new invitation
      invitation = await RoomInvitation.create({
        sender: req.user.id,
        recipient: recipientId,
        roomId,
        roomName
      });
    }
    
    res.status(201).json({
      success: true,
      message: 'Room invitation sent',
      invitation
    });
  } catch (error) {
    console.error('Error sending invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Error sending invitation'
    });
  }
};

// Get pending invitations for the current user
exports.getPendingInvitations = async (req, res) => {
  try {
    const invitations = await RoomInvitation.find({
      recipient: req.user.id,
      status: 'pending'
    }).populate('sender', 'username email avatar');
    
    res.status(200).json({
      success: true,
      invitations
    });
  } catch (error) {
    console.error('Error getting invitations:', error);
    res.status(500).json({
      success: false,
      message: 'Error getting invitations'
    });
  }
};

// Accept invitation
exports.acceptInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;
    
    const invitation = await RoomInvitation.findById(invitationId);
    
    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }
    
    // Check if user is the recipient
    if (invitation.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to accept this invitation'
      });
    }
    
    // Update invitation status
    invitation.status = 'accepted';
    await invitation.save();
    
    res.status(200).json({
      success: true,
      message: 'Invitation accepted',
      roomId: invitation.roomId
    });
  } catch (error) {
    console.error('Error accepting invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Error accepting invitation'
    });
  }
};

// Decline invitation
exports.declineInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;
    
    const invitation = await RoomInvitation.findById(invitationId);
    
    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }
    
    // Check if user is the recipient
    if (invitation.recipient.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to decline this invitation'
      });
    }
    
    // Update invitation status
    invitation.status = 'declined';
    await invitation.save();
    
    res.status(200).json({
      success: true,
      message: 'Invitation declined'
    });
  } catch (error) {
    console.error('Error declining invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Error declining invitation'
    });
  }
};

// Cancel invitation (by sender)
exports.cancelInvitation = async (req, res) => {
  try {
    const { invitationId } = req.params;
    
    const invitation = await RoomInvitation.findById(invitationId);
    
    if (!invitation) {
      return res.status(404).json({
        success: false,
        message: 'Invitation not found'
      });
    }
    
    // Check if user is the sender
    if (invitation.sender.toString() !== req.user.id) {
      return res.status(403).json({
        success: false,
        message: 'You are not authorized to cancel this invitation'
      });
    }
    
    // Remove the invitation
    await RoomInvitation.findByIdAndDelete(invitationId);
    
    res.status(200).json({
      success: true,
      message: 'Invitation cancelled'
    });
  } catch (error) {
    console.error('Error cancelling invitation:', error);
    res.status(500).json({
      success: false,
      message: 'Error cancelling invitation'
    });
  }
};
