const mongoose = require('mongoose');

const DirectorySchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  parent: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Directory',
    default: null
  },
  description: {
    type: String,
    default: ''
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for faster querying by owner and parent
DirectorySchema.index({ owner: 1, parent: 1 });
DirectorySchema.index({ name: 'text' }); // For text search

const Directory = mongoose.model('Directory', DirectorySchema);

module.exports = Directory;
