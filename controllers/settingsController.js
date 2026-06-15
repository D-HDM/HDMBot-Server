const state = require('../whatsapp/state');
const { asyncHandler } = require('../utils/helpers');
const env = require('../config/env');

// @desc    Get all settings
// @route   GET /api/settings
// @access  Private
const getSettings = asyncHandler(async (req, res) => {
    const sessionId = env.SESSION_ID;

    const settings = {
        commandPrefix: state.getUserSetting(sessionId, 'prefix', env.PREFIX),
        mode: state.getUserSetting(sessionId, 'mode', 'public'),
        auto_reply: state.getUserSetting(sessionId, 'auto_reply', false),
        alwaysOnline: state.getUserSetting(sessionId, 'always_online', false),
        autoViewStatus: state.getUserSetting(sessionId, 'auto_view_status', false),
        antiDelete: state.getUserSetting(sessionId, 'anti_delete', true),
        antiBug: state.getUserSetting(sessionId, 'anti_bug', false),
        footerText: state.getGlobalSetting('footer', '🤖 HDM BOT • Powered by HDM'),
        botName: env.BOT_NAME,
        ownerName: env.OWNER_NAME,
        ownerNumber: state.getGlobalSetting('ownerNumber', env.OWNER_NUMBER),
        enableAI: state.getGlobalSetting('enableAI', true),
        enableBug: state.getGlobalSetting('enableBug', false),
        defaultAI: state.getGlobalSetting('defaultAI', 'hdmai')
    };

    res.json({
        success: true,
        data: { settings }
    });
});

// @desc    Update settings
// @route   PUT /api/settings
// @access  Private
const updateSettings = asyncHandler(async (req, res) => {
    const sessionId = env.SESSION_ID;
    const allowedKeys = [
        'commandPrefix', 'mode', 'auto_reply', 'alwaysOnline',
        'autoViewStatus', 'antiDelete', 'antiBug', 'footerText',
        'enableAI', 'enableBug', 'defaultAI'
    ];

    const updated = [];

    for (const [key, value] of Object.entries(req.body)) {
        if (!allowedKeys.includes(key)) continue;

        if (['commandPrefix', 'mode', 'footerText', 'defaultAI'].includes(key)) {
            if (key === 'commandPrefix') {
                state.setUserSetting(sessionId, 'prefix', String(value).slice(0, 3));
            } else if (key === 'footerText') {
                state.setGlobalSetting('footer', String(value));
            } else if (key === 'defaultAI') {
                state.setGlobalSetting('defaultAI', String(value));
            } else {
                state.setUserSetting(sessionId, key, value);
            }
            updated.push(key);
        } else {
            // Boolean toggles
            state.setUserSetting(sessionId, key, Boolean(value));
            updated.push(key);
        }
    }

    res.json({
        success: true,
        message: `Updated: ${updated.join(', ') || 'none'}`,
        data: { updated }
    });
});

// @desc    Update single setting
// @route   PUT /api/settings/:key
// @access  Private
const updateSetting = asyncHandler(async (req, res) => {
    const { key } = req.params;
    const { value } = req.body;
    const sessionId = env.SESSION_ID;

    const keyMap = {
        commandPrefix: { type: 'user', key: 'prefix', transform: v => String(v).slice(0, 3) },
        mode: { type: 'user', key: 'mode' },
        auto_reply: { type: 'user', key: 'auto_reply', transform: v => Boolean(v) },
        alwaysOnline: { type: 'user', key: 'always_online', transform: v => Boolean(v) },
        autoViewStatus: { type: 'user', key: 'auto_view_status', transform: v => Boolean(v) },
        antiDelete: { type: 'user', key: 'anti_delete', transform: v => Boolean(v) },
        antiBug: { type: 'user', key: 'anti_bug', transform: v => Boolean(v) },
        footerText: { type: 'global', key: 'footer' },
        enableAI: { type: 'global', key: 'enableAI', transform: v => Boolean(v) },
        enableBug: { type: 'global', key: 'enableBug', transform: v => Boolean(v) },
        defaultAI: { type: 'global', key: 'defaultAI' }
    };

    const mapping = keyMap[key];
    if (!mapping) {
        return res.status(400).json({ success: false, error: 'Invalid setting key' });
    }

    const finalValue = mapping.transform ? mapping.transform(value) : value;

    if (mapping.type === 'user') {
        state.setUserSetting(sessionId, mapping.key, finalValue);
    } else {
        state.setGlobalSetting(mapping.key, finalValue);
    }

    res.json({
        success: true,
        message: `${key} updated`,
        data: { key, value: finalValue }
    });
});

module.exports = { getSettings, updateSettings, updateSetting };