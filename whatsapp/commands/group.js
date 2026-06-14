const state = require('../state');
const { isAdmin, isOwner } = require('../helpers/permissions');

// ==================== HELPERS ====================

function getChat(msg) {
    try {
        return msg.key.remoteJid?.includes('@g.us') ? msg.key.remoteJid : null;
    } catch { return null; }
}

function isGroup(msg) {
    return msg.key.remoteJid?.includes('@g.us');
}

async function getGroupAdmins(sock, groupJid) {
    try {
        const metadata = await sock.groupMetadata(groupJid);
        const admins = metadata.participants
            .filter(p => p.admin === 'admin' || p.admin === 'superadmin')
            .map(p => p.id);
        return { admins, metadata, participants: metadata.participants };
    } catch { return { admins: [], metadata: null, participants: [] }; }
}

async function isBotAdmin(sock, groupJid) {
    try {
        const botId = sock.user.id.replace(/:.*$/, '') + '@s.whatsapp.net';
        const { admins } = await getGroupAdmins(sock, groupJid);
        return admins.includes(botId);
    } catch { return false; }
}

async function isSenderAdmin(sock, groupJid, senderJid) {
    try {
        const { admins } = await getGroupAdmins(sock, groupJid);
        return admins.includes(senderJid);
    } catch { return false; }
}

function getTargetJid(msg, args) {
    // From quoted message
    const quoted = msg.message?.extendedTextMessage?.contextInfo?.participant;
    if (quoted) return quoted;
    
    // From mention
    const mentions = msg.message?.extendedTextMessage?.contextInfo?.mentionedJid;
    if (mentions && mentions.length) return mentions[0];
    
    // From number argument
    if (args[0]) {
        const num = args[0].replace(/[^0-9]/g, '');
        return `${num}@c.us`;
    }
    
    return null;
}

function getTargetNumber(msg, args) {
    const jid = getTargetJid(msg, args);
    return jid ? jid.split('@')[0] : null;
}

function parseDuration(timeStr) {
    const match = timeStr?.match(/^(\d+)([smhd])$/i);
    if (!match) return null;
    const value = parseInt(match[1]);
    const multipliers = { s: 1000, m: 60000, h: 3600000, d: 86400000 };
    return value * multipliers[match[2].toLowerCase()];
}

function getCountry(num) {
    const countries = {
        '254': '🇰🇪 Kenya', '255': '🇹🇿 Tanzania', '256': '🇺🇬 Uganda',
        '1': '🇺🇸 USA', '44': '🇬🇧 UK', '91': '🇮🇳 India',
        '234': '🇳🇬 Nigeria', '233': '🇬🇭 Ghana', '27': '🇿🇦 South Africa',
        '7': '🇷🇺 Russia', '49': '🇩🇪 Germany', '33': '🇫🇷 France',
        '86': '🇨🇳 China', '81': '🇯🇵 Japan', '55': '🇧🇷 Brazil',
        '971': '🇦🇪 UAE', '966': '🇸🇦 Saudi Arabia', '20': '🇪🇬 Egypt',
        '61': '🇦🇺 Australia'
    };
    const n = String(num).replace(/[^0-9]/g, '');
    for (const [code, name] of Object.entries(countries).sort((a, b) => b[0].length - a[0].length)) {
        if (n.startsWith(code)) return name;
    }
    return '🌍 Other';
}

// ==================== REGISTER ====================

function register(commands, categories, category) {

    // ========== KICK ==========
    commands.set('kick', {
        category,
        desc: 'Kick a member from group',
        execute: async (sock, msg, args, config) => {
            if (!isGroup(msg)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Groups only.' });
            const groupJid = msg.key.remoteJid;
            const senderJid = msg.key.participant || msg.key.remoteJid;
            
            if (!await isBotAdmin(sock, groupJid)) return await sock.sendMessage(groupJid, { text: '❌ I need admin privileges.' });
            if (!await isSenderAdmin(sock, groupJid, senderJid)) return await sock.sendMessage(groupJid, { text: '❌ Only group admins.' });
            
            const target = getTargetJid(msg, args);
            if (!target) return await sock.sendMessage(groupJid, { text: `❌ Usage: ${config.PREFIX}kick @user / reply / <number>` });
            
            try {
                await sock.groupParticipantsUpdate(groupJid, [target], 'remove');
                await sock.sendMessage(groupJid, { text: `✅ Kicked @${target.split('@')[0]}` });
            } catch (e) {
                await sock.sendMessage(groupJid, { text: `❌ Failed: ${e.message}` });
            }
        }
    });

    // ========== PROMOTE ==========
    commands.set('promote', {
        category,
        desc: 'Promote a member to admin',
        execute: async (sock, msg, args, config) => {
            if (!isGroup(msg)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Groups only.' });
            const groupJid = msg.key.remoteJid;
            const senderJid = msg.key.participant || msg.key.remoteJid;
            
            if (!await isBotAdmin(sock, groupJid)) return await sock.sendMessage(groupJid, { text: '❌ I need admin privileges.' });
            if (!await isSenderAdmin(sock, groupJid, senderJid)) return await sock.sendMessage(groupJid, { text: '❌ Only group admins.' });
            
            const target = getTargetJid(msg, args);
            if (!target) return await sock.sendMessage(groupJid, { text: `❌ Usage: ${config.PREFIX}promote @user / reply / <number>` });
            
            try {
                await sock.groupParticipantsUpdate(groupJid, [target], 'promote');
                await sock.sendMessage(groupJid, { text: `✅ Promoted @${target.split('@')[0]}` });
            } catch (e) {
                await sock.sendMessage(groupJid, { text: `❌ Failed: ${e.message}` });
            }
        }
    });

    // ========== DEMOTE ==========
    commands.set('demote', {
        category,
        desc: 'Demote an admin to member',
        execute: async (sock, msg, args, config) => {
            if (!isGroup(msg)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Groups only.' });
            const groupJid = msg.key.remoteJid;
            const senderJid = msg.key.participant || msg.key.remoteJid;
            
            if (!await isBotAdmin(sock, groupJid)) return await sock.sendMessage(groupJid, { text: '❌ I need admin privileges.' });
            if (!await isSenderAdmin(sock, groupJid, senderJid)) return await sock.sendMessage(groupJid, { text: '❌ Only group admins.' });
            
            const target = getTargetJid(msg, args);
            if (!target) return await sock.sendMessage(groupJid, { text: `❌ Usage: ${config.PREFIX}demote @user / reply / <number>` });
            
            try {
                await sock.groupParticipantsUpdate(groupJid, [target], 'demote');
                await sock.sendMessage(groupJid, { text: `✅ Demoted @${target.split('@')[0]}` });
            } catch (e) {
                await sock.sendMessage(groupJid, { text: `❌ Failed: ${e.message}` });
            }
        }
    });

    // ========== LINK ==========
    commands.set('link', {
        category,
        desc: 'Get group invite link',
        execute: async (sock, msg, args, config) => {
            if (!isGroup(msg)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Groups only.' });
            const groupJid = msg.key.remoteJid;
            
            if (!await isBotAdmin(sock, groupJid)) return await sock.sendMessage(groupJid, { text: '❌ I need admin privileges.' });
            
            try {
                const code = await sock.groupInviteCode(groupJid);
                await sock.sendMessage(groupJid, { text: `🔗 https://chat.whatsapp.com/${code}` });
            } catch (e) {
                await sock.sendMessage(groupJid, { text: `❌ Failed: ${e.message}` });
            }
        }
    });

    // ========== ANTILINK ==========
    commands.set('antilink', {
        category,
        desc: 'Toggle anti-link protection',
        execute: async (sock, msg, args, config) => {
            if (!isGroup(msg)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Groups only.' });
            const groupJid = msg.key.remoteJid;
            const senderJid = msg.key.participant || msg.key.remoteJid;
            
            if (!isAdmin(senderJid)) return await sock.sendMessage(groupJid, { text: '❌ Bot admin only.' });
            
            const action = (args[0] || '').toLowerCase();
            const state_ = (args[1] || '').toLowerCase();
            
            if (!action || !state_) {
                const current = state.getAntiLink(groupJid);
                return await sock.sendMessage(groupJid, { 
                    text: `🛡️ Anti-Link: ${current.enabled ? 'ON' : 'OFF'} | ${current.action}\n${config.PREFIX}antilink <delete|kick|warn> <on|off>` 
                });
            }
            
            if (!['delete', 'kick', 'warn'].includes(action)) return await sock.sendMessage(groupJid, { text: '❌ Action: delete, kick, warn' });
            if (!['on', 'off'].includes(state_)) return await sock.sendMessage(groupJid, { text: '❌ State: on, off' });
            
            state.setAntiLink(groupJid, { enabled: state_ === 'on', action });
            await sock.sendMessage(groupJid, { text: `✅ Anti-link ${state_ === 'on' ? 'enabled' : 'disabled'} (${action})` });
        }
    });

    // ========== DELETE ==========
    commands.set('delete', {
        category,
        desc: 'Delete quoted message',
        aliases: ['del'],
        execute: async (sock, msg, args, config) => {
            const quoted = msg.message?.extendedTextMessage?.contextInfo;
            if (!quoted?.stanzaId) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Reply to a message to delete it.' });
            
            const groupJid = msg.key.remoteJid;
            if (isGroup(msg) && !await isBotAdmin(sock, groupJid)) {
                return await sock.sendMessage(groupJid, { text: '❌ I need admin privileges.' });
            }
            
            try {
                await sock.sendMessage(msg.key.remoteJid, { 
                    delete: { remoteJid: msg.key.remoteJid, fromMe: false, id: quoted.stanzaId, participant: quoted.participant }
                });
            } catch (e) {
                await sock.sendMessage(msg.key.remoteJid, { text: `❌ Failed: ${e.message}` });
            }
        }
    });

    // ========== TAGALL ==========
    commands.set('tagall', {
        category,
        desc: 'Tag all group members',
        execute: async (sock, msg, args, config) => {
            if (!isGroup(msg)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Groups only.' });
            const groupJid = msg.key.remoteJid;
            
            try {
                const { participants } = await getGroupAdmins(sock, groupJid);
                const text = '📢 *Attention everyone!*\n' + (args.length ? args.join(' ') + '\n' : '');
                const mentions = participants.map(p => p.id);
                
                await sock.sendMessage(groupJid, { text, mentions });
            } catch (e) {
                await sock.sendMessage(groupJid, { text: `❌ Failed: ${e.message}` });
            }
        }
    });

    // ========== GROUPINFO ==========
    commands.set('groupinfo', {
        category,
        desc: 'Show group information',
        execute: async (sock, msg, args, config) => {
            if (!isGroup(msg)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Groups only.' });
            const groupJid = msg.key.remoteJid;
            
            try {
                const metadata = await sock.groupMetadata(groupJid);
                const text = `*${metadata.subject}*\nID: ${groupJid}\nMembers: ${metadata.participants.length}\nDesc: ${metadata.desc || 'None'}\nCreated: ${new Date(metadata.creation * 1000).toLocaleDateString()}`;
                await sock.sendMessage(groupJid, { text });
            } catch (e) {
                await sock.sendMessage(groupJid, { text: `❌ Failed: ${e.message}` });
            }
        }
    });

    // ========== ADMINS ==========
    commands.set('admins', {
        category,
        desc: 'List group admins',
        execute: async (sock, msg, args, config) => {
            if (!isGroup(msg)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Groups only.' });
            const groupJid = msg.key.remoteJid;
            
            try {
                const { admins, participants } = await getGroupAdmins(sock, groupJid);
                let text = `👑 *Group Admins (${admins.length})*\n`;
                for (const aid of admins) {
                    const p = participants.find(p => p.id === aid);
                    text += `- ${p?.name || aid.split('@')[0]}\n`;
                }
                await sock.sendMessage(groupJid, { text });
            } catch (e) {
                await sock.sendMessage(groupJid, { text: `❌ Failed: ${e.message}` });
            }
        }
    });

    // ========== WELCOME ==========
    commands.set('welcome', {
        category,
        desc: 'Set welcome message',
        execute: async (sock, msg, args, config) => {
            if (!isGroup(msg)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Groups only.' });
            const groupJid = msg.key.remoteJid;
            const senderJid = msg.key.participant || msg.key.remoteJid;
            
            if (!await isSenderAdmin(sock, groupJid, senderJid)) return await sock.sendMessage(groupJid, { text: '❌ Only group admins.' });
            
            const sub = (args[0] || '').toLowerCase();
            if (sub === 'on') {
                state.setWelcome(groupJid, '👋 Welcome to the group!');
                await sock.sendMessage(groupJid, { text: '✅ Welcome enabled!' });
            } else if (sub === 'off') {
                state.setWelcome(groupJid, '');
                await sock.sendMessage(groupJid, { text: '✅ Welcome disabled.' });
            } else if (args.length) {
                state.setWelcome(groupJid, args.join(' '));
                await sock.sendMessage(groupJid, { text: `✅ Custom welcome set!` });
            } else {
                const current = state.getWelcome(groupJid);
                await sock.sendMessage(groupJid, { text: `👋 *Welcome Settings*\nCurrent: ${current || 'None'}\n${config.PREFIX}welcome on|off|<text>` });
            }
        }
    });

    // ========== GOODBYE ==========
    commands.set('goodbye', {
        category,
        desc: 'Set goodbye message',
        execute: async (sock, msg, args, config) => {
            if (!isGroup(msg)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Groups only.' });
            const groupJid = msg.key.remoteJid;
            const senderJid = msg.key.participant || msg.key.remoteJid;
            
            if (!await isSenderAdmin(sock, groupJid, senderJid)) return await sock.sendMessage(groupJid, { text: '❌ Only group admins.' });
            
            const sub = (args[0] || '').toLowerCase();
            if (sub === 'on') {
                state.setGoodbye(groupJid, '😢 @user has left. We\'ll miss you!');
                await sock.sendMessage(groupJid, { text: '✅ Goodbye enabled.' });
            } else if (sub === 'off') {
                state.setGoodbye(groupJid, '');
                await sock.sendMessage(groupJid, { text: '✅ Goodbye disabled.' });
            } else if (args.length) {
                state.setGoodbye(groupJid, args.join(' '));
                await sock.sendMessage(groupJid, { text: '✅ Custom goodbye set!' });
            } else {
                const current = state.getGoodbye(groupJid);
                await sock.sendMessage(groupJid, { text: `🚪 *Goodbye Settings*\nCurrent: ${current || 'None'}\n${config.PREFIX}goodbye on|off|<text>` });
            }
        }
    });

    // ========== ANTISTATUSMENTION ==========
    commands.set('antistatusmention', {
        category,
        desc: 'Toggle anti-status mention',
        execute: async (sock, msg, args, config) => {
            if (!isGroup(msg)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Groups only.' });
            const groupJid = msg.key.remoteJid;
            const senderJid = msg.key.participant || msg.key.remoteJid;
            
            if (!await isSenderAdmin(sock, groupJid, senderJid)) return await sock.sendMessage(groupJid, { text: '❌ Only group admins.' });
            if (!await isBotAdmin(sock, groupJid)) return await sock.sendMessage(groupJid, { text: '❌ I need admin privileges.' });
            
            const action = (args[0] || '').toLowerCase();
            const state_ = (args[1] || '').toLowerCase();
            
            if (!action || !state_) {
                const current = state.getAntiStatus(groupJid);
                return await sock.sendMessage(groupJid, { 
                    text: `📵 Anti-Status: ${current.enabled ? 'ON' : 'OFF'} | ${current.action}\n${config.PREFIX}antistatusmention <delete|kick|warn> <on|off>` 
                });
            }
            
            if (!['delete', 'kick', 'warn'].includes(action)) return await sock.sendMessage(groupJid, { text: '❌ Action: delete, kick, warn' });
            if (!['on', 'off'].includes(state_)) return await sock.sendMessage(groupJid, { text: '❌ State: on, off' });
            
            state.setAntiStatus(groupJid, { enabled: state_ === 'on', action });
            await sock.sendMessage(groupJid, { text: `✅ Anti-status mention ${state_ === 'on' ? 'enabled' : 'disabled'} (${action})` });
        }
    });

    // ========== ONLYADMIN ==========
    commands.set('onlyadmin', {
        category,
        desc: 'Toggle only admin messages',
        execute: async (sock, msg, args, config) => {
            if (!isGroup(msg)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Groups only.' });
            const groupJid = msg.key.remoteJid;
            const senderJid = msg.key.participant || msg.key.remoteJid;
            
            if (!await isSenderAdmin(sock, groupJid, senderJid)) return await sock.sendMessage(groupJid, { text: '❌ Only group admins.' });
            if (!await isBotAdmin(sock, groupJid)) return await sock.sendMessage(groupJid, { text: '❌ I need admin privileges.' });
            
            const state_ = (args[0] || '').toLowerCase();
            if (!['on', 'off'].includes(state_)) {
                const current = state.getOnlyAdmin(groupJid);
                return await sock.sendMessage(groupJid, { text: `🔒 Admin-Only: ${current ? 'ON' : 'OFF'}\n${config.PREFIX}onlyadmin on/off` });
            }
            
            state.setOnlyAdmin(groupJid, state_ === 'on');
            await sock.sendMessage(groupJid, { text: `✅ Admin-only ${state_ === 'on' ? 'enabled' : 'disabled'}.` });
        }
    });

    // ========== KICKALL ==========
    commands.set('kickall', {
        category,
        desc: 'Kick all non-admin members',
        execute: async (sock, msg, args, config) => {
            if (!isGroup(msg)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Groups only.' });
            const groupJid = msg.key.remoteJid;
            const senderJid = msg.key.participant || msg.key.remoteJid;
            
            if (!await isSenderAdmin(sock, groupJid, senderJid)) return await sock.sendMessage(groupJid, { text: '❌ Only group admins.' });
            if (!await isBotAdmin(sock, groupJid)) return await sock.sendMessage(groupJid, { text: '❌ I need admin privileges.' });
            
            const { admins, participants } = await getGroupAdmins(sock, groupJid);
            const nonAdmins = participants.filter(p => !admins.includes(p.id));
            
            if (!nonAdmins.length) return await sock.sendMessage(groupJid, { text: '❌ No non-admins.' });
            
            if (!args[0] || args[0].toUpperCase() !== 'CONFIRM') {
                return await sock.sendMessage(groupJid, { text: `⚠️ This will kick ${nonAdmins.length} non-admins.\nType: ${config.PREFIX}kickall CONFIRM` });
            }
            
            await sock.sendMessage(groupJid, { text: `🔄 Kicking ${nonAdmins.length}...` });
            let kicked = 0;
            for (let i = 0; i < nonAdmins.length; i += 20) {
                const batch = nonAdmins.slice(i, i + 20).map(p => p.id);
                try {
                    await sock.groupParticipantsUpdate(groupJid, batch, 'remove');
                    kicked += batch.length;
                } catch {}
                await new Promise(r => setTimeout(r, 2000));
            }
            await sock.sendMessage(groupJid, { text: `✅ Kicked ${kicked} members.` });
        }
    });

    // ========== GROUPDESC ==========
    commands.set('groupdesc', {
        category,
        desc: 'Set group description',
        execute: async (sock, msg, args, config) => {
            if (!isGroup(msg)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Groups only.' });
            const groupJid = msg.key.remoteJid;
            const senderJid = msg.key.participant || msg.key.remoteJid;
            
            if (!args.length) {
                try {
                    const metadata = await sock.groupMetadata(groupJid);
                    return await sock.sendMessage(groupJid, { text: `📋 *Description:*\n${metadata.desc || 'None'}` });
                } catch {}
            }
            
            if (!await isSenderAdmin(sock, groupJid, senderJid)) return await sock.sendMessage(groupJid, { text: '❌ Only group admins.' });
            if (!await isBotAdmin(sock, groupJid)) return await sock.sendMessage(groupJid, { text: '❌ I need admin privileges.' });
            
            try {
                await sock.groupUpdateDescription(groupJid, args.join(' '));
                await sock.sendMessage(groupJid, { text: '✅ Description updated!' });
            } catch (e) {
                await sock.sendMessage(groupJid, { text: `❌ Failed: ${e.message}` });
            }
        }
    });

    // ========== MEMBERS ==========
    commands.set('members', {
        category,
        desc: 'Show member statistics',
        execute: async (sock, msg, args, config) => {
            if (!isGroup(msg)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Groups only.' });
            const groupJid = msg.key.remoteJid;
            
            try {
                const { admins, participants } = await getGroupAdmins(sock, groupJid);
                const countries = {};
                for (const p of participants) {
                    const num = p.id.split('@')[0];
                    const c = getCountry(num);
                    countries[c] = (countries[c] || 0) + 1;
                }
                
                let text = `👥 *Members*\n📊 Total: ${participants.length}\n👑 Admins: ${admins.length}\n\n🌍 *By Country:*\n`;
                const sorted = Object.entries(countries).sort((a, b) => b[1] - a[1]);
                sorted.slice(0, 15).forEach(([c, cnt]) => { text += `${c}: ${cnt}\n`; });
                if (sorted.length > 15) {
                    const remaining = sorted.slice(15).reduce((sum, [, cnt]) => sum + cnt, 0);
                    text += `Other: ${remaining}\n`;
                }
                await sock.sendMessage(groupJid, { text });
            } catch (e) {
                await sock.sendMessage(groupJid, { text: `❌ Failed: ${e.message}` });
            }
        }
    });

    // ========== MUTE ==========
    commands.set('mute', {
        category,
        desc: 'Mute a member',
        execute: async (sock, msg, args, config) => {
            if (!isGroup(msg)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Groups only.' });
            const groupJid = msg.key.remoteJid;
            const senderJid = msg.key.participant || msg.key.remoteJid;
            
            if (!await isSenderAdmin(sock, groupJid, senderJid)) return await sock.sendMessage(groupJid, { text: '❌ Only group admins.' });
            if (!await isBotAdmin(sock, groupJid)) return await sock.sendMessage(groupJid, { text: '❌ I need admin privileges.' });
            
            const target = getTargetJid(msg, args);
            if (!target) return await sock.sendMessage(groupJid, { text: `❌ Usage: ${config.PREFIX}mute @user <time>\nTime: 10m, 1h, 1d` });
            
            const timeStr = args[args.length - 1];
            const dur = parseDuration(timeStr);
            if (!dur) return await sock.sendMessage(groupJid, { text: '❌ Invalid time. Use: 10s, 10m, 1h, 1d' });
            
            state.setMutedUser(groupJid, target, { until: Date.now() + dur, by: senderJid });
            await sock.sendMessage(groupJid, { text: `🔇 @${target.split('@')[0]} muted for ${timeStr}.` });
        }
    });

    // ========== UNMUTE ==========
    commands.set('unmute', {
        category,
        desc: 'Unmute a member',
        execute: async (sock, msg, args, config) => {
            if (!isGroup(msg)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Groups only.' });
            const groupJid = msg.key.remoteJid;
            const senderJid = msg.key.participant || msg.key.remoteJid;
            
            if (!await isSenderAdmin(sock, groupJid, senderJid)) return await sock.sendMessage(groupJid, { text: '❌ Only group admins.' });
            
            const target = getTargetJid(msg, args);
            if (!target) return await sock.sendMessage(groupJid, { text: `❌ Usage: ${config.PREFIX}unmute @user / <number>` });
            
            state.removeMutedUser(groupJid, target);
            await sock.sendMessage(groupJid, { text: `🔊 @${target.split('@')[0]} unmuted.` });
        }
    });

    // ========== MUTELIST ==========
    commands.set('mutelist', {
        category,
        desc: 'List muted members',
        execute: async (sock, msg, args, config) => {
            if (!isGroup(msg)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Groups only.' });
            const groupJid = msg.key.remoteJid;
            
            const mutes = state.getMutedUsers(groupJid);
            const now = Date.now();
            const active = Object.entries(mutes).filter(([, data]) => data.until > now);
            
            if (!active.length) return await sock.sendMessage(groupJid, { text: '📋 No muted members.' });
            
            let text = '🔇 *Muted Members*\n\n';
            for (const [uid, data] of active) {
                const mins = Math.max(0, Math.floor((data.until - now) / 60000));
                text += `• @${uid.split('@')[0]} - ${mins}min\n`;
            }
            await sock.sendMessage(groupJid, { text });
        }
    });

    // ========== SETWARN ==========
    commands.set('setwarn', {
        category,
        desc: 'Set warning limit',
        execute: async (sock, msg, args, config) => {
            if (!isGroup(msg)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Groups only.' });
            const groupJid = msg.key.remoteJid;
            const senderJid = msg.key.participant || msg.key.remoteJid;
            
            if (!await isSenderAdmin(sock, groupJid, senderJid)) return await sock.sendMessage(groupJid, { text: '❌ Only group admins.' });
            
            const limit = parseInt(args[0]);
            if (isNaN(limit) || limit < 1 || limit > 10) return await sock.sendMessage(groupJid, { text: '❌ Provide limit 1-10.' });
            
            state.setWarningLimit(groupJid, limit);
            await sock.sendMessage(groupJid, { text: `✅ Warning limit set to ${limit}.` });
        }
    });

    // ========== ANTIBADWORD ==========
    commands.set('antibadword', {
        category,
        desc: 'Toggle bad word filter',
        execute: async (sock, msg, args, config) => {
            if (!isGroup(msg)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Groups only.' });
            const groupJid = msg.key.remoteJid;
            const senderJid = msg.key.participant || msg.key.remoteJid;
            
            if (!await isSenderAdmin(sock, groupJid, senderJid)) return await sock.sendMessage(groupJid, { text: '❌ Only group admins.' });
            if (!await isBotAdmin(sock, groupJid)) return await sock.sendMessage(groupJid, { text: '❌ I need admin privileges.' });
            
            const action = (args[0] || '').toLowerCase();
            const state_ = (args[1] || '').toLowerCase();
            
            if (!action || !state_) return await sock.sendMessage(groupJid, { text: `🚫 Bad Word Filter\n${config.PREFIX}antibadword <delete|warn|kick|mute> <on|off>` });
            if (!['delete', 'warn', 'kick', 'mute'].includes(action)) return await sock.sendMessage(groupJid, { text: '❌ Action: delete, warn, kick, mute' });
            if (!['on', 'off'].includes(state_)) return await sock.sendMessage(groupJid, { text: '❌ State: on, off' });
            
            state.setAntiBadWord(groupJid, { enabled: state_ === 'on', action });
            await sock.sendMessage(groupJid, { text: `✅ Bad word filter ${state_ === 'on' ? 'enabled' : 'disabled'} (${action}).` });
        }
    });

    // ========== ADDBADWORD ==========
    commands.set('addbadword', {
        category,
        desc: 'Add bad word to filter',
        execute: async (sock, msg, args, config) => {
            if (!isGroup(msg)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Groups only.' });
            const groupJid = msg.key.remoteJid;
            const senderJid = msg.key.participant || msg.key.remoteJid;
            
            if (!await isSenderAdmin(sock, groupJid, senderJid)) return await sock.sendMessage(groupJid, { text: '❌ Only group admins.' });
            
            const word = (args[0] || '').toLowerCase();
            if (!word) return await sock.sendMessage(groupJid, { text: `❌ Usage: ${config.PREFIX}addbadword <word>` });
            
            state.addBadWord(groupJid, word);
            await sock.sendMessage(groupJid, { text: `✅ "${word}" added.` });
        }
    });

    // ========== REMOVEBADWORD ==========
    commands.set('removebadword', {
        category,
        desc: 'Remove bad word from filter',
        execute: async (sock, msg, args, config) => {
            if (!isGroup(msg)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Groups only.' });
            const groupJid = msg.key.remoteJid;
            const senderJid = msg.key.participant || msg.key.remoteJid;
            
            if (!await isSenderAdmin(sock, groupJid, senderJid)) return await sock.sendMessage(groupJid, { text: '❌ Only group admins.' });
            
            const word = (args[0] || '').toLowerCase();
            if (!word) return await sock.sendMessage(groupJid, { text: `❌ Usage: ${config.PREFIX}removebadword <word>` });
            
            const removed = state.removeBadWord(groupJid, word);
            await sock.sendMessage(groupJid, { text: removed ? `✅ "${word}" removed.` : '❌ Not found.' });
        }
    });

    // ========== LISTBADWORD ==========
    commands.set('listbadword', {
        category,
        desc: 'List all bad words',
        execute: async (sock, msg, args, config) => {
            if (!isGroup(msg)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Groups only.' });
            const groupJid = msg.key.remoteJid;
            
            const words = state.getBadWords(groupJid);
            if (!words.length) return await sock.sendMessage(groupJid, { text: '📋 No bad words.' });
            await sock.sendMessage(groupJid, { text: `🚫 *Bad Words (${words.length})*\n${words.sort().join(', ')}` });
        }
    });

}

module.exports = { register };