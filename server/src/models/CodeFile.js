const mongoose = require('mongoose');

const CodeFileSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  code: {
    type: String,
    required: true
  },
  // Rename 'language' to 'programmingLanguage' to avoid MongoDB conflict
  programmingLanguage: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['easy', 'medium', 'hard'],
    default: 'easy'
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  directory: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Directory',
    default: null
  },
  isPublic: {
    type: Boolean,
    default: false
  },
  lastModified: {
    type: Date,
    default: Date.now
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
}, { timestamps: true });

// Index for faster querying by owner and directory
CodeFileSchema.index({ owner: 1, directory: 1 });
// Modify text index to include name but not use programmingLanguage
CodeFileSchema.index({ name: 'text' }); // For text search

const CodeFile = mongoose.model('CodeFile', CodeFileSchema);

module.exports = CodeFile;
