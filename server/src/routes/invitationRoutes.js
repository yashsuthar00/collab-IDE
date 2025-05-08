const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/authMiddleware');
const {
  sendInvitation,
  getPendingInvitations,
  acceptInvitation,
  declineInvitation,
  cancelInvitation
} = require('../controllers/invitationController');

// Protect all routes
router.use(protect);

// Invitation routes
router.post('/', sendInvitation);
router.get('/pending', getPendingInvitations);
router.put('/:invitationId/accept', acceptInvitation);
router.put('/:invitationId/decline', declineInvitation);
router.delete('/:invitationId', cancelInvitation);

module.exports = router;
