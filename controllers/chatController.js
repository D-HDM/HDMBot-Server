const Message = require('../models/Message');
const { getSessionManager } = require('../whatsapp/sessionManager');
const { asyncHandler, paginate, getPaginationMeta } = require('../utils/helpers');
const { NotFoundError } = require('../utils/errors');
const env = require('../config/env');

// @desc    Get chat list
// @route   GET /api/chats
// @access  Private
const getChats = asyncHandler(async (req, res) => {
    const sessionId = req.query.sessionId || env.SESSION_ID;

    // Get unique chats from messages
    const chats = await Message.aggregate([
        { $match: { sessionId } },
        { $sort: { timestamp: -1 } },
        {
            $group: {
                _id: '$chatId',
                chatId: { $first: '$chatId' },
                chatName: { $first: '$chatName' },
                lastMessage: { $first: '$body' },
                lastMessageTime: { $first: '$timestamp' },
                messageCount: { $sum: 1 },
                from: { $first: '$from' }
            }
        },
        { $sort: { lastMessageTime: -1 } },
        { $limit: 100 }
    ]);

    const chatList = chats.map(c => ({
        jid: c.chatId,
        name: c.chatName || c.chatId?.split('@')[0] || 'Unknown',
        last_message: c.lastMessage,
        timestamp: c.lastMessageTime,
        message_count: c.messageCount,
        from: c.from
    }));

    res.json({
        success: true,
        data: { chats: chatList }
    });
});

// @desc    Get chat messages
// @route   GET /api/chats/:jid/messages
// @access  Private
const getMessages = asyncHandler(async (req, res) => {
    const { jid } = req.params;
    const { page = 1, limit = 50 } = req.query;
    const { skip, limit: lim } = paginate(page, limit);
    const sessionId = req.query.sessionId || env.SESSION_ID;

    const [messages, total] = await Promise.all([
        Message.find({ sessionId, chatId: jid })
            .sort({ timestamp: -1 })
            .skip(skip)
            .limit(lim)
            .lean(),
        Message.countDocuments({ sessionId, chatId: jid })
    ]);

    res.json({
        success: true,
        data: {
            messages: messages.reverse(),
            pagination: getPaginationMeta(total, page, lim)
        }
    });
});

// @desc    Send message
// @route   POST /api/chats/:jid/send
// @access  Private
const sendMessage = asyncHandler(async (req, res) => {
    const { jid } = req.params;
    const { message, sessionId } = req.body;
    const sid = sessionId || env.SESSION_ID;

    if (!message) {
        return res.status(400).json({ success: false, error: 'Message is required' });
    }

    const sessionManager = getSessionManager();
    const sock = sessionManager.getSocket(sid);

    if (!sock) {
        return res.status(400).json({ success: false, error: 'Session not connected' });
    }

    await sock.sendMessage(jid, { text: message });

    // Save to messages
    await Message.create({
        sessionId: sid,
        chatId: jid,
        from: 'BOT',
        body: message,
        direction: 'out',
        timestamp: new Date()
    });

    res.json({
        success: true,
        message: 'Message sent',
        data: { jid, message }
    });
});

module.exports = { getChats, getMessages, sendMessage };