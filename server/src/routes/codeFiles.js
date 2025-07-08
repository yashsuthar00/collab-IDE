const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const codeFileController = require('../controllers/codeFileController');

/**
 * @route   GET /api/codefiles/recent
 * @desc    Get recent code files
 * @access  Private
 */
router.get('/recent', auth, codeFileController.getRecentFiles);

/**
 * @route   GET /api/codefiles/filter-options
 * @desc    Get available filter options for the current user's files
 * @access  Private
 */
router.get('/filter-options', auth, codeFileController.getFilterOptions);

/**
 * @route   POST /api/codefiles/save-current
 * @desc    Save the current editor code to a new or existing file
 * @access  Private
 */
router.post('/save-current', auth, codeFileController.saveCurrentCode);

/**
 * @route   POST /api/codefiles/duplicate
 * @desc    Duplicate an existing code file
 * @access  Private
 */
router.post('/duplicate', auth, codeFileController.duplicateCodeFile);

/**
 * @route   GET /api/codefiles
 * @desc    Get all code files for the logged in user with advanced filtering
 * @access  Private
 */
router.get('/', auth, codeFileController.getAllFiles);

/**
 * @route   POST /api/codefiles
 * @desc    Create a new code file
 * @access  Private
 */
router.post('/', auth, codeFileController.createCodeFile);

/**
 * @route   GET /api/codefiles/:id
 * @desc    Get a single code file by ID
 * @access  Private/Public (depending on isPublic flag)
 */
router.get('/:id', optionalAuth, codeFileController.getFileById);

/**
 * @route   PUT /api/codefiles/:id
 * @desc    Update a code file
 * @access  Private
 */
router.put('/:id', auth, codeFileController.updateCodeFile);

/**
 * @route   DELETE /api/codefiles/:id
 * @desc    Delete a code file
 * @access  Private
 */
router.delete('/:id', auth, codeFileController.deleteCodeFile);

module.exports = router;
