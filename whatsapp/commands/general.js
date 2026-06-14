function register(commands, categories, category) {
    commands.set('ping', {
        category,
        desc: 'Check bot latency',
        execute: async (sock, msg, args, config) => {
            const start = Date.now();
            await sock.sendMessage(msg.key.remoteJid, { text: '📡 Pinging...' });
            const latency = Date.now() - start;
            await sock.sendMessage(msg.key.remoteJid, { text: `🏓 Pong! Latency: ${latency}ms` });
        }
    });

    commands.set('help', {
        category,
        desc: 'Show help',
        execute: async (sock, msg, args, config) => {
            const { PREFIX } = config;
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `*📚 ${config.BOT_NAME} HELP*\n\nPrefix: \`${PREFIX}\`\n\n${PREFIX}menu - Interactive menu\n${PREFIX}ping - Check response\n${PREFIX}ai <query> - Ask AI\n${PREFIX}info - Bot info\n${PREFIX}status - Connection\nUse \`${PREFIX}menu\` for all commands.`
            });
        }
    });

    commands.set('menu', {
        category,
        desc: 'Show interactive menu',
        execute: async (sock, msg, args, config) => {
            const { PREFIX, BOT_NAME } = config;
            const { getCategories, getCategoryEmoji } = require('./index');
            const cats = getCategories();
            const catKeys = ['general', 'fun', 'settings', 'admin', 'ai', 'media', 'bug', 'utility'];
            
            let menuText = '╔══════════════════════════════════════╗\n';
            menuText += '║   ╦ ╦╔╦╗╔╦╗  ╔╗ ╔═╗╔╦╗            ║\n';
            menuText += '║   ╠═╣ ║║║║║  ╠╩╗║ ║ ║             ║\n';
            menuText += '║   ╩ ╩═╩╝╩ ╩  ╚═╝╚═╝ ╩             ║\n';
            menuText += `║   🤖 ${BOT_NAME.padEnd(26)}║\n`;
            menuText += `║   Prefix: ${PREFIX.padEnd(26)}║\n`;
            menuText += `║   Commands: ${String(commands.size).padEnd(25)}║\n`;
            menuText += '╠══════════════════════════════════════╣\n';
            menuText += '║       📋 SELECT CATEGORY             ║\n';
            menuText += '╠══════════════════════════════════════╣\n';

            let counter = 1;
            const catList = [];
            for (const key of catKeys) {
                const cat = cats[key];
                if (!cat) continue;
                const emoji = getCategoryEmoji(key);
                catList.push({ number: counter, key, emoji, name: key.charAt(0).toUpperCase() + key.slice(1) });
                counter++;
            }

            for (let i = 0; i < catList.length; i += 2) {
                const left = catList[i];
                const right = catList[i + 1];
                const leftText = `${left.number}. ${left.emoji} ${left.name}`;
                if (right) {
                    const rightText = `${right.number}. ${right.emoji} ${right.name}`;
                    menuText += `║  ${leftText.padEnd(20)} ${rightText.padEnd(17)}║\n`;
                } else {
                    menuText += `║  ${leftText.padEnd(37)}║\n`;
                }
            }

            menuText += '╚══════════════════════════════════════╝\n';
            menuText += `Reply with number (1-${catList.length}) • Expires 60s`;
            
            await sock.sendMessage(msg.key.remoteJid, { text: menuText });
        }
    });

    commands.set('info', {
        category,
        desc: 'Bot information',
        execute: async (sock, msg, args, config) => {
            const { PREFIX, BOT_NAME } = config;
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `*🤖 ${BOT_NAME} v2.0*\nPrefix: \`${PREFIX}\`\nCommands: ${commands.size}\nAI: HDM AI`
            });
        }
    });

    commands.set('status', {
        category,
        desc: 'Connection status',
        execute: async (sock, msg, args, config) => {
            const connected = config.connectionStatus === 'connected';
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `📊 *Status*\nWhatsApp: ${connected ? '✅ Connected' : '❌ Disconnected'}`
            });
        }
    });

    commands.set('getid', {
        category,
        desc: 'Get your ID',
        execute: async (sock, msg, args, config) => {
            const sender = msg.key.participant || msg.key.remoteJid;
            const num = sender.split('@')[0];
            await sock.sendMessage(msg.key.remoteJid, { text: `🆔 Your ID: ${num}` });
        }
    });

    commands.set('echo', {
        category,
        desc: 'Echo message',
        execute: async (sock, msg, args, config) => {
            await sock.sendMessage(msg.key.remoteJid, { text: args.join(' ') || '(nothing to echo)' });
        }
    });

    commands.set('test', {
        category,
        desc: 'Test bot',
        execute: async (sock, msg, args, config) => {
            await sock.sendMessage(msg.key.remoteJid, { text: '✅ Bot is working! Test successful.' });
        }
    });

    commands.set('rules', {
        category,
        desc: 'Show rules',
        execute: async (sock, msg, args, config) => {
            await sock.sendMessage(msg.key.remoteJid, { text: '📜 *Rules:*\nConfigure auto-reply rules via the dashboard.' });
        }
    });
}

module.exports = { register };