const express = require('express');
const { protect } = require('../middleware/authMiddleware');
const { 
  saveLeetcodeSolution, 
  getLeetcodeSolutions,
  getLeetcodeSolutionById,
  deleteLeetcodeSolution
} = require('../controllers/leetcodeController');
const logger = require('../utils/logger');

const router = express.Router();

// Debug middleware to log request details
router.use((req, res, next) => {
  logger.debug(`LeetCode route accessed: ${req.method} ${req.path}`, {
    hasAuthHeader: !!req.headers.authorization,
    headerValue: req.headers.authorization ? req.headers.authorization.substring(0, 15) + '...' : 'none'
  });
  next();
});

// All routes require authentication
router.use(protect);

// Log after authentication middleware
router.use((req, res, next) => {
  logger.debug('User authenticated for LeetCode route', {
    userId: req.user ? req.user._id : 'unknown',
    path: req.path
  });
  next();
});

// Save a LeetCode solution
router.post('/save', saveLeetcodeSolution);

// Get all LeetCode solutions for the authenticated user
router.get('/', getLeetcodeSolutions);

// Get a specific LeetCode solution by ID
router.get('/:id', getLeetcodeSolutionById);

// Delete a LeetCode solution
router.delete('/:id', deleteLeetcodeSolution);

module.exports = router;
