const CodeFile = require('../models/CodeFile');
const Directory = require('../models/Directory');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * Save the current code from the editor to a new or existing code file
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
exports.saveCurrentCode = async (req, res) => {
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
};

/**
 * Duplicate a code file
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
exports.duplicateCodeFile = async (req, res) => {
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
};

/**
 * Get recent files for the user
 * @param {Object} req - The request object
 * @param {Object} res - The response object
 */
exports.getRecentFiles = async (req, res) => {
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
};
