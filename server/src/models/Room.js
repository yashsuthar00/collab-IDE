const mongoose = require('mongoose');

const roomUserSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  socketId: {
    type: String
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
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  cursor: {
    position: {
      lineNumber: Number,
      column: Number
    },
    selection: {
      startLineNumber: Number,
      startColumn: Number,
      endLineNumber: Number,
      endColumn: Number
    }
  }
});

const roomSchema = new mongoose.Schema({
  slug: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  name: {
    type: String,
    required: true
  },
  description: {
    type: String,
    default: ''
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  language: {
    type: String,
    default: 'javascript'
  },
  code: {
    type: String,
    default: ''
  },
  ownerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  users: [roomUserSchema],
  activeUsers: {
    type: Number,
    default: 0
  },
  version: {
    type: Number,
    default: 0
  },
  settings: {
    readOnly: {
      type: Boolean,
      default: false
    },
    autoSave: {
      type: Boolean,
      default: true
    },
    theme: {
      type: String,
      enum: ['light', 'dark', 'system'],
      default: 'system'
    },
    tabSize: {
      type: Number,
      default: 2
    },
    wrapLines: {
      type: Boolean,
      default: true
    }
  },
  chat: [{
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    userName: String,
    message: String,
    timestamp: {
      type: Date,
      default: Date.now
    }
  }],
  createdAt: {
    type: Date,
    default: Date.now
  },
  lastActivity: {
    type: Date,
    default: Date.now
  },
  expiresAt: {
    type: Date
  }
}, {
  timestamps: true
});

// Set expiration time when creating a room
roomSchema.pre('save', function(next) {
  if (this.isNew && !this.expiresAt) {
    // Default room expiration: 30 days after creation
    this.expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
  }
  next();
});

// Index for finding rooms by expiration date (for cleanup tasks)
roomSchema.index({ expiresAt: 1 });

// Index for finding public rooms
roomSchema.index({ isPublic: 1, lastActivity: -1 });

const Room = mongoose.model('Room', roomSchema);

module.exports = Room;
