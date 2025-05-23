const SharedCode = require('../models/SharedCode');

class SharedCodeService {
  /**
   * Create a new shared code entry
   * @param {Object} data - The shared code data
   * @param {string} data.code - The code to share
   * @param {string} data.language - The programming language
   * @param {number} data.expiresIn - Expiration time in seconds (default: 7 days)
   * @param {Object} user - The authenticated user (optional)
   * @returns {Promise<Object>} - The created shared code entry
   */
  static async createSharedCode(data, user = null) {
    const { code, language, expiresIn = 604800 } = data;
    
    // Calculate expiration date
    const expiresAt = new Date(Date.now() + expiresIn * 1000);
    
    // Generate a random slug
    const slug = crypto.randomBytes(4).toString('hex');
    
    const sharedCode = new SharedCode({
      code,
      language,
      slug,
      expiresAt,
      createdBy: user ? user._id : null
    });
    
    await sharedCode.save();
    
    return {
      slug,
      expiresAt,
      shareUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/shared/${slug}`
    };
  }
  
  /**
   * Get shared code by slug
   * @param {string} slug - The unique slug
   * @returns {Promise<Object>} - The shared code entry
   */
  static async getSharedCode(slug) {
    const sharedCode = await SharedCode.findOne({ slug });
    
    if (!sharedCode) {
      throw new Error('Shared code not found or has expired');
    }
    
    // Increment view count
    sharedCode.viewCount += 1;
    await sharedCode.save();
    
    return {
      code: sharedCode.code,
      language: sharedCode.language,
      createdAt: sharedCode.createdAt,
      expiresAt: sharedCode.expiresAt,
      viewCount: sharedCode.viewCount
    };
  }
  
  /**
   * Delete shared code by slug
   * @param {string} slug - The unique slug
   * @param {Object} user - The authenticated user
   * @returns {Promise<boolean>} - Success status
   */
  static async deleteSharedCode(slug, user) {
    const sharedCode = await SharedCode.findOne({ slug });
    
    if (!sharedCode) {
      throw new Error('Shared code not found');
    }
    
    // Check if the user is the owner of the shared code
    if (sharedCode.createdBy && !sharedCode.createdBy.equals(user._id)) {
      throw new Error('Not authorized to delete this shared code');
    }
    
    await SharedCode.deleteOne({ _id: sharedCode._id });
    return true;
  }
  
  /**
   * Get all shared codes for a user
   * @param {Object} user - The authenticated user
   * @returns {Promise<Array>} - List of shared code entries
   */
  static async getUserSharedCodes(user) {
    const sharedCodes = await SharedCode.find({ createdBy: user._id })
      .sort({ createdAt: -1 })
      .select('slug language createdAt expiresAt viewCount');
    
    return sharedCodes.map(code => ({
      slug: code.slug,
      language: code.language,
      createdAt: code.createdAt,
      expiresAt: code.expiresAt,
      viewCount: code.viewCount,
      shareUrl: `${process.env.CLIENT_URL || 'http://localhost:5173'}/shared/${code.slug}`
    }));
  }
}

module.exports = SharedCodeService;
