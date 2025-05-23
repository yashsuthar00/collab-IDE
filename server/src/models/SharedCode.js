const mongoose = require('mongoose');

const SharedCodeSchema = new mongoose.Schema({
  code: {
    type: String,
    required: true
  },
  language: {
    type: String,
    required: true
  },
  slug: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: false // Optional, user might not be logged in
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true
  },
  viewCount: {
    type: Number,
    default: 0
  },
  isPublic: {
    type: Boolean,
    default: true
  }
}, { timestamps: true });

// Automatically delete expired shared code documents
SharedCodeSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

module.exports = mongoose.model('SharedCode', SharedCodeSchema);
