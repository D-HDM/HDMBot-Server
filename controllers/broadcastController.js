const { getSessionManager } = require('../whatsapp/sessionManager');
const { asyncHandler } = require('../utils/helpers');
const env = require('../config/env');

// In-memory history (replace with model if needed)
const broadcastHistory = [];

// @desc    Send broadcast
// @route   POST /api/broadcast
// @access  Private
const send = asyncHandler(async (req, res) => {
    const { message } = req.body;
    const sessionId = env.SESSION_ID;

    if (!message) {
        return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const sessionManager = getSessionManager();
    const sock = sessionManager.getSocket(sessionId);

    if (!sock) {
        return res.status(400).json({ success: false, error: 'Session not connected' });
    }

    // Get all groups
    let groups = [];
    try {
        const groupData = await sock.groupFetchAllParticipating();
        groups = Object.keys(groupData || {});
    } catch {}

    if (groups.length === 0) {
        return res.status(400).json({ success: false, error: 'No groups found' });
    }

    let sent = 0;
    let failed = 0;

    for (const gid of groups) {
        try {
            await sock.sendMessage(gid, { text: `📢 *BROADCAST*\n\n${message}` });
            sent++;
        } catch {
            failed++;
        }
        await new Promise(r => setTimeout(r, 500));
    }

    // Save to history
    const broadcast = {
        id: Date.now().toString(),
        message,
        targets: groups.length,
        sent,
        failed,
        status: 'completed',
        createdAt: new Date().toISOString()
    };
    broadcastHistory.unshift(broadcast);

    // Keep only last 50
    if (broadcastHistory.length > 50) broadcastHistory.pop();

    res.json({
        success: true,
        message: `Sent to ${sent}/${groups.length} groups`,
        data: { broadcast }
    });
});

// @desc    Get broadcast history
// @route   GET /api/broadcast/history
// @access  Private
const history = asyncHandler(async (req, res) => {
    res.json({
        success: true,
        data: { broadcasts: broadcastHistory }
    });
});

module.exports = { send, history };