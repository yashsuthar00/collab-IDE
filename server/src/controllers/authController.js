const User = require('../models/User');

// Register new user
exports.register = async (req, res) => {
  try {
    const { username, email, password } = req.body;
    
    // Check if email already exists
    const emailExists = await User.findOne({ email });
    if (emailExists) {
      return res.status(400).json({
        success: false,
        message: 'Email is already registered'
      });
    }
    
    // Check if username already exists
    const usernameExists = await User.findOne({ username });
    if (usernameExists) {
      return res.status(400).json({
        success: false,
        message: 'Username is already taken'
      });
    }
    
    // Create user
    const user = await User.create({
      username,
      email,
      password
    });
    
    // Get token
    const token = user.getSignedToken();
    
    // Update last login
    user.lastLogin = Date.now();
    await user.save();
    
    // Send token and user data
    res.status(201).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration'
    });
  }
};

// Login user
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;
    
    // Check if email and password are provided
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password'
      });
    }
    
    // Find user by email and include the password
    const user = await User.findOne({ email }).select('+password');
    
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Check if password matches
    const isMatch = await user.matchPassword(password);
    
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid credentials'
      });
    }
    
    // Update last login
    user.lastLogin = Date.now();
    await user.save();
    
    // Send token
    const token = user.getSignedToken();
    
    res.status(200).json({
      success: true,
      token,
      user: {
        id: user._id,
        username: user.username,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login'
    });
  }
};

// Get current user
exports.getMe = async (req, res) => {
  try {
    // req.user is set by the auth middleware
    const user = await User.findById(req.user.id);
    
    res.status(200).json({
      success: true,
      user: {
        id: user._id,
        username: user.username,
        email: user.email,
        avatar: user.avatar // Include the avatar URL
      }
    });
  } catch (error) {
    console.error('GetMe error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while fetching user data'
    });
  }
};

// Logout user
exports.logout = (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Logged out successfully'
  });
};

// Google OAuth callback
exports.googleCallback = (req, res) => {
  try {
    // Get token for the authenticated user
    const token = req.user.getSignedToken();
    
    // Use direct URLs based on environment
    const frontendURL = process.env.NODE_ENV === 'production'
      ? 'https://colab-ide.vercel.app'  // Direct production client URL
      : 'http://localhost:5173';  // Direct local client URL
    
    // Redirect to frontend with token
    res.redirect(`${frontendURL}/oauth-callback?token=${token}`);
  } catch (error) {
    console.error('Google callback error:', error);
    const redirectURL = process.env.NODE_ENV === 'production'
      ? 'https://colab-ide.vercel.app/login?error=auth_failed'
      : 'http://localhost:5173/login?error=auth_failed';
    res.redirect(redirectURL);
  }
};

// GitHub OAuth callback
exports.githubCallback = (req, res) => {
  try {
    // Get token for the authenticated user
    const token = req.user.getSignedToken();
    
    // Use direct URLs based on environment
    const frontendURL = process.env.NODE_ENV === 'production'
      ? 'https://colab-ide.vercel.app'  // Direct production client URL
      : 'http://localhost:5173';  // Direct local client URL
    
    // Redirect to frontend with token
    res.redirect(`${frontendURL}/oauth-callback?token=${token}`);
  } catch (error) {
    console.error('GitHub callback error:', error);
    const redirectURL = process.env.NODE_ENV === 'production'
      ? 'https://colab-ide.vercel.app/login?error=auth_failed'
      : 'http://localhost:5173/login?error=auth_failed';
    res.redirect(redirectURL);
  }
};
