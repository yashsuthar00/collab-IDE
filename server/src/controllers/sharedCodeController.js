const SharedCode = require('../models/SharedCode');
const crypto = require('crypto');

// Helper function to generate a short, random slug
const generateSlug = () => {
  return crypto.randomBytes(4).toString('hex');
};

// Create a new shared code link
exports.createSharedCode = async (req, res) => {
  try {
    const { code, language, expiresIn = 604800 } = req.body; // Default expiry: 7 days (in seconds)
    
    if (!code) {
      return res.status(400).json({ success: false, message: 'Code is required' });
    }
    
    if (!language) {
      return res.status(400).json({ success: false, message: 'Language is required' });
    }
    
    // Generate expiration date based on expiresIn seconds
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    
    // Generate a unique slug for the URL
    const slug = generateSlug();
    
    // Create new shared code document
    const sharedCode = new SharedCode({
      code,
      language,
      slug,
      expiresAt,
      createdBy: req.user ? req.user._id : null // Associate with user if logged in
    });
    
    await sharedCode.save();
    
    return res.status(201).json({
      success: true,
      data: {
        slug,
        expiresAt,
        shareUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/shared/${slug}`
      }
    });
  } catch (error) {
    console.error('Error creating shared code:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while creating shared code link',
      error: error.message
    });
  }
};

// Get shared code by slug
exports.getSharedCode = async (req, res) => {
  try {
    const { slug } = req.params;
    
    if (!slug) {
      return res.status(400).json({ success: false, message: 'Slug is required' });
    }
    
    const sharedCode = await SharedCode.findOne({ slug });
    
    if (!sharedCode) {
      return res.status(404).json({ success: false, message: 'Shared code not found or has expired' });
    }
    
    // Increment view count
    sharedCode.viewCount += 1;
    await sharedCode.save();
    
    return res.status(200).json({
      success: true,
      data: {
        code: sharedCode.code,
        language: sharedCode.language,
        createdAt: sharedCode.createdAt,
        expiresAt: sharedCode.expiresAt,
        viewCount: sharedCode.viewCount
      }
    });
  } catch (error) {
    console.error('Error retrieving shared code:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while retrieving shared code',
      error: error.message
    });
  }
};

// Delete shared code by slug (owner only)
exports.deleteSharedCode = async (req, res) => {
  try {
    const { slug } = req.params;
    
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    const sharedCode = await SharedCode.findOne({ slug });
    
    if (!sharedCode) {
      return res.status(404).json({ success: false, message: 'Shared code not found' });
    }
    
    // Check if the user is the owner of the shared code
    if (sharedCode.createdBy && !sharedCode.createdBy.equals(req.user._id)) {
      return res.status(403).json({ success: false, message: 'Not authorized to delete this shared code' });
    }
    
    await SharedCode.deleteOne({ _id: sharedCode._id });
    
    return res.status(200).json({
      success: true,
      message: 'Shared code deleted successfully'
    });
  } catch (error) {
    console.error('Error deleting shared code:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while deleting shared code',
      error: error.message
    });
  }
};

// Get all shared codes for a user
exports.getUserSharedCodes = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ success: false, message: 'Authentication required' });
    }
    
    const sharedCodes = await SharedCode.find({ createdBy: req.user._id })
      .sort({ createdAt: -1 })
      .select('slug language createdAt expiresAt viewCount');
    
    return res.status(200).json({
      success: true,
      data: sharedCodes.map(code => ({
        slug: code.slug,
        language: code.language,
        createdAt: code.createdAt,
        expiresAt: code.expiresAt,
        viewCount: code.viewCount,
        shareUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/shared/${code.slug}`
      }))
    });
  } catch (error) {
    console.error('Error retrieving user shared codes:', error);
    return res.status(500).json({
      success: false,
      message: 'Server error while retrieving user shared codes',
      error: error.message
    });
  }
};
