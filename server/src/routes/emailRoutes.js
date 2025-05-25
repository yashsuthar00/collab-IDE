const express = require('express');
const { sendCodeShareEmail } = require('../controllers/emailController');
const { optionalAuth } = require('../middleware/authMiddleware');

const router = express.Router();

// Send code sharing email (auth optional)
router.post('/share-code', optionalAuth, sendCodeShareEmail);

module.exports = router;
