const mongoose = require('mongoose');

const roomUserSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  accessLevel: {
    type: String,
    enum: ['owner', 'editor', 'runner', 'viewer'],
    default: 'viewer'
  },
  isActive: {
    type: Boolean,
    default: true
  },
  joinedAt: {
    type: Date,
    default: Date.now
  }
});

const roomSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  language: {
    type: String,
    default: 'javascript'
  },
  code: {
    type: String,
    default: ''
  },
  owner: {
    type: String,
    required: true
  },
  users: [roomUserSchema],
  version: {
    type: Number,
    default: 0
  },
  lastActivity: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
