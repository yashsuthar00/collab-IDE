const emailService = require('../services/emailService');
const SharedCode = require('../models/SharedCode');
const logger = require('../utils/logger');
const crypto = require('crypto');

/**
 * Send code sharing email
 * @param {Object} req Request object
 * @param {Object} res Response object
 */
exports.sendCodeShareEmail = async (req, res) => {
  try {
    const { email, message, code, language, shareLink, slug } = req.body;
    
    // Validate inputs
    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Recipient email is required'
      });
    }
    
    if (!code && !slug) {
      return res.status(400).json({
        success: false,
        message: 'Either code or shared code slug is required'
      });
    }
    
    // Get user name from authenticated user or default
    const senderName = req.user ? req.user.username : 'A Collab IDE user';
    
    // If slug is provided, get the shared code
    let codeContent = code;
    let codeLanguage = language;
    let shareUrl = shareLink;
    
    if (slug && !code) {
      try {
        const sharedCode = await SharedCode.findOne({ slug });
        
        if (!sharedCode) {
          return res.status(404).json({
            success: false,
            message: 'Shared code not found'
          });
        }
        
        codeContent = sharedCode.code;
        codeLanguage = sharedCode.language;
        
        // Generate share URL if not provided
        if (!shareUrl) {
          const baseUrl = process.env.CLIENT_URL || 'https://collab-ide.vercel.app';
          shareUrl = `${baseUrl}/shared/${slug}`;
        }
      } catch (error) {
        logger.error('Error fetching shared code:', error);
        return res.status(500).json({
          success: false,
          message: 'Error fetching shared code'
        });
      }
    }
    
    // Use a try-catch block specifically for the email sending
    try {
      logger.info(`Attempting to send email to ${email}`);
      
      // Send email with explicit error handling
      const result = await emailService.sendCodeShareEmail({
        to: email,
        senderName,
        message,
        code: codeContent || '', // Ensure code is not undefined
        language: codeLanguage || 'text',
        shareLink: shareUrl || ''
      });
      
      logger.info('Email sent successfully');
      
      return res.status(200).json({
        success: true,
        message: 'Email sent successfully',
        data: result
      });
    } catch (error) {
      logger.error('Failed to send email:', error);
      
      // Create a user-friendly error message
      let userMessage = 'Failed to send email. Please try again later.';
      let statusCode = 500;
      
      if (error.message.includes('Invalid email')) {
        userMessage = 'Please enter a valid email address.';
        statusCode = 400;
      } else if (error.message.includes('authentication') || error.message.includes('auth')) {
        userMessage = 'Email server authentication failed. This is a server configuration issue.';
      } else if (error.message.includes('connection')) {
        userMessage = 'Could not connect to email server. Please check your network.';
      }
      
      return res.status(statusCode).json({
        success: false,
        message: userMessage,
        error: error.message
      });
    }
  } catch (error) {
    logger.error('Unexpected error in sendCodeShareEmail controller:', error);
    return res.status(500).json({
      success: false,
      message: 'An unexpected error occurred while processing your request'
    });
  }
};
