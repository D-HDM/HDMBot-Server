const state = require('../state');
const { isOwner, isAdmin } = require('../helpers/permissions');

function register(commands, categories, category) {
    commands.set('addbotadmin', {
        category,
        desc: 'Add bot admin',
        execute: async (sock, msg, args, config) => {
            const sender = msg.key.participant || msg.key.remoteJid;
            if (!isOwner(sender)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Only owner.' });
            
            const target = args[0]?.replace(/[^0-9]/g, '');
            if (!target) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ ${config.PREFIX}addbotadmin <number>` });
            
            const admins = state.getGlobalSetting('adminNumbers', []);
            if (admins.includes(target)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Already admin.' });
            
            admins.push(target);
            state.setGlobalSetting('adminNumbers', admins);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ @${target} added as bot admin.` });
        }
    });

    commands.set('listbotadmins', {
        category,
        desc: 'List bot admins',
        execute: async (sock, msg, args, config) => {
            const admins = state.getGlobalSetting('adminNumbers', []);
            const text = `👑 *Bot Admins (${admins.length})*\n` + (admins.length ? admins.map((n, i) => `${i + 1}. ${n}`).join('\n') : 'None.');
            await sock.sendMessage(msg.key.remoteJid, { text });
        }
    });

    commands.set('removebotadmin', {
        category,
        desc: 'Remove bot admin',
        execute: async (sock, msg, args, config) => {
            const sender = msg.key.participant || msg.key.remoteJid;
            if (!isOwner(sender)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Only owner.' });
            
            const target = args[0]?.replace(/[^0-9]/g, '');
            if (!target) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ ${config.PREFIX}removebotadmin <number>` });
            
            const admins = state.getGlobalSetting('adminNumbers', []);
            const idx = admins.indexOf(target);
            if (idx === -1) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Not an admin.' });
            
            admins.splice(idx, 1);
            state.setGlobalSetting('adminNumbers', admins);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ @${target} removed.` });
        }
    });

    commands.set('addsudo', {
        category,
        desc: 'Add super admin',
        execute: async (sock, msg, args, config) => {
            const sender = msg.key.participant || msg.key.remoteJid;
            if (!isOwner(sender)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Only owner.' });
            
            const target = args[0]?.replace(/[^0-9]/g, '');
            if (!target) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ ${config.PREFIX}addsudo <number>` });
            
            const admins = state.getGlobalSetting('adminNumbers', []);
            if (!admins.includes(target)) admins.push(target);
            state.setGlobalSetting('adminNumbers', admins);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ @${target} added as super admin.` });
        }
    });

    commands.set('setsudo', {
        category,
        desc: 'Set new owner',
        execute: async (sock, msg, args, config) => {
            const sender = msg.key.participant || msg.key.remoteJid;
            if (!isOwner(sender)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Only owner.' });
            
            const target = args[0]?.replace(/[^0-9]/g, '');
            if (!target) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ ${config.PREFIX}setsudo <number>` });
            
            state.setGlobalSetting('ownerNumber', target);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ @${target} set as owner.` });
        }
    });

    commands.set('ownerinfo', {
        category,
        desc: 'Owner information',
        execute: async (sock, msg, args, config) => {
            const { BOT_NAME } = config;
            const owner = state.getGlobalSetting('ownerNumber', config.OWNER_NUMBER);
            await sock.sendMessage(msg.key.remoteJid, { text: `👑 *Owner*\n👤 ${BOT_NAME}\n📱 +${owner}\n📧 owner@hdm-bot.com` });
        }
    });
}

module.exports = { register };