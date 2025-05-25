// Track the current API version
const API_VERSION = process.env.API_VERSION || '1.0.2';

/**
 * Middleware to check client version compatibility
 */
exports.checkClientVersion = (req, res, next) => {
  const clientVersion = req.headers['x-client-version'];
  
  // If no client version is sent, we'll let it pass
  // This allows for gradual implementation of versioning
  if (!clientVersion) {
    return next();
  }
  
  // For now we're doing a simple check
  // In a more complex scenario, you might want to do semantic versioning checks
  if (clientVersion !== API_VERSION) {
    // We'll add a header to warn about version mismatch, but still allow the request
    res.set('X-Version-Mismatch', 'true');
    
    // Log the mismatch for debugging
    console.warn(`Client-server version mismatch: Client ${clientVersion}, Server ${API_VERSION}`);
  }
  
  next();
};
