const mongoose = require('mongoose');

const LeetcodeSolutionSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  problemTitle: {
    type: String,
    required: true
  },
  problemDescription: {
    type: String,
    default: ''
  },
  code: {
    type: String,
    required: true
  },
  language: {
    type: String,
    required: true
  },
  difficulty: {
    type: String,
    enum: ['Easy', 'Medium', 'Hard', ''],
    default: ''
  },
  fileId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'CodeFile'
  },
  leetcodeUrl: {
    type: String,
    default: ''
  },
  submittedAt: {
    type: Date,
    default: Date.now
  }
}, {
  timestamps: true
});

// Create a compound index to ensure unique problem titles per user
LeetcodeSolutionSchema.index({ userId: 1, problemTitle: 1 }, { unique: true });

module.exports = mongoose.model('LeetcodeSolution', LeetcodeSolutionSchema);
