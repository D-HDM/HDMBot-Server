const state = require('../state');
const { isAdmin, isOwner, isBugUser } = require('../helpers/permissions');

function register(commands, categories, category) {
    commands.set('bugmenu', {
        category,
        desc: 'Show bug menu',
        execute: async (sock, msg, args, config) => {
            const sender = msg.key.participant || msg.key.remoteJid;
            if (!isBugUser(sender)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Not authorized.' });
            
            const { PREFIX } = config;
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `🐛 *BUG MENU*\n\n${PREFIX}bug <num> <msg> <count> <interval>\n${PREFIX}stopbug\n\nExample: ${PREFIX}bug 254712345678 "Hi" 50 2`
            });
        }
    });

    commands.set('bug', {
        category,
        desc: 'Send bug messages',
        execute: async (sock, msg, args, config) => {
            const sender = msg.key.participant || msg.key.remoteJid;
            if (!isBugUser(sender)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Not authorized.' });
            
            if (args.length < 4) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ ${config.PREFIX}bug <num> <msg> <count> <interval>` });
            
            try {
                const target = args[0].replace(/[^0-9]/g, '');
                const count = parseInt(args[args.length - 2]);
                const interval = parseFloat(args[args.length - 1]);
                const message = args.slice(1, -2).join(' ');
                
                const BUG_MAX = parseInt(process.env.BUG_MAX_MESSAGES) || 1000;
                if (count < 1 || count > BUG_MAX) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Count 1-${BUG_MAX}.` });
                if (interval < 0.01 || interval > 60) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Interval 0.01-60s.' });
                
                const targetJid = `${target}@c.us`;
                const attackId = `${Date.now()}_${target}`;
                
                state.setAttack(attackId, { stopped: false, from: sender, target: targetJid });
                
                let sent = 0;
                const sendLoop = async () => {
                    const attack = state.getAttack(attackId);
                    if (!attack || attack.stopped || sent >= count) {
                        state.removeAttack(attackId);
                        try { await sock.sendMessage(msg.key.remoteJid, { text: `✅ Done: ${sent}/${count}` }); } catch {}
                        return;
                    }
                    try { await sock.sendMessage(targetJid, { text: message }); sent++; } catch {}
                    setTimeout(sendLoop, interval * 1000);
                };
                
                sendLoop();
                await sock.sendMessage(msg.key.remoteJid, { text: `🐛 Started: ${target} (${count}msgs, ${interval}s)` });
            } catch {
                await sock.sendMessage(msg.key.remoteJid, { text: '❌ Invalid args.' });
            }
        }
    });

    commands.set('stopbug', {
        category,
        desc: 'Stop bug attacks',
        execute: async (sock, msg, args, config) => {
            const sender = msg.key.participant || msg.key.remoteJid;
            if (!isBugUser(sender)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Not authorized.' });
            
            let stopped = 0;
            const attacks = state.getAttacks();
            for (const [id, attack] of Object.entries(attacks)) {
                if (attack.from === sender) {
                    attack.stopped = true;
                    state.removeAttack(id);
                    stopped++;
                }
            }
            await sock.sendMessage(msg.key.remoteJid, { text: stopped ? `✅ Stopped ${stopped}.` : '❌ None active.' });
        }
    });

    commands.set('addbuguser', {
        category,
        desc: 'Add bug user',
        execute: async (sock, msg, args, config) => {
            const sender = msg.key.participant || msg.key.remoteJid;
            if (!isAdmin(sender)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Admin only.' });
            
            const target = args[0]?.replace(/[^0-9]/g, '');
            if (!target) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ ${config.PREFIX}addbuguser <number>` });
            
            const bugUsers = state.getGlobalSetting('bugUsers', []);
            if (bugUsers.includes(target)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Already bug user.' });
            
            bugUsers.push(target);
            state.setGlobalSetting('bugUsers', bugUsers);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ @${target} added.` });
        }
    });

    commands.set('listbugusers', {
        category,
        desc: 'List bug users',
        execute: async (sock, msg, args, config) => {
            const sender = msg.key.participant || msg.key.remoteJid;
            if (!isAdmin(sender)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Admin only.' });
            
            const bugUsers = state.getGlobalSetting('bugUsers', []);
            const text = `🐛 *Bug Users (${bugUsers.length})*\n` + (bugUsers.length ? bugUsers.map((u, i) => `${i + 1}. ${u}`).join('\n') : 'None.');
            await sock.sendMessage(msg.key.remoteJid, { text });
        }
    });

    commands.set('removebuguser', {
        category,
        desc: 'Remove bug user',
        execute: async (sock, msg, args, config) => {
            const sender = msg.key.participant || msg.key.remoteJid;
            if (!isAdmin(sender)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Admin only.' });
            
            const target = args[0]?.replace(/[^0-9]/g, '');
            if (!target) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ ${config.PREFIX}removebuguser <number>` });
            
            const bugUsers = state.getGlobalSetting('bugUsers', []);
            const idx = bugUsers.indexOf(target);
            if (idx === -1) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Not a bug user.' });
            
            bugUsers.splice(idx, 1);
            state.setGlobalSetting('bugUsers', bugUsers);
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ @${target} removed.` });
        }
    });

    commands.set('antibug', {
        category,
        desc: 'Toggle anti-bug',
        execute: async (sock, msg, args, config) => {
            const senderNum = msg.key.participant?.split('@')[0] || msg.key.remoteJid.split('@')[0];
            const state_ = (args[0] || '').toLowerCase();
            const current = state.getUserSetting(senderNum, 'anti_bug', false);
            if (!['on', 'off'].includes(state_)) {
                return await sock.sendMessage(msg.key.remoteJid, { text: `🛡️ Anti-Bug: ${current ? 'ON' : 'OFF'}\n${config.PREFIX}antibug on/off` });
            }
            state.setUserSetting(senderNum, 'anti_bug', state_ === 'on');
            await sock.sendMessage(msg.key.remoteJid, { text: `✅ Anti-bug ${state_ === 'on' ? 'enabled' : 'disabled'}.` });
        }
    });

    commands.set('buglogs', {
        category,
        desc: 'Show bug logs',
        execute: async (sock, msg, args, config) => {
            const sender = msg.key.participant || msg.key.remoteJid;
            if (!isAdmin(sender)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Admin only.' });
            
            const logs = state.getGlobalSetting('bugLogs', []);
            if (!logs.length) return await sock.sendMessage(msg.key.remoteJid, { text: '📜 None.' });
            
            let text = '🐛 *Bug Logs*\n\n';
            logs.slice(-10).reverse().forEach((log, i) => {
                text += `${i + 1}. ${log.attacker} - ${log.command}\n   ${log.timestamp}\n\n`;
            });
            await sock.sendMessage(msg.key.remoteJid, { text });
        }
    });

    commands.set('clearbuglogs', {
        category,
        desc: 'Clear bug logs',
        execute: async (sock, msg, args, config) => {
            const sender = msg.key.participant || msg.key.remoteJid;
            if (!isOwner(sender)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Only owner.' });
            
            state.setGlobalSetting('bugLogs', []);
            await sock.sendMessage(msg.key.remoteJid, { text: '✅ Cleared.' });
        }
    });
}

module.exports = { register };