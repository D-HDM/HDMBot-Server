const express = require('express');
const router = express.Router();
const sessionController = require('../controllers/sessionController');

// ==================== SESSION ROUTES ====================

// List all sessions
router.get('/', sessionController.list);

// Create new session
router.post('/', sessionController.create);

// Get session by ID - MUST be after / to avoid matching "status" as :id
router.get('/:id', sessionController.get);

// Delete session
router.delete('/:id', sessionController.delete);

// Connect session
router.post('/:id/connect', sessionController.connect);

// Disconnect session
router.post('/:id/disconnect', sessionController.disconnect);

// Get QR code
router.get('/:id/qr', sessionController.getQR);

// Get session status
router.get('/:id/status', sessionController.getStatus);

module.exports = router;