const express = require('express');
const router = express.Router();
const CodeFile = require('../models/CodeFile');
const Directory = require('../models/Directory');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// Import controller functions properly
const codeFileController = require('../controllers/codeFileController');

/**
 * @route   GET /api/codefiles/recent
 * @desc    Get recent code files
 * @access  Private
 */
router.get('/recent', auth, codeFileController.getRecentFiles);

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
 * @route   POST /api/codefiles
 * @desc    Create a new code file
 * @access  Private
 */
router.post('/', auth, async (req, res) => {
  try {
    const { name, code, language, directoryId, isPublic } = req.body;
    
    // Validate inputs
    if (!name || !code || !language) {
      return res.status(400).json({ msg: 'Please provide name, code, and language' });
    }
    
    // Check if directory exists and belongs to user (if provided)
    if (directoryId) {
      if (!mongoose.Types.ObjectId.isValid(directoryId)) {
        return res.status(400).json({ msg: 'Invalid directory ID' });
      }
      
      const directory = await Directory.findById(directoryId);
      if (!directory) {
        return res.status(404).json({ msg: 'Directory not found' });
      }
      
      if (directory.owner.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'Not authorized to use this directory' });
      }
    }
    
    // Create new code file with programmingLanguage instead of language
    const codeFile = new CodeFile({
      name,
      code,
      programmingLanguage: language, // Updated field name
      owner: req.user.id,
      directory: directoryId || null,
      isPublic: isPublic || false
    });
    
    await codeFile.save();
    
    // Add language property for backward compatibility
    const responseFile = codeFile.toObject();
    responseFile.language = responseFile.programmingLanguage;
    
    res.status(201).json(responseFile);
  } catch (err) {
    console.error('Error creating code file:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   GET /api/codefiles
 * @desc    Get all code files for the logged in user with advanced filtering
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    // Enhanced query parameters for comprehensive filtering
    const { 
      directory, 
      search, 
      language,
      sort, 
      limit = 20, 
      page = 1,
      isPublic,
      createdAfter,
      createdBefore,
      modifiedAfter,
      modifiedBefore
    } = req.query;
    
    // Build query with owner filter
    const query = { owner: req.user.id };
    
    // Filter by directory
    if (directory) {
      // Handle "root" directory specially (null directory)
      if (directory === 'root') {
        query.directory = null;
      } else if (mongoose.Types.ObjectId.isValid(directory)) {
        query.directory = directory;
      }
    }
    
    // Filter by programming language (can be multiple, comma-separated)
    if (language) {
      const languages = language.split(',').map(lang => lang.trim());
      if (languages.length > 0) {
        query.programmingLanguage = { $in: languages };
      }
    }
    
    // Filter by public/private status
    if (isPublic !== undefined) {
      const isPublicBool = isPublic === 'true';
      query.isPublic = isPublicBool;
    }
    
    // Add date range filters for creation date
    if (createdAfter || createdBefore) {
      query.createdAt = {};
      
      if (createdAfter) {
        query.createdAt.$gte = new Date(createdAfter);
      }
      
      if (createdBefore) {
        query.createdAt.$lte = new Date(createdBefore);
      }
    }
    
    // Add date range filters for last modified date
    if (modifiedAfter || modifiedBefore) {
      query.lastModified = {};
      
      if (modifiedAfter) {
        query.lastModified.$gte = new Date(modifiedAfter);
      }
      
      if (modifiedBefore) {
        query.lastModified.$lte = new Date(modifiedBefore);
      }
    }
    
    // Add text search functionality with improved logic
    if (search) {
      if (search.startsWith('"') && search.endsWith('"')) {
        // Exact phrase search using text index
        query.$text = { $search: search };
      } else {
        // Otherwise do a regex search on the name field
        // Note: This is not as performant for large datasets
        query.$or = [
          { name: { $regex: search, $options: 'i' } },
          // Could also search in code content, but might be expensive
          // { code: { $regex: search, $options: 'i' } }
        ];
      }
    }
    
    // Enhanced sort options
    let sortOption = { lastModified: -1 }; // Default sort by last modified
    
    if (sort === 'name-asc') {
      sortOption = { name: 1 };
    } else if (sort === 'name-desc') {
      sortOption = { name: -1 };
    } else if (sort === 'created-asc') {
      sortOption = { createdAt: 1 };
    } else if (sort === 'created-desc') {
      sortOption = { createdAt: -1 };
    } else if (sort === 'language-asc') {
      sortOption = { programmingLanguage: 1 };
    } else if (sort === 'language-desc') {
      sortOption = { programmingLanguage: -1 };
    }
    
    // Log the query for debugging
    logger.debug('File query:', { query, sort: sortOption });
    
    // Pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const limitNum = parseInt(limit);
    
    // Execute query with pagination
    const codeFiles = await CodeFile.find(query)
      .sort(sortOption)
      .skip(skip)
      .limit(limitNum)
      .select('-code') // Don't include code content in list view for performance
      .populate('directory', 'name');
    
    // Get total count for pagination
    const totalCount = await CodeFile.countDocuments(query);
    
    // Get unique languages for filtering UI
    const availableLanguages = await CodeFile.distinct('programmingLanguage', { owner: req.user.id });
    
    res.json({
      files: codeFiles,
      pagination: {
        total: totalCount,
        page: parseInt(page),
        pages: Math.ceil(totalCount / limitNum)
      },
      filters: {
        availableLanguages
      }
    });
  } catch (err) {
    logger.error('Error getting code files:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   GET /api/codefiles/:id
 * @desc    Get a single code file by ID
 * @access  Private/Public (depending on isPublic flag)
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const codeFile = await CodeFile.findById(req.params.id)
      .populate('directory', 'name')
      .populate('owner', 'username email');
    
    if (!codeFile) {
      return res.status(404).json({ msg: 'Code file not found' });
    }
    
    // Check if user has access to this file
    // A file can be accessed if:
    // 1. The file is public, or
    // 2. The user is authenticated and is the owner
    const isPublic = codeFile.isPublic;
    const userId = req.user ? req.user.id : null;
    const fileOwnerId = codeFile.owner._id ? codeFile.owner._id.toString() : null;
    const isOwner = userId && fileOwnerId && userId === fileOwnerId;
    
    // Debug the access control
    logger.debug('File access check:', { 
      fileId: codeFile._id,
      isPublic, 
      requestUserId: userId,
      fileOwnerId: fileOwnerId,
      isOwner
    });
    
    if (!isPublic && !isOwner) {
      return res.status(401).json({ msg: 'Not authorized to view this file' });
    }
    
    // Add language property for backward compatibility
    const responseFile = codeFile.toObject();
    responseFile.language = responseFile.programmingLanguage;
    
    res.json(responseFile);
  } catch (err) {
    logger.error('Error getting code file:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Code file not found' });
    }
    
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   PUT /api/codefiles/:id
 * @desc    Update a code file
 * @access  Private
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, code, language, directoryId, isPublic } = req.body;
    
    // Find code file
    const codeFile = await CodeFile.findById(req.params.id);
    
    if (!codeFile) {
      return res.status(404).json({ msg: 'Code file not found' });
    }
    
    // Check ownership
    if (codeFile.owner.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized to update this file' });
    }
    
    // Check if new directory exists and belongs to user (if provided)
    if (directoryId && directoryId !== codeFile.directory?.toString()) {
      if (!mongoose.Types.ObjectId.isValid(directoryId)) {
        return res.status(400).json({ msg: 'Invalid directory ID' });
      }
      
      const directory = await Directory.findById(directoryId);
      if (!directory) {
        return res.status(404).json({ msg: 'Directory not found' });
      }
      
      if (directory.owner.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'Not authorized to use this directory' });
      }
      
      codeFile.directory = directoryId;
    } else if (directoryId === "null") {
      // If directoryId is "null" string, set to null (root directory)
      codeFile.directory = null;
    }
    
    // Update fields if provided
    if (name) codeFile.name = name;
    if (code !== undefined) codeFile.code = code;
    if (language) codeFile.programmingLanguage = language; // Updated field name
    if (isPublic !== undefined) codeFile.isPublic = isPublic;
    
    // Update lastModified timestamp
    codeFile.lastModified = Date.now();
    
    await codeFile.save();
    
    // Add language property for backward compatibility
    const responseFile = codeFile.toObject();
    responseFile.language = responseFile.programmingLanguage;
    
    res.json(responseFile);
  } catch (err) {
    logger.error('Error updating code file:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Code file not found' });
    }
    
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   DELETE /api/codefiles/:id
 * @desc    Delete a code file
 * @access  Private
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const codeFile = await CodeFile.findById(req.params.id);
    
    if (!codeFile) {
      return res.status(404).json({ msg: 'Code file not found' });
    }
    
    // Check ownership
    if (codeFile.owner.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized to delete this file' });
    }
    
    // Use deleteOne instead of deprecated remove() method
    await CodeFile.deleteOne({ _id: codeFile._id });
    
    res.json({ msg: 'Code file removed' });
  } catch (err) {
    logger.error('Error deleting code file:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Code file not found' });
    }
    
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   GET /api/codefiles/filter-options
 * @desc    Get available filter options for the current user's files
 * @access  Private
 */
