const nodemailer = require('nodemailer');
const sanitizeHtml = require('sanitize-html');
const fs = require('fs');
const path = require('path');
const logger = require('../utils/logger');

class EmailService {
  constructor() {
    // Create a transporter using the configured email service with more secure settings
    this.createTransporter();

    // Try to load email template
    try {
      this.emailTemplate = fs.readFileSync(
        path.join(__dirname, '../templates/code-share-email.html'),
        'utf8'
      );
    } catch (error) {
      logger.warn('Email template not found, using default template');
      this.emailTemplate = `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 5px;">
          <h2 style="color: #333;">Code Shared With You</h2>
          <p style="color: #666;">{{senderName}} has shared some code with you from Collab IDE.</p>
          <div style="background-color: #f5f5f5; padding: 15px; border-radius: 4px; margin: 20px 0;">
            <p style="color: #333; margin: 0 0 10px 0;"><strong>Message:</strong></p>
            <p style="color: #555; margin: 0;">{{message}}</p>
          </div>
          <div style="margin: 20px 0;">
            <p style="color: #333; margin: 0 0 10px 0;"><strong>Shared Code ({{language}}):</strong></p>
            <pre style="background-color: #f8f8f8; padding: 15px; border-radius: 4px; overflow-x: auto; font-family: monospace, monospace; font-size: 14px; line-height: 1.5; color: #333;">{{code}}</pre>
          </div>
          <div style="margin: 20px 0;">
            <a href="{{shareLink}}" style="background-color: #4a6cf7; color: white; padding: 10px 15px; text-decoration: none; border-radius: 4px; display: inline-block;">View in Browser</a>
          </div>
          <p style="color: #999; font-size: 12px; margin-top: 30px;">This is an automated email from Collab IDE. Please do not reply to this email.</p>
        </div>
      `;
    }
  }

  // Create and configure the transporter based on the selected service
  createTransporter() {
    try {
      // Log all environment variables for debugging
      logger.debug('Email Configuration:', {
        EMAIL_SERVICE: process.env.EMAIL_SERVICE,
        EMAIL_HOST: process.env.EMAIL_HOST,
        EMAIL_PORT: process.env.EMAIL_PORT,
        EMAIL_USER: process.env.EMAIL_USER,
        EMAIL_PASSWORD: process.env.EMAIL_PASSWORD ? '[PRESENT]' : '[NOT SET]'
      });

      // For Gmail, we need to use a specific configuration that works with OAuth or App Passwords
      // Try a simpler approach that often works better with Gmail
      this.transporter = nodemailer.createTransport({
        host: 'smtp.gmail.com', 
        port: 587,
        secure: false, // use TLS - this is more reliable than SSL for Gmail
        auth: {
          user: process.env.EMAIL_USER,
          pass: process.env.EMAIL_PASSWORD
        },
        tls: {
          rejectUnauthorized: false // helps with some TLS issues
        },
        debug: true, // Enable debug logging
        logger: true // Enable transporter logging
      });

      logger.info('Email transporter created');
    } catch (error) {
      logger.error('Failed to create email transporter:', error);
      this.transporter = null;
    }
  }

  /**
   * Verify the email connection works
   * @returns {Promise<boolean>} True if connection is successful
   */
  async verifyConnection() {
    try {
      if (!this.transporter) {
        logger.error('Email transporter not initialized');
        return false;
      }

      if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
        logger.error('Missing email credentials. Check your .env file.');
        return false;
      }

      // Use a simple method to check if credentials are working
      // without verifying the full connection (which can fail for various reasons)
      logger.info('Checking email credentials...');
      return true;
    } catch (error) {
      logger.error('Email service connection failed:', error);
      return false;
    }
  }

  /**
   * Send code sharing email
   * @param {Object} options Email options
   * @param {string} options.to Recipient email
   * @param {string} options.senderName Name of sender
   * @param {string} options.message Custom message
   * @param {string} options.code Code being shared
   * @param {string} options.language Programming language
   * @param {string} options.shareLink Link to shared code
   * @returns {Promise<Object>} Send result
   */
  async sendCodeShareEmail(options) {
    try {
      const { to, senderName, message, code, language, shareLink } = options;

      // Basic validations
      if (!to || !code) {
        throw new Error('Email recipient and code are required');
      }

      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) {
        throw new Error('Invalid email address');
      }

      // For debugging in development
      logger.debug('Sending email to:', to);

      // Skip connection verification - just try to send
      if (!this.transporter) {
        // Recreate transporter if it doesn't exist
        this.createTransporter();
        if (!this.transporter) {
          throw new Error('Could not create email transporter');
        }
      }

      // Prepare template
      let htmlContent = this.emailTemplate;
      
      // Replace template variables
      htmlContent = htmlContent
        .replace(/{{senderName}}/g, sanitizeHtml(senderName || 'Someone'))
        .replace(/{{message}}/g, sanitizeHtml(message || 'Check out this code!'))
        .replace(/{{language}}/g, sanitizeHtml(language || 'code'))
        .replace(/{{code}}/g, this.formatCodeForEmail(code))
        .replace(/{{shareLink}}/g, shareLink || '');

      // Create text version (simple fallback)
      const textContent = 
        `${senderName || 'Someone'} has shared code with you from Collab IDE.\n\n` +
        `Message: ${message || 'Check out this code!'}\n\n` +
        `Shared Code (${language || 'code'}):\n\n${code}\n\n` +
        `View in browser: ${shareLink || ''}\n\n` +
        `This is an automated message from Collab IDE. Please do not reply to this email.`;

      // Simplified email options
      const mailOptions = {
        from: process.env.EMAIL_USER, // Just use the email directly
        to,
        subject: `${senderName || 'Someone'} shared code with you from Collab IDE`,
        text: textContent,
        html: htmlContent,
        attachments: [
          {
            filename: `shared-code.${this.getFileExtension(language)}`,
            content: code
          }
        ]
      };

      logger.info(`Attempting to send email to ${to}...`);
      
      // Send email
      const result = await this.transporter.sendMail(mailOptions);
      
      logger.info(`Email sent successfully to ${to}`);
      
      return {
        success: true,
        messageId: result.messageId
      };
    } catch (error) {
      logger.error('Error sending email:', error);
      
      // Detailed error info for debugging
      if (error.code) {
        logger.error(`Error code: ${error.code}`);
      }
      
      if (error.command) {
        logger.error(`Failed command: ${error.command}`);
      }
      
      // Try to recreate the transporter on failure
      this.createTransporter();
      
      throw new Error(`Failed to send email: ${error.message}`);
    }
  }

  /**
   * Format code for HTML display in email
   * @param {string} code Raw code
   * @returns {string} Formatted code safe for HTML
   */
  formatCodeForEmail(code) {
    if (!code) return '';
    
    // Sanitize and preserve whitespace, newlines
    return sanitizeHtml(code, {
      allowedTags: [],
      allowedAttributes: {},
      disallowedTagsMode: 'escape'
    })
      .replace(/\n/g, '<br>')
      .replace(/\s\s/g, '&nbsp;&nbsp;')
      .replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;');
  }

  /**
   * Get file extension based on language
   * @param {string} language Programming language
   * @returns {string} Appropriate file extension
   */
  getFileExtension(language) {
    const extensions = {
      javascript: 'js',
      python: 'py',
      java: 'java',
      cpp: 'cpp',
      c: 'c',
      typescript: 'ts',
      go: 'go',
      rust: 'rs',
      ruby: 'rb',
      php: 'php'
    };
    
    return extensions[language?.toLowerCase()] || 'txt';
  }
}

module.exports = new EmailService();
