const mongoose = require('mongoose');

const roomInvitationSchema = new mongoose.Schema({
  sender: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  recipient: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  roomId: {
    type: String,
    required: true
  },
  roomName: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'accepted', 'declined'],
    default: 'pending'
  },
  createdAt: {
    type: Date,
    default: Date.now,
    expires: '7d' // Automatically remove invitations after 7 days
  }
});

// Allow multiple invitations to the same room
roomInvitationSchema.index({ sender: 1, recipient: 1, roomId: 1 }, { unique: true });

const RoomInvitation = mongoose.model('RoomInvitation', roomInvitationSchema);

module.exports = RoomInvitation;
