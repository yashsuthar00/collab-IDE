const asyncHandler = require('express-async-handler');
const LeetcodeSolution = require('../models/LeetcodeSolution');
const CodeFile = require('../models/CodeFile');
const { createLeetcodeDirectory, getSanitizedFilename } = require('../services/leetcodeService');
const logger = require('../utils/logger');

/**
 * @desc    Save a LeetCode solution
 * @route   POST /api/leetcode/save
 * @access  Private
 */
const saveLeetcodeSolution = asyncHandler(async (req, res) => {
  const { problemTitle, problemDescription, code, language, difficulty, leetcodeUrl } = req.body;
  
  if (!problemTitle || !code || !language) {
    res.status(400);
    throw new Error('Please provide problemTitle, code, and language');
  }
  
  try {
    // Get or create the LeetCode directory
    const leetcodeDir = await createLeetcodeDirectory(req.user._id);
    
    // Create a sanitized filename from the problem title
    const fileName = getSanitizedFilename(problemTitle, language);
    
    // Check if a solution for this problem already exists
    const existingSolution = await LeetcodeSolution.findOne({
      userId: req.user._id,
      problemTitle
    });
    
    // Create or update the CodeFile
    let codeFile;
    
    if (existingSolution && existingSolution.fileId) {
      // Update existing file
      codeFile = await CodeFile.findById(existingSolution.fileId);
      
      if (codeFile) {
        codeFile.name = fileName;
        codeFile.programmingLanguage = language; // Use programmingLanguage instead of language
        codeFile.code = code;
        await codeFile.save();
      } else {
        // If file was deleted, create a new one using existing structure
        codeFile = new CodeFile({
          name: fileName,
          programmingLanguage: language, // Use programmingLanguage instead of language
          code,
          owner: req.user._id,
          directory: leetcodeDir._id,
          isPublic: false
        });
        await codeFile.save();
      }
    } else {
      // Create new file using existing structure
      codeFile = new CodeFile({
        name: fileName,
        programmingLanguage: language, // Use programmingLanguage instead of language
        code,
        owner: req.user._id,
        directory: leetcodeDir._id,
        isPublic: false
      });
      await codeFile.save();
    }
    
    // Create or update the LeetCode solution
    if (existingSolution) {
      existingSolution.problemDescription = problemDescription || existingSolution.problemDescription;
      existingSolution.code = code;
      existingSolution.language = language;
      existingSolution.difficulty = difficulty || existingSolution.difficulty;
      existingSolution.fileId = codeFile._id;
      existingSolution.leetcodeUrl = leetcodeUrl || existingSolution.leetcodeUrl;
      await existingSolution.save();
      
      res.status(200).json({
        success: true,
        message: 'LeetCode solution updated successfully',
        data: existingSolution
      });
    } else {
      const solution = new LeetcodeSolution({
        userId: req.user._id,
        problemTitle,
        problemDescription,
        code,
        language,
        difficulty,
        fileId: codeFile._id,
        leetcodeUrl
      });
      
      await solution.save();
      
      res.status(201).json({
        success: true,
        message: 'LeetCode solution saved successfully',
        data: solution
      });
    }
  } catch (error) {
    logger.error('Error saving LeetCode solution:', error);
    res.status(500);
    throw new Error('Failed to save LeetCode solution: ' + error.message);
  }
});

/**
 * @desc    Get all LeetCode solutions for the authenticated user
 * @route   GET /api/leetcode
 * @access  Private
 */
const getLeetcodeSolutions = asyncHandler(async (req, res) => {
  const solutions = await LeetcodeSolution.find({ userId: req.user._id })
    .sort({ createdAt: -1 })
    .populate('fileId', 'name programmingLanguage'); // Use programmingLanguage instead of language
  
  res.status(200).json({
    success: true,
    count: solutions.length,
    data: solutions
  });
});

/**
 * @desc    Get a specific LeetCode solution by ID
 * @route   GET /api/leetcode/:id
 * @access  Private
 */
const getLeetcodeSolutionById = asyncHandler(async (req, res) => {
  const solution = await LeetcodeSolution.findOne({
    _id: req.params.id,
    userId: req.user._id
  }).populate('fileId', 'name programmingLanguage code'); // Use programmingLanguage instead of language
  
  if (!solution) {
    res.status(404);
    throw new Error('LeetCode solution not found');
  }
  
  res.status(200).json({
    success: true,
    data: solution
  });
});

/**
 * @desc    Delete a LeetCode solution
 * @route   DELETE /api/leetcode/:id
 * @access  Private
 */
const deleteLeetcodeSolution = asyncHandler(async (req, res) => {
  const solution = await LeetcodeSolution.findOne({
    _id: req.params.id,
    userId: req.user._id
  });
  
  if (!solution) {
    res.status(404);
    throw new Error('LeetCode solution not found');
  }
  
  // Optionally delete the associated file
  if (solution.fileId) {
    await CodeFile.findByIdAndDelete(solution.fileId);
  }
  
  await solution.deleteOne();
  
  res.status(200).json({
    success: true,
    message: 'LeetCode solution deleted successfully'
  });
});

module.exports = {
  saveLeetcodeSolution,
  getLeetcodeSolutions,
  getLeetcodeSolutionById,
  deleteLeetcodeSolution
};
