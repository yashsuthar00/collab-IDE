const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const CodeFile = require('../models/CodeFile');
const Directory = require('../models/Directory');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

// GET /api/codefiles/recent
router.get('/recent', auth, async (req, res) => {
  try {
    const { limit = 5 } = req.query;
    
    const recentFiles = await CodeFile.find({ owner: req.user.id })
      .sort({ lastModified: -1 })
      .limit(parseInt(limit))
      .select('-code')
      .populate('directory', 'name');
    
    // Transform response to maintain API compatibility
    const transformedFiles = recentFiles.map(file => {
      const fileObj = file.toObject();
      fileObj.language = fileObj.programmingLanguage;
      return fileObj;
    });
    
    res.json(transformedFiles);
  } catch (err) {
    logger.error('Error getting recent files:', err);
    res.status(500).json({ msg: 'Server error', details: err.message });
  }
});

// GET /api/codefiles/filter-options
router.get('/filter-options', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Find all code files for this user
    const files = await CodeFile.find({ owner: userId })
      .sort({ createdAt: -1 })
      .lean();
    
    // Extract unique languages and count files per language
    const languages = [...new Set(files.map(file => file.programmingLanguage))];
    
    const languageCounts = {};
    for (const file of files) {
      const lang = file.programmingLanguage;
      languageCounts[lang] = (languageCounts[lang] || 0) + 1;
    }
    
    // Find oldest and newest files
    const oldestFile = files.length > 0 ? files.reduce((prev, curr) => 
      new Date(prev.createdAt) < new Date(curr.createdAt) ? prev : curr
    ) : null;
    
    const newestFile = files.length > 0 ? files.reduce((prev, curr) => 
      new Date(prev.createdAt) > new Date(curr.createdAt) ? prev : curr
    ) : null;
    
    // Count files per directory
    const directoriesWithFiles = {};
    let rootFilesCount = 0;
    
    for (const file of files) {
      if (file.directory) {
        directoriesWithFiles[file.directory] = (directoriesWithFiles[file.directory] || 0) + 1;
      } else {
        rootFilesCount++;
      }
    }
    
    // Get directory names
    const directoryIds = Object.keys(directoriesWithFiles);
    let directoriesWithNames = {};
    
    if (directoryIds.length > 0) {
      const directories = await Directory.find({ 
        _id: { $in: directoryIds.map(id => mongoose.Types.ObjectId(id)) },
        owner: userId
      }).select('_id name').lean();
      
      // Replace IDs with names in the count object
      for (const dir of directories) {
        directoriesWithNames[dir.name] = directoriesWithFiles[dir._id];
      }
    }
    
    res.json({
      languages,
      languageCounts,
      dateRange: {
        oldest: oldestFile ? oldestFile.createdAt : null,
        newest: newestFile ? newestFile.createdAt : null
      },
      directories: {
        withFiles: directoriesWithNames,
        rootFilesCount
      }
    });
  } catch (err) {
    logger.error('Error getting filter options:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

// POST /api/codefiles/save-current
router.post('/save-current', auth, async (req, res) => {
  try {
    logger.debug('saveCurrentCode called', req.body);
    const { name, code, language, directoryId, isPublic, fileId } = req.body;
    
    // Validate required fields
    if (!name || !code || !language) {
      return res.status(400).json({ msg: 'Please provide name, code, and language' });
    }
    
    // Check if we're updating an existing file or creating a new one
    if (fileId) {
      // Check if file exists and belongs to the user
      const existingFile = await CodeFile.findById(fileId);
      
      if (!existingFile) {
        return res.status(404).json({ msg: 'File not found' });
      }
      
      if (existingFile.owner.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'Not authorized to update this file' });
      }
      
      // Update existing file
      existingFile.name = name;
      existingFile.code = code;
      existingFile.programmingLanguage = language; // Updated field name
      
      // Update directory if provided
      if (directoryId !== undefined) {
        // Handle root directory case
        if (directoryId === "null") {
          existingFile.directory = null;
        } else if (directoryId) {
          // Verify the directory exists and user has access
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
          
          existingFile.directory = directoryId;
        }
      }
      
      // Update public flag if provided
      if (isPublic !== undefined) {
        existingFile.isPublic = isPublic;
      }
      
      // Update lastModified timestamp
      existingFile.lastModified = new Date();
      
      await existingFile.save();
      
      // Transform the response to maintain API compatibility
      const responseFile = {
        ...existingFile.toObject(),
        language: existingFile.programmingLanguage
      };
      
      return res.json({
        success: true,
        file: responseFile,
        message: 'File updated successfully'
      });
    } else {
      // Create new file
      // Check directory if provided
      if (directoryId && directoryId !== "null") {
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
      
      // Create new code file using programmingLanguage instead of language
      const newFile = new CodeFile({
        name,
        code,
        programmingLanguage: language, // Updated field name
        owner: req.user.id,
        directory: directoryId === "null" ? null : directoryId || null,
        isPublic: isPublic || false
      });
      
      await newFile.save();
      
      // Transform the response to maintain API compatibility
      const responseFile = {
        ...newFile.toObject(),
        language: newFile.programmingLanguage
      };
      
      return res.status(201).json({
        success: true,
        file: responseFile,
        message: 'File created successfully'
      });
    }
  } catch (err) {
    logger.error('Error saving code file:', err);
    return res.status(500).json({ msg: 'Server error', details: err.message });
  }
});

// POST /api/codefiles/duplicate
router.post('/duplicate', auth, async (req, res) => {
  try {
    const { fileId, newName, directoryId } = req.body;
    
    // Validate required fields
    if (!fileId) {
      return res.status(400).json({ msg: 'Please provide the file ID to duplicate' });
    }
    
    // Get the source file
    const sourceFile = await CodeFile.findById(fileId);
    
    if (!sourceFile) {
      return res.status(404).json({ msg: 'Source file not found' });
    }
    
    // Check if user has access to this file
    if (sourceFile.owner.toString() !== req.user.id && !sourceFile.isPublic) {
      return res.status(401).json({ msg: 'Not authorized to duplicate this file' });
    }
    
    // Create a new file as a duplicate
    const duplicatedFile = new CodeFile({
      name: newName || `${sourceFile.name} (copy)`,
      code: sourceFile.code,
      programmingLanguage: sourceFile.programmingLanguage, // Updated field name
      owner: req.user.id,
      directory: directoryId || sourceFile.directory,
      isPublic: false // Default to private for duplicated files
    });
    
    await duplicatedFile.save();
    
    // Transform response to maintain API compatibility
    const responseFile = {
      ...duplicatedFile.toObject(),
      language: duplicatedFile.programmingLanguage
    };
    
    res.status(201).json({
      success: true,
      file: responseFile,
      message: 'File duplicated successfully'
    });
  } catch (err) {
    logger.error('Error duplicating code file:', err);
    res.status(500).json({ msg: 'Server error', details: err.message });
  }
});

// GET /api/codefiles
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

// GET /api/codefiles/:id
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const codeFile = await CodeFile.findById(req.params.id)
      .populate('directory', 'name')
      .populate('owner', 'username email');
    
    if (!codeFile) {
      return res.status(404).json({ msg: 'Code file not found' });
    }
    
    // Check if user has access to this file
    if (!codeFile.isPublic && (!req.user || codeFile.owner._id.toString() !== req.user.id)) {
      return res.status(403).json({ msg: 'Access denied' });
    }
    
    // Transform response to maintain API compatibility
    const transformedFile = codeFile.toObject();
    transformedFile.language = transformedFile.programmingLanguage;
    
    res.json(transformedFile);
  } catch (err) {
    logger.error('Error getting code file:', err);
    res.status(500).json({ msg: 'Server error', details: err.message });
  }
});

// POST /api/codefiles
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

// PUT /api/codefiles/:id
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

// DELETE /api/codefiles/:id
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

module.exports = router;
