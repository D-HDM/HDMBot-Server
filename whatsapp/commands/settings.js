const state = require('../state');
const { isAdmin, isOwner } = require('../helpers/permissions');

function register(commands, categories, category) {
    commands.set('setprefix', {
        category,
        desc: 'Set your prefix',
        execute: async (sock, msg, args, config) => {
            const { PREFIX } = config;
            const senderNum = msg.key.participant?.split('@')[0] || msg.key.remoteJid.split('@')[0];
            if (!args[0] || args[0].length > 3) {
                return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Usage: ${PREFIX}setprefix <symbol>\nMax 3 characters` });
            }
            state.setUserSetting(senderNum, 'prefix', args[0]);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Your prefix updated to \`${args[0]}\`` });
        }
    });

    commands.set('setfooter', {
        category,
        desc: 'Set footer',
        execute: async (sock, msg, args, config) => {
            const sender = msg.key.participant || msg.key.remoteJid;
            if (!isAdmin(sender)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Admin only.' });
            if (!args.length) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Usage: ${config.PREFIX}setfooter <text>` });
            state.setGlobalSetting('footer', args.join(' '));
            await sock.sendMessage(msg.key.remoteJid, { text: '✅ Footer updated.' });
        }
    });

    commands.set('mode', {
        category,
        desc: 'Set mode (private/public)',
        execute: async (sock, msg, args, config) => {
            const senderNum = msg.key.participant?.split('@')[0] || msg.key.remoteJid.split('@')[0];
            const mode = (args[0] || '').toLowerCase();
            const current = state.getUserSetting(senderNum, 'mode', 'public');
            if (!['private', 'public'].includes(mode)) {
                return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Usage: ${config.PREFIX}mode private|public\nCurrent: ${current}` });
            }
            state.setUserSetting(senderNum, 'mode', mode);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Your mode set to: ${mode}` });
        }
    });

    commands.set('alwaysonline', {
        category,
        desc: 'Toggle always online',
        execute: async (sock, msg, args, config) => {
            const senderNum = msg.key.participant?.split('@')[0] || msg.key.remoteJid.split('@')[0];
            const state_ = (args[0] || '').toLowerCase();
            const current = state.getUserSetting(senderNum, 'always_online', false);
            if (!['on', 'off'].includes(state_)) {
                return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Usage: ${config.PREFIX}alwaysonline on|off\nCurrent: ${current ? 'ON' : 'OFF'}` });
            }
            state.setUserSetting(senderNum, 'always_online', state_ === 'on');
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Always Online: ${state_.toUpperCase()}` });
        }
    });

    commands.set('autoviewstatus', {
        category,
        desc: 'Toggle auto view status',
        execute: async (sock, msg, args, config) => {
            const senderNum = msg.key.participant?.split('@')[0] || msg.key.remoteJid.split('@')[0];
            const state_ = (args[0] || '').toLowerCase();
            const current = state.getUserSetting(senderNum, 'auto_view_status', false);
            if (!['on', 'off'].includes(state_)) {
                return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Usage: ${config.PREFIX}autoviewstatus on|off\nCurrent: ${current ? 'ON' : 'OFF'}` });
            }
            state.setUserSetting(senderNum, 'auto_view_status', state_ === 'on');
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Auto-View Status: ${state_.toUpperCase()}` });
        }
    });

    commands.set('reload', {
        category,
        desc: 'Reload commands',
        execute: async (sock, msg, args, config) => {
            const sender = msg.key.participant || msg.key.remoteJid;
            if (!isAdmin(sender)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Admin only.' });
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Reloaded! ${commands.size} commands.` });
        }
    });

    commands.set('listadmins', {
        category,
        desc: 'List bot admins',
        execute: async (sock, msg, args, config) => {
            const admins = state.getGlobalSetting('adminNumbers', []);
            const text = '👑 *Bot Admins:*\n' + (admins.length ? admins.join('\n') : 'None.');
            await sock.sendMessage(msg.key.remoteJid, { text });
        }
    });

    commands.set('antidelete', {
        category,
        desc: 'Toggle anti-delete',
        execute: async (sock, msg, args, config) => {
            const senderNum = msg.key.participant?.split('@')[0] || msg.key.remoteJid.split('@')[0];
            const state_ = (args[0] || '').toLowerCase();
            const current = state.getUserSetting(senderNum, 'anti_delete', true);
            if (!['on', 'off'].includes(state_)) {
                return await sock.sendMessage(msg.key.remoteJid, { text: `🗑️ Anti-Delete: ${current ? 'ON' : 'OFF'}\n${config.PREFIX}antidelete on/off` });
            }
            state.setUserSetting(senderNum, 'anti_delete', state_ === 'on');
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Anti-delete ${state_ === 'on' ? 'enabled' : 'disabled'}.` });
        }
    });

    commands.set('autoreply', {
        category,
        desc: 'Toggle auto-reply',
        execute: async (sock, msg, args, config) => {
            const senderNum = msg.key.participant?.split('@')[0] || msg.key.remoteJid.split('@')[0];
            const state_ = (args[0] || '').toLowerCase();
            const current = state.getUserSetting(senderNum, 'auto_reply', false);
            if (!['on', 'off'].includes(state_)) {
                return await sock.sendMessage(msg.key.remoteJid, { text: `🤖 Auto-Reply: ${current ? '✅ ON' : '❌ OFF'}\n${config.PREFIX}autoreply on/off` });
            }
            state.setUserSetting(senderNum, 'auto_reply', state_ === 'on');
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Auto-reply ${state_ === 'on' ? 'enabled' : 'disabled'}.` });
        }
    });
}

module.exports = { register };