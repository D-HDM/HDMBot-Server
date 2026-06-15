const Session = require('../models/session');
const User = require('../models/User');
const Message = require('../models/Message');
const Rule = require('../models/Rule');
const Command = require('../models/Command');
const { asyncHandler } = require('../utils/helpers');
const env = require('../config/env');
const { getSessionManager } = require('../whatsapp/sessionManager');
const { getCommands } = require('../whatsapp/commands');

// @desc    Get dashboard overview
// @route   GET /api/dashboard/overview
// @access  Private
const getOverview = asyncHandler(async (req, res) => {
    const sessionId = env.SESSION_ID;
    const sessionManager = getSessionManager();

    const [sessions, users, messages, rules, commands] = await Promise.all([
        Session.find({}).lean(),
        User.countDocuments({ isActive: true }),
        Message.countDocuments({ sessionId }),
        Rule.countDocuments({ sessionId }),
        Command.countDocuments({ sessionId })
    ]);

    const activeSessions = sessions.filter(s => 
        s.status === 'active' || s.status === 'connected' || sessionManager.isConnected(s.sessionId)
    ).length;

    // Get connected status from session manager
    const defaultConnected = sessionManager.isConnected(sessionId);

    res.json({
        success: true,
        data: {
            overview: {
                active_sessions: activeSessions,
                total_sessions: sessions.length,
                total_users: users,
                total_commands: getCommands().size, // 72 built-in commands
                custom_commands: commands,
                messages: { total: messages },
                rules: { total: rules },
                broadcasts: { total: 0 },
                prefix: env.PREFIX,
                uptime: process.uptime(),
                wa_connected: defaultConnected
            }
        }
    });
});

module.exports = { getOverview };