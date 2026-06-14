const state = require('../state');

function register(commands, categories, category) {

    // ========== PING ==========
    commands.set('ping', {
        category,
        desc: 'Check bot latency',
        execute: async (sock, msg, args, config) => {
            const start = Date.now();
            await sock.sendMessage(msg.key.remoteJid, { text: '📡 *Pinging...*' });
            const latency = Date.now() - start;
            const { getCommands } = require('./index');
            const cmds = getCommands();
            
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `🏓 *Pong!*\n\n⏱️ Latency: *${latency}ms*\n📋 Commands: *${cmds.size}*\n💾 Storage: *${config.usingMongoDB ? 'MongoDB' : 'Local'}*\n🔌 Status: *${(config.connectionStatus || 'UNKNOWN').toUpperCase()}*`
            });
        }
    });

    // ========== HELP ==========
    commands.set('help', {
        category,
        desc: 'Show help',
        aliases: ['h'],
        execute: async (sock, msg, args, config) => {
            const { PREFIX, BOT_NAME } = config;
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `╔═══════════════════════╗\n║   📚 *${BOT_NAME} HELP*   ║\n╚═══════════════════════╝\n\n📌 *Prefix:* \`${PREFIX}\`\n\n🔹 *Quick Commands:*\n${PREFIX}menu - Interactive menu\n${PREFIX}ping - Check latency\n${PREFIX}ai <query> - Ask AI\n${PREFIX}info - Bot info\n${PREFIX}owner - Owner details\n${PREFIX}help - This message\n\n💡 *Tip:* Use \`${PREFIX}menu\` for full category list!\n\n✨ *Powered by HDM*`
            });
        }
    });

    // ========== MENU ==========
    commands.set('menu', {
        category,
        desc: 'Show interactive menu',
        aliases: ['m'],
        execute: async (sock, msg, args, config) => {
            const { PREFIX, BOT_NAME, OWNER_NAME } = config;
            const { getCommands, getCategories, getCategoryEmoji } = require('./index');
            const cmds = getCommands();
            const cats = getCategories();
            
            const catOrder = ['general', 'fun', 'group', 'settings', 'admin', 'ai', 'media', 'bug', 'utility'];
            const catNames = {
                general: 'General', fun: 'Fun', group: 'Group', 
                settings: 'Settings', admin: 'Admin', ai: 'AI',
                media: 'Media', bug: 'Bug', utility: 'Utility'
            };

            // Build category list
            const catList = [];
            let counter = 1;

            for (const key of catOrder) {
                if (cats[key]) {
                    const emoji = getCategoryEmoji(key);
                    const name = catNames[key] || key;
                    const cmdCount = cats[key].cmds?.length || 0;
                    catList.push({ number: counter, key, emoji, name, count: cmdCount });
                    counter++;
                }
            }

            // Build menu
            const W = 38;
            let menuText = '';
            menuText += '╔' + '═'.repeat(W) + '╗\n';
            menuText += '║' + ' '.repeat(W) + '║\n';
            menuText += '║   ╦ ╦╔╦╗╔╦╗  ╔╗ ╔═╗╔╦╗        ║\n';
            menuText += '║   ╠═╣ ║║║║║  ╠╩╗║ ║ ║         ║\n';
            menuText += '║   ╩ ╩═╩╝╩ ╩  ╚═╝╚═╝ ╩         ║\n';
            menuText += '║   🤖 Multi-Session WhatsApp     ║\n';
            menuText += pad(`║   ${BOT_NAME}`, W + 1) + '║\n';
            menuText += pad(`║   By ${OWNER_NAME}`, W + 1) + '║\n';
            menuText += '╠' + '═'.repeat(W) + '╣\n';
            menuText += pad(`║   📋 Prefix: ${PREFIX}`, W + 1) + '║\n';
            menuText += pad(`║   📊 Commands: ${cmds.size}`, W + 1) + '║\n';
            menuText += '╠' + '═'.repeat(W) + '╣\n';
            menuText += '║       📂 SELECT CATEGORY         ║\n';
            menuText += '╠' + '═'.repeat(W) + '╣\n';
            menuText += '║                                  ║\n';

            // 2 columns
            for (let i = 0; i < catList.length; i += 2) {
                const left = catList[i];
                const right = catList[i + 1];
                
                if (left && right) {
                    const l = `${left.number}. ${left.emoji} ${left.name} (${left.count})`;
                    const r = `${right.number}. ${right.emoji} ${right.name} (${right.count})`;
                    menuText += '║  ' + padEnd(l, 17) + '  ' + padEnd(r, 17) + '║\n';
                } else if (left) {
                    const l = `${left.number}. ${left.emoji} ${left.name} (${left.count})`;
                    menuText += '║  ' + padEnd(l, 34) + '║\n';
                }
            }

            menuText += '║                                  ║\n';
            menuText += '╠' + '═'.repeat(W) + '╣\n';
            menuText += `║  💬 Reply number (1-${catList.length})   ║\n`;
            menuText += '║  ⏰ Expires in 60 seconds        ║\n';
            menuText += '╚' + '═'.repeat(W) + '╝';

            // Store session
            const senderNum = msg.key.participant?.split('@')[0] || msg.key.remoteJid.split('@')[0];
            state.setMenuSession(senderNum, {
                items: catList,
                type: 'category',
                expires: Date.now() + 60000,
                prefix: PREFIX
            });

            await sock.sendMessage(msg.key.remoteJid, { text: menuText });
        }
    });

    // ========== INFO ==========
    commands.set('info', {
        category,
        desc: 'Bot information',
        execute: async (sock, msg, args, config) => {
            const { PREFIX, BOT_NAME, OWNER_NAME } = config;
            const { getCommands } = require('./index');
            const cmds = getCommands();
            const uptime = process.uptime();
            const h = Math.floor(uptime / 3600);
            const m = Math.floor((uptime % 3600) / 60);
            const s = Math.floor(uptime % 60);
            const mem = Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100;

            await sock.sendMessage(msg.key.remoteJid, { 
                text: `╔═══════════════════════╗\n║   🤖 *BOT INFORMATION*  ║\n╚═══════════════════════╝\n\n👤 *Name:* ${BOT_NAME}\n👑 *Owner:* ${OWNER_NAME}\n📌 *Prefix:* \`${PREFIX}\`\n📊 *Commands:* ${cmds.size}\n⏱️ *Uptime:* ${h}h ${m}m ${s}s\n💾 *Memory:* ${mem}MB\n🧠 *AI:* HDM AI\n📦 *Storage:* ${config.usingMongoDB ? 'MongoDB' : 'Local'}\n🔌 *Status:* ${(config.connectionStatus || 'UNKNOWN').toUpperCase()}\n\n✨ *Powered by HDM*`
            });
        }
    });

    // ========== STATUS ==========
    commands.set('status', {
        category,
        desc: 'Connection status',
        execute: async (sock, msg, args, config) => {
            const connected = config.connectionStatus === 'connected';
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `📊 *Status*\n\nWhatsApp: ${connected ? '✅ Connected' : '❌ Disconnected'}\nStorage: ${config.usingMongoDB ? '☁️ MongoDB' : '📁 Local'}\nPrefix: \`${config.PREFIX}\`\nSession: \`${config.SESSION_ID}\``
            });
        }
    });

    // ========== GETID ==========
    commands.set('getid', {
        category,
        desc: 'Get your ID',
        aliases: ['id'],
        execute: async (sock, msg, args, config) => {
            const sender = msg.key.participant || msg.key.remoteJid;
            const num = sender.split('@')[0];
            const isGroup = msg.key.remoteJid?.includes('@g.us');
            
            let text = `🆔 *Your Info*\n\n📱 Number: *${num}*\n`;
            if (isGroup) text += `👥 Group ID: \`${msg.key.remoteJid}\`\n`;
            text += `🔖 Chat Type: ${isGroup ? 'Group' : 'Private'}`;
            
            await sock.sendMessage(msg.key.remoteJid, { text });
        }
    });

    // ========== ECHO ==========
    commands.set('echo', {
        category,
        desc: 'Echo a message',
        aliases: ['say'],
        execute: async (sock, msg, args, config) => {
            if (!args.length) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Usage: ${config.PREFIX}echo <message>` });
            await sock.sendMessage(msg.key.remoteJid, { text: args.join(' ') });
        }
    });

    // ========== TEST ==========
    commands.set('test', {
        category,
        desc: 'Test if bot is working',
        execute: async (sock, msg, args, config) => {
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `✅ *Bot is working!*\n\n🤖 ${config.BOT_NAME}\n⏱️ ${new Date().toLocaleString()}\n📌 Prefix: \`${config.PREFIX}\`\n\nTest successful! 🎉` 
            });
        }
    });

    // ========== RULES ==========
    commands.set('rules', {
        category,
        desc: 'Show bot rules',
        execute: async (sock, msg, args, config) => {
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `╔═══════════════════════╗\n║   📜 *BOT RULES*       ║\n╚═══════════════════════╝\n\n1. 🤝 Respect all users\n2. 🚫 No spam or abuse\n3. 📵 No illegal content\n4. 🤖 Don't abuse AI commands\n5. 👑 Follow admin instructions\n6. 🔒 Keep session secure\n\n⚠️ Violations may result in ban.\n✨ *Powered by HDM*`
            });
        }
    });

    // ========== OWNER ==========
    commands.set('owner', {
        category,
        desc: 'Show owner info',
        execute: async (sock, msg, args, config) => {
            const { BOT_NAME, OWNER_NAME } = config;
            const ownerNum = state.getGlobalSetting('ownerNumber', config.OWNER_NUMBER || 'N/A');
            
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `╔═══════════════════════╗\n║   👑 *BOT OWNER*       ║\n╚═══════════════════════╝\n\n👤 *Name:* ${OWNER_NAME}\n🤖 *Bot:* ${BOT_NAME}\n📱 *Contact:* +${ownerNum}\n📧 *Email:* davix@hdm-bot.com\n🌐 *Web:* hdmbot-server.pxxl.click\n\n📞 *For:*\n• Bug reports\n• Feature requests\n• Partnership`
            });
        }
    });
}

// ==================== HELPERS ====================

function pad(str, width) {
    const clean = str.replace(/\*/g, '').replace(/_/g, '').replace(/`/g, '');
    const needed = width - clean.length - 1;
    if (needed <= 0) return str;
    return str + ' '.repeat(needed);
}

function padEnd(str, width) {
    const clean = str.replace(/\*/g, '').replace(/_/g, '').replace(/`/g, '');
    if (clean.length >= width) return clean.substring(0, width);
    return str + ' '.repeat(width - clean.length);
}

module.exports = { register };