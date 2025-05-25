/**
 * Test script for email functionality
 * Run with: node test-email.js
 */
require('dotenv').config();
const nodemailer = require('nodemailer');

// Create a test transporter
const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false, // use TLS
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  },
  tls: {
    rejectUnauthorized: false
  },
  debug: true, // Enable debugging
  logger: true // Enable transport logging
});

// Test email content
const mailOptions = {
  from: process.env.EMAIL_USER,
  to: 'test@example.com', // REPLACE WITH YOUR TEST EMAIL
  subject: 'Collab IDE Email Test',
  text: 'This is a test email from Collab IDE. If you see this, email sending is working.',
  html: '<div style="font-family: Arial; padding: 20px; background-color: #f7f7f7;">' +
        '<h2 style="color: #4a6cf7;">Collab IDE Email Test</h2>' +
        '<p>This is a test email from <b>Collab IDE</b>. If you see this, email sending is working.</p>' +
        '</div>'
};

// Send the test email
console.log('Attempting to send test email...');
console.log('Using email credentials:', {
  user: process.env.EMAIL_USER,
  pass: process.env.EMAIL_PASSWORD ? '[PRESENT]' : '[NOT SET]'
});

transporter.sendMail(mailOptions, (error, info) => {
  if (error) {
    console.error('Failed to send email:', error);
    console.error('Error code:', error.code);
    console.error('Error message:', error.message);
    
    if (error.code === 'EAUTH') {
      console.error('\nAuthentication failed. Please check your Gmail settings:');
      console.error('1. Make sure 2-Step Verification is enabled in your Google Account');
      console.error('2. Generate an App Password at https://myaccount.google.com/apppasswords');
      console.error('3. Use the App Password in your .env file instead of your regular password');
    }
  } else {
    console.log('Email sent successfully!');
    console.log('Response:', info);
  }
});
