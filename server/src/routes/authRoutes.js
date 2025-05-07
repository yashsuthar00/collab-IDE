const express = require('express');
const { register, login, getMe, logout, googleCallback, githubCallback } = require('../controllers/authController');
const { protect } = require('../middleware/authMiddleware');
const passport = require('passport');

const router = express.Router();

// Local authentication routes
router.post('/register', register);
router.post('/login', login);
router.get('/me', protect, getMe);
router.post('/logout', logout);

// Google OAuth routes
router.get('/google', (req, res, next) => {
  console.log('Starting Google OAuth flow with parameters:', {
    callbackURL: process.env.NODE_ENV === 'production' 
      ? `${process.env.API_BASE_URL || 'https://collab-ide-ep5q.onrender.com'}/api/auth/google/callback`
      : 'http://localhost:5000/api/auth/google/callback',
    clientID: process.env.GOOGLE_CLIENT_ID ? 
      `${process.env.GOOGLE_CLIENT_ID.substring(0, 5)}...` : 'not set',
    appName: process.env.APP_NAME || 'Collab IDE'
  });
  
  passport.authenticate('google', { 
    scope: ['profile', 'email'],
    prompt: 'select_account',
    display: 'popup'
  })(req, res, next);
});
router.get('/google/callback', 
  passport.authenticate('google', { 
    failureRedirect: process.env.NODE_ENV === 'production' 
      ? `${process.env.CLIENT_URL || 'https://colab-ide.vercel.app'}/login?error=auth_failed` 
      : 'http://localhost:5173/login?error=auth_failed',
    session: true
  }), 
  googleCallback
);

// GitHub OAuth routes
router.get('/github', passport.authenticate('github', { scope: ['user:email'] }));
router.get('/github/callback', 
  passport.authenticate('github', { 
    failureRedirect: process.env.NODE_ENV === 'production' 
      ? `${process.env.CLIENT_URL || 'https://colab-ide.vercel.app'}/login?error=auth_failed` 
      : 'http://localhost:5173/login?error=auth_failed',
    session: true
  }), 
  githubCallback
);

module.exports = router;