router.get('/filter-options', auth, async (req, res) => {
  try {
    // Get available programming languages for this user's files
    const languages = await CodeFile.distinct('programmingLanguage', { 
      owner: req.user.id 
    });
    
    // Get date range information
    const oldestFile = await CodeFile.findOne({ 
      owner: req.user.id 
    }).sort({ createdAt: 1 }).select('createdAt');
    
    const newestFile = await CodeFile.findOne({ 
      owner: req.user.id 
    }).sort({ createdAt: -1 }).select('createdAt');
    
    // Get directories containing files
    const directoriesWithFiles = await CodeFile.distinct('directory', { 
      owner: req.user.id,
      directory: { $ne: null } // Exclude null directory entries
    });
    
    // Count files by language
    const languageCounts = {};
    for (const language of languages) {
      languageCounts[language] = await CodeFile.countDocuments({
        owner: req.user.id,
        programmingLanguage: language
      });
    }
    
    // Count files with no directory (root)
    const rootFilesCount = await CodeFile.countDocuments({
      owner: req.user.id,
      directory: null
    });
    
    res.json({
      languages,
      languageCounts,
      dateRange: {
        oldest: oldestFile ? oldestFile.createdAt : null,
        newest: newestFile ? newestFile.createdAt : null
      },
      directories: {
        withFiles: directoriesWithFiles,
        rootFilesCount
      }
    });
  } catch (err) {
    logger.error('Error getting filter options:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
