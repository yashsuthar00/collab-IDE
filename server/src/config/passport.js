const passport = require('passport');
const GoogleStrategy = require('passport-google-oauth20').Strategy;
const GitHubStrategy = require('passport-github2').Strategy;
const User = require('../models/User');

// Determine appropriate callback URLs based on environment
const getCallbackURL = (provider) => {
  const baseURL = process.env.NODE_ENV === 'production' 
    ? 'https://collab-ide-ep5q.onrender.com'  // Direct production API URL
    : 'http://localhost:5000';  // Direct local API URL
    
  return `${baseURL}/api/auth/${provider}/callback`;
};

module.exports = function() {
  // Google OAuth Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: getCallbackURL('google'),
        scope: ['profile', 'email'],
        prompt: 'select_account', // Always show account selection screen
        display: 'popup', // Use popup mode for better UX
        name: 'Collab IDE'  // Use a custom name that matches your app in GCP
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists
          let user = await User.findOne({ googleId: profile.id });

          if (user) {
            // Update last login
            user.lastLogin = Date.now();
            await user.save();
            return done(null, user);
          }

          // Check if user exists with the same email
          const existingUser = await User.findOne({ email: profile.emails[0].value });
          
          if (existingUser) {
            // Link Google account to existing user
            existingUser.googleId = profile.id;
            existingUser.lastLogin = Date.now();
            await existingUser.save();
            return done(null, existingUser);
          }

          // Create new user
          const username = `${profile.displayName.replace(/\s+/g, '')}_${profile.id.substring(0, 5)}`;
          user = await User.create({
            username: username,
            email: profile.emails[0].value,
            googleId: profile.id,
            password: undefined,
            avatar: profile.photos?.[0]?.value,
            lastLogin: Date.now()
          });

          done(null, user);
        } catch (error) {
          console.error('Google OAuth Error:', error);
          done(error);
        }
      }
    )
  );

  // GitHub OAuth Strategy
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: getCallbackURL('github'),
        scope: ['user:email']
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          // Check if user already exists
          let user = await User.findOne({ githubId: profile.id });

          if (user) {
            // Update last login
            user.lastLogin = Date.now();
            await user.save();
            return done(null, user);
          }

          // Get primary email
          const email = profile.emails?.[0]?.value || '';
          
          // Check if user exists with the same email
          if (email) {
            const existingUser = await User.findOne({ email });
            
            if (existingUser) {
              // Link GitHub account to existing user
              existingUser.githubId = profile.id;
              existingUser.lastLogin = Date.now();
              await existingUser.save();
              return done(null, existingUser);
            }
          }

          // Create new user
          user = await User.create({
            username: profile.username || `gh_${profile.id}`,
            email: email,
            githubId: profile.id,
            password: undefined,
            avatar: profile.photos?.[0]?.value,
            lastLogin: Date.now()
          });

          done(null, user);
        } catch (error) {
          console.error('GitHub OAuth Error:', error);
          done(error);
        }
      }
    )
  );

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (error) {
      done(error, null);
    }
  });
};
