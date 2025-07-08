const express = require('express');
const router = express.Router();
const Directory = require('../models/Directory');
const CodeFile = require('../models/CodeFile');
const auth = require('../middleware/auth');
const optionalAuth = require('../middleware/optionalAuth');
const mongoose = require('mongoose');
const logger = require('../utils/logger');

/**
 * @route   POST /api/directories
 * @desc    Create a new directory
 * @access  Private
 */
router.post('/', auth, async (req, res) => {
  try {
    const { name, description, parentId, isPublic } = req.body;
    
    // Validate input
    if (!name) {
      return res.status(400).json({ msg: 'Directory name is required' });
    }
    
    // Check if parent directory exists and belongs to user (if provided)
    if (parentId) {
      if (!mongoose.Types.ObjectId.isValid(parentId)) {
        return res.status(400).json({ msg: 'Invalid parent directory ID' });
      }
      
      const parentDir = await Directory.findById(parentId);
      if (!parentDir) {
        return res.status(404).json({ msg: 'Parent directory not found' });
      }
      
      if (parentDir.owner.toString() !== req.user.id) {
        return res.status(401).json({ msg: 'Not authorized to use this parent directory' });
      }
    }
    
    // Create new directory
    const directory = new Directory({
      name,
      owner: req.user.id,
      parent: parentId || null,
      description: description || '',
      isPublic: isPublic || false
    });
    
    await directory.save();
    
    res.status(201).json(directory);
  } catch (err) {
    console.error('Error creating directory:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   GET /api/directories
 * @desc    Get all directories for the logged in user
 * @access  Private
 */
router.get('/', auth, async (req, res) => {
  try {
    // Get query parameters for filtering
    const { parent, search, sort, includeFiles } = req.query;
    
    // Build query
    const query = { owner: req.user.id };
    
    // Filter by parent directory
    if (parent) {
      // Handle "root" directory specially (null parent)
      if (parent === 'root') {
        query.parent = null;
      } else if (mongoose.Types.ObjectId.isValid(parent)) {
        query.parent = parent;
      }
    }
    
    // Add search functionality
    if (search) {
      query.$text = { $search: search };
    }
    
    // Determine sort order
    let sortOption = { name: 1 }; // Default sort by name
    
    if (sort === 'name-desc') {
      sortOption = { name: -1 };
    } else if (sort === 'created-asc') {
      sortOption = { createdAt: 1 };
    } else if (sort === 'created-desc') {
      sortOption = { createdAt: -1 };
    }
    
    // Get directories
    const directories = await Directory.find(query)
      .sort(sortOption)
      .populate('parent', 'name');
    
    // If includeFiles is set to true, also get files in these directories
    if (includeFiles === 'true') {
      // Get root files if looking at root directories
      const filesQuery = { owner: req.user.id };
      
      if (parent === 'root') {
        filesQuery.directory = null;
      } else if (parent && mongoose.Types.ObjectId.isValid(parent)) {
        filesQuery.directory = parent;
      }
      
      const files = await CodeFile.find(filesQuery)
        .select('-code')
        .sort({ name: 1 });
      
      // Transform files to include language property
      const transformedFiles = files.map(file => {
        const fileObj = file.toObject();
        fileObj.language = fileObj.programmingLanguage; // Add language property
        return fileObj;
      });
      
      return res.json({
        directories,
        files: transformedFiles
      });
    }
    
    res.json(directories);
  } catch (err) {
    console.error('Error getting directories:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   GET /api/directories/tree
 * @desc    Get the full directory tree for the user
 * @access  Private
 */
router.get('/tree', auth, async (req, res) => {
  try {
    // Get all directories for the user
    const directories = await Directory.find({ owner: req.user.id })
      .sort({ name: 1 })
      .lean();
    
    // Get all code files for the user
    const files = await CodeFile.find({ owner: req.user.id })
      .select('-code')
      .sort({ name: 1 })
      .lean();
    
    // Transform files to add language property
    const transformedFiles = files.map(file => {
      // Create a new object with all properties and add language
      return {
        ...file,
        language: file.programmingLanguage,
        // Explicitly include difficulty if it exists to ensure it's present in the response
        difficulty: file.difficulty || 'easy'
      };
    });
    
    // Build the directory tree
    const buildTree = (parentId = null) => {
      const children = directories.filter(
        d => (d.parent === parentId) || 
            (parentId === null && d.parent === null) || 
            (d.parent && parentId && d.parent.toString() === parentId.toString())
      );
      
      return children.map(dir => ({
        ...dir,
        type: 'directory',
        children: buildTree(dir._id)
      }));
    };
    
    // Start with root directories
    const tree = buildTree(null);
    
    // Add root files
    const rootFiles = transformedFiles.filter(f => f.directory === null).map(f => ({
      ...f,
      type: 'file'
    }));
    
    // Add directory files to tree
    const addFilesToTree = (node) => {
      if (node.type === 'directory') {
        const directoryFiles = transformedFiles
          .filter(f => f.directory && f.directory.toString() === node._id.toString())
          .map(f => ({ ...f, type: 'file' }));
        
        return {
          ...node,
          children: [...node.children, ...directoryFiles]
        };
      }
      return node;
    };
    
    // Recursively add files to all directories in the tree
    const addFilesRecursively = (nodes) => {
      return nodes.map(node => {
        if (node.type === 'directory') {
          const withFiles = addFilesToTree(node);
          return {
            ...withFiles,
            children: addFilesRecursively(withFiles.children)
          };
        }
        return node;
      });
    };
    
    const treeWithFiles = addFilesRecursively(tree);
    
    // Final tree with root files added
    const fullTree = [...treeWithFiles, ...rootFiles];
    
    res.json(fullTree);
  } catch (err) {
    console.error('Error getting directory tree:', err);
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   GET /api/directories/:id
 * @desc    Get a directory by ID
 * @access  Private/Public (depending on isPublic flag)
 */
router.get('/:id', optionalAuth, async (req, res) => {
  try {
    const directory = await Directory.findById(req.params.id)
      .populate('parent', 'name')
      .populate('owner', 'username email');
    
    if (!directory) {
      return res.status(404).json({ msg: 'Directory not found' });
    }
    
    // Check if user has access to this directory
    const isPublic = directory.isPublic;
    const userId = req.user ? req.user.id : null;
    const dirOwnerId = directory.owner._id ? directory.owner._id.toString() : null;
    const isOwner = userId && dirOwnerId && userId === dirOwnerId;
    
    // Log access check
    logger.debug('Directory access check:', {
      dirId: directory._id,
      isPublic,
      requestUserId: userId,
      dirOwnerId: dirOwnerId,
      isOwner
    });
    
    if (!isPublic && !isOwner) {
      return res.status(401).json({ msg: 'Not authorized to view this directory' });
    }
    
    // Get subdirectories
    const subdirectories = await Directory.find({
      parent: directory._id
    }).sort({ name: 1 });
    
    // Get files in this directory
    const files = await CodeFile.find({
      directory: directory._id
    }).select('-code').sort({ name: 1 });
    
    // Add language property for backward compatibility
    const transformedFiles = files.map(file => {
      const fileObj = file.toObject();
      fileObj.language = fileObj.programmingLanguage;
      // Ensure difficulty is set
      if (!fileObj.difficulty) {
        fileObj.difficulty = 'easy';
      }
      return fileObj;
    });
    
    console.log('Directory API response files with difficulty:', transformedFiles.map(f => ({ name: f.name, difficulty: f.difficulty })));
    
    res.json({
      directory,
      subdirectories,
      files: transformedFiles
    });
  } catch (err) {
    console.error('Error getting directory:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Directory not found' });
    }
    
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   PUT /api/directories/:id
 * @desc    Update a directory
 * @access  Private
 */
router.put('/:id', auth, async (req, res) => {
  try {
    const { name, description, parentId, isPublic } = req.body;
    
    // Find directory
    const directory = await Directory.findById(req.params.id);
    
    if (!directory) {
      return res.status(404).json({ msg: 'Directory not found' });
    }
    
    // Check ownership
    if (directory.owner.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized to update this directory' });
    }
    
    // Check for circular reference if changing parent
    if (parentId && parentId !== directory.parent?.toString()) {
      // Prevent directory from being its own parent
      if (parentId === directory._id.toString()) {
        return res.status(400).json({ msg: 'Directory cannot be its own parent' });
      }
      
      // Check if new parent exists and belongs to user
      if (!mongoose.Types.ObjectId.isValid(parentId)) {
        return res.status(400).json({ msg: 'Invalid parent directory ID' });
      }
      
      // Handle setting to root (null parent)
      if (parentId === "null") {
        directory.parent = null;
      } else {
        const parentDir = await Directory.findById(parentId);
        if (!parentDir) {
          return res.status(404).json({ msg: 'Parent directory not found' });
        }
        
        if (parentDir.owner.toString() !== req.user.id) {
          return res.status(401).json({ msg: 'Not authorized to use this parent directory' });
        }
        
        // Check for circular reference in the directory structure
        let currentDir = parentDir;
        while (currentDir.parent) {
          if (currentDir.parent.toString() === directory._id.toString()) {
            return res.status(400).json({ msg: 'Cannot create circular directory structure' });
          }
          currentDir = await Directory.findById(currentDir.parent);
          
          // Safety check if parent cannot be found
          if (!currentDir) break;
        }
        
        directory.parent = parentId;
      }
    }
    
    // Update fields if provided
    if (name) directory.name = name;
    if (description !== undefined) directory.description = description;
    if (isPublic !== undefined) directory.isPublic = isPublic;
    
    await directory.save();
    
    res.json(directory);
  } catch (err) {
    console.error('Error updating directory:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Directory not found' });
    }
    
    res.status(500).json({ msg: 'Server error' });
  }
});

/**
 * @route   DELETE /api/directories/:id
 * @desc    Delete a directory and optionally its contents
 * @access  Private
 */
router.delete('/:id', auth, async (req, res) => {
  try {
    const { deleteContents } = req.query;
    
    // Find directory
    const directory = await Directory.findById(req.params.id);
    
    if (!directory) {
      return res.status(404).json({ msg: 'Directory not found' });
    }
    
    // Check ownership
    if (directory.owner.toString() !== req.user.id) {
      return res.status(401).json({ msg: 'Not authorized to delete this directory' });
    }
    
    // Check if directory has contents
    const hasSubdirectories = await Directory.exists({ parent: directory._id });
    const hasFiles = await CodeFile.exists({ directory: directory._id });
    
    if ((hasSubdirectories || hasFiles) && deleteContents !== 'true') {
      return res.status(400).json({ 
        msg: 'Directory is not empty. Set deleteContents=true to delete with contents',
        isEmpty: false
      });
    }
    
    // If deleteContents is true, delete all subdirectories and files
    if (deleteContents === 'true') {
      // Recursively delete subdirectories
      const deleteRecursive = async (dirId) => {
        // Get all subdirectories
        const subDirs = await Directory.find({ parent: dirId });
        
        // Recursively delete each subdirectory
        for (const subDir of subDirs) {
          await deleteRecursive(subDir._id);
        }
        
        // Delete all files in this directory
        await CodeFile.deleteMany({ directory: dirId });
        
        // Delete the directory itself
        await Directory.deleteOne({ _id: dirId });
      };
      
      await deleteRecursive(directory._id);
      
      return res.json({ msg: 'Directory and all contents deleted successfully' });
    }
    
    // If directory is empty, just delete it
    await directory.remove();
    
    res.json({ msg: 'Directory deleted successfully' });
  } catch (err) {
    console.error('Error deleting directory:', err);
    
    if (err.kind === 'ObjectId') {
      return res.status(404).json({ msg: 'Directory not found' });
    }
    
    res.status(500).json({ msg: 'Server error' });
  }
});

module.exports = router;
