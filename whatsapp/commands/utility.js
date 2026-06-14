const { isAdmin } = require('../helpers/permissions');
const state = require('../state');

function register(commands, categories, category) {
    commands.set('poll', {
        category,
        desc: 'Create a poll',
        execute: async (sock, msg, args, config) => {
            const text = args.join(' ');
            const matches = text.match(/"([^"]*)"/g);
            if (!matches || matches.length < 2) {
                return await sock.sendMessage(msg.key.remoteJid, { text: `❌ ${config.PREFIX}poll "Q?" "A" "B" "C"` });
            }
            
            const parts = matches.map(m => m.replace(/"/g, ''));
            let pollText = `📊 *POLL*\n\n${parts[0]}\n\n`;
            parts.slice(1, 6).forEach((opt, i) => { pollText += `${i + 1}️⃣ ${opt}\n`; });
            pollText += '\n_Reply with number!_';
            
            await sock.sendMessage(msg.key.remoteJid, { text: pollText });
        }
    });

    commands.set('broadcast', {
        category,
        desc: 'Broadcast to all groups',
        execute: async (sock, msg, args, config) => {
            const sender = msg.key.participant || msg.key.remoteJid;
            if (!isAdmin(sender)) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Admin only.' });
            
            const message = args.join(' ');
            if (!message) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ ${config.PREFIX}broadcast <msg>` });
            
            try {
                const groups = await sock.groupFetchAllParticipating();
                const groupIds = Object.keys(groups);
                if (!groupIds.length) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ No groups.' });
                
                await sock.sendMessage(msg.key.remoteJid, { text: `📢 Broadcasting to ${groupIds.length}...` });
                let sent = 0;
                for (const gid of groupIds) {
                    try { await sock.sendMessage(gid, { text: `📢 *BROADCAST*\n\n${message}` }); sent++; } catch {}
                    await new Promise(r => setTimeout(r, 1000));
                }
                await sock.sendMessage(msg.key.remoteJid, { text: `✅ ${sent}/${groupIds.length}` });
            } catch (e) {
                await sock.sendMessage(msg.key.remoteJid, { text: `❌ ${e.message}` });
            }
        }
    });

    commands.set('pair', {
        category,
        desc: 'Get pairing code',
        execute: async (sock, msg, args, config) => {
            const phone = args[0]?.replace(/[^0-9]/g, '');
            if (!phone) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ ${config.PREFIX}pair <phone>` });
            
            try {
                // Note: Pairing code generation depends on Baileys version
                const code = await sock.requestPairingCode(phone);
                state.setPairingCode(code, { phone, timestamp: Date.now() });
                await sock.sendMessage(msg.key.remoteJid, { text: `🔗 *Pairing Code*\n📱 +${phone}\n🔑 ${code}\n\n_Expires 5min._` });
            } catch (e) {
                await sock.sendMessage(msg.key.remoteJid, { text: `❌ ${e.message}` });
            }
        }
    });
}

module.exports = { register };