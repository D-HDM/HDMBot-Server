const state = require('../state');
const { isAdmin, isOwner } = require('../helpers/permissions');

function register(commands, categories, category) {
    
    // ========== SETPREFIX ==========
    commands.set('setprefix', {
        category,
        desc: 'Set command prefix',
        execute: async (sock, msg, args, config) => {
            const { PREFIX, SESSION_ID } = config;
            if (!args[0] || args[0].length > 3) {
                return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Usage: ${PREFIX}setprefix <symbol>\nMax 3 characters` });
            }
            state.setUserSetting(SESSION_ID, 'prefix', args[0].slice(0, 3));
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Prefix updated to \`${args[0].slice(0, 3)}\`` });
        }
    });

    // ========== SETFOOTER ==========
    commands.set('setfooter', {
        category,
        desc: 'Set footer text',
        execute: async (sock, msg, args, config) => {
            const sender = msg.key.participant || msg.key.remoteJid;
            if (!isAdmin(sender)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Admin only.' });
            if (!args.length) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Usage: ${config.PREFIX}setfooter <text>` });
            state.setGlobalSetting('footer', args.join(' '));
            await sock.sendMessage(msg.key.remoteJid, { text: '✅ Footer updated.' });
        }
    });

    // ========== MODE ==========
    commands.set('mode', {
        category,
        desc: 'Set bot mode (public/private)',
        execute: async (sock, msg, args, config) => {
            const { PREFIX, SESSION_ID } = config;
            const mode = (args[0] || '').toLowerCase();
            const current = state.getUserSetting(SESSION_ID, 'mode', 'public');
            
            if (!['private', 'public'].includes(mode)) {
                return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Usage: ${PREFIX}mode private|public\nCurrent: ${current}` });
            }
            
            state.setUserSetting(SESSION_ID, 'mode', mode);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Mode set to: ${mode}` });
        }
    });

    // ========== ALWAYSONLINE ==========
    commands.set('alwaysonline', {
        category,
        desc: 'Toggle always online',
        execute: async (sock, msg, args, config) => {
            const { PREFIX, SESSION_ID } = config;
            const state_ = (args[0] || '').toLowerCase();
            const current = state.getUserSetting(SESSION_ID, 'always_online', false);
            
            if (!['on', 'off'].includes(state_)) {
                return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Usage: ${PREFIX}alwaysonline on|off\nCurrent: ${current ? 'ON' : 'OFF'}` });
            }
            
            state.setUserSetting(SESSION_ID, 'always_online', state_ === 'on');
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Always Online: ${state_.toUpperCase()}` });
        }
    });

    // ========== AUTOVIEWSTATUS ==========
    commands.set('autoviewstatus', {
        category,
        desc: 'Toggle auto view status',
        execute: async (sock, msg, args, config) => {
            const { PREFIX, SESSION_ID } = config;
            const state_ = (args[0] || '').toLowerCase();
            const current = state.getUserSetting(SESSION_ID, 'auto_view_status', false);
            
            if (!['on', 'off'].includes(state_)) {
                return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Usage: ${PREFIX}autoviewstatus on|off\nCurrent: ${current ? 'ON' : 'OFF'}` });
            }
            
            state.setUserSetting(SESSION_ID, 'auto_view_status', state_ === 'on');
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Auto-View Status: ${state_.toUpperCase()}` });
        }
    });

    // ========== RELOAD ==========
    commands.set('reload', {
        category,
        desc: 'Reload commands',
        execute: async (sock, msg, args, config) => {
            const sender = msg.key.participant || msg.key.remoteJid;
            if (!isAdmin(sender)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Admin only.' });
            const { getCommands } = require('./index');
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Reloaded! ${getCommands().size} commands.` });
        }
    });

    // ========== LISTADMINS ==========
    commands.set('listadmins', {
        category,
        desc: 'List bot admins',
        execute: async (sock, msg, args, config) => {
            const admins = state.getGlobalSetting('adminNumbers', []);
            const owner = state.getGlobalSetting('ownerNumber', config.OWNER_NUMBER);
            const all = [owner, ...admins].filter(Boolean);
            const text = `👑 *Bot Admins (${all.length})*\n` + all.map((n, i) => `${i + 1}. ${n}`).join('\n');
            await sock.sendMessage(msg.key.remoteJid, { text });
        }
    });

    // ========== ANTIDELETE ==========
    commands.set('antidelete', {
        category,
        desc: 'Toggle anti-delete',
        execute: async (sock, msg, args, config) => {
            const { PREFIX, SESSION_ID } = config;
            const state_ = (args[0] || '').toLowerCase();
            const current = state.getUserSetting(SESSION_ID, 'anti_delete', true);
            
            if (!['on', 'off'].includes(state_)) {
                return await sock.sendMessage(msg.key.remoteJid, { text: `🗑️ Anti-Delete: ${current ? 'ON' : 'OFF'}\n${PREFIX}antidelete on/off` });
            }
            
            state.setUserSetting(SESSION_ID, 'anti_delete', state_ === 'on');
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Anti-delete ${state_ === 'on' ? 'enabled' : 'disabled'}.` });
        }
    });

    // ========== AUTOREPLY ==========
    commands.set('autoreply', {
        category,
        desc: 'Toggle auto-reply',
        execute: async (sock, msg, args, config) => {
            const { PREFIX, SESSION_ID } = config;
            const state_ = (args[0] || '').toLowerCase();
            const current = state.getUserSetting(SESSION_ID, 'auto_reply', false);
            
            if (!['on', 'off'].includes(state_)) {
                return await sock.sendMessage(msg.key.remoteJid, { text: `🤖 Auto-Reply: ${current ? '✅ ON' : '❌ OFF'}\n${PREFIX}autoreply on/off` });
            }
            
            state.setUserSetting(SESSION_ID, 'auto_reply', state_ === 'on');
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Auto-reply ${state_ === 'on' ? 'enabled' : 'disabled'}.` });
        }
    });

    // ========== ANTIBUG ==========
    commands.set('antibug', {
        category,
        desc: 'Toggle anti-bug protection',
        execute: async (sock, msg, args, config) => {
            const { PREFIX, SESSION_ID } = config;
            const state_ = (args[0] || '').toLowerCase();
            const current = state.getUserSetting(SESSION_ID, 'anti_bug', false);
            
            if (!['on', 'off'].includes(state_)) {
                return await sock.sendMessage(msg.key.remoteJid, { text: `🛡️ Anti-Bug: ${current ? 'ON' : 'OFF'}\n${PREFIX}antibug on/off` });
            }
            
            state.setUserSetting(SESSION_ID, 'anti_bug', state_ === 'on');
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Anti-bug ${state_ === 'on' ? 'enabled' : 'disabled'}.` });
        }
    });
}

module.exports = { register };