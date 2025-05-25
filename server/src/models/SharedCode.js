const mongoose = require('mongoose');
const crypto = require('crypto');

// Define shared code schema
const sharedCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: [true, 'Code is required']
  },
  language: {
    type: String,
    required: [true, 'Programming language is required']
  },
  slug: {
    type: String,
    required: true,
    unique: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  expiresAt: {
    type: Date,
    required: true,
    index: { expires: 0 } // TTL index - auto delete expired documents
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

// Helper method to generate a slug
sharedCodeSchema.statics.generateSlug = function() {
  return crypto.randomBytes(4).toString('hex');
};

const SharedCode = mongoose.model('SharedCode', sharedCodeSchema);

module.exports = SharedCode;
