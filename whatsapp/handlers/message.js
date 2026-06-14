const { executeCommand, getCommands } = require('../commands');
const state = require('../state');

async function handleMessage(sock, msg, config) {
    try {
        const messageType = Object.keys(msg.message || {})[0];
        if (!messageType) return;

        const messageContent = msg.message[messageType];
        let text = '';

        if (messageType === 'conversation') {
            text = messageContent;
        } else if (messageType === 'extendedTextMessage') {
            text = messageContent.text || '';
        } else if (messageType === 'imageMessage') {
            text = messageContent.caption || '';
        } else if (messageType === 'videoMessage') {
            text = messageContent.caption || '';
        }

        if (!text) return;

        const senderJid = msg.key.participant || msg.key.remoteJid;
        const senderNum = senderJid.split('@')[0];
        const chatJid = msg.key.remoteJid;
        const isFromMe = msg.key.fromMe;

        // ==================== GET PREFIX & MODE ====================
        const userPrefix = state.getUserSetting(senderNum, 'prefix', config.PREFIX);
        const PREFIX = userPrefix || config.PREFIX;
        const mode = state.getUserSetting(senderNum, 'mode', 'public');
        const ownerNum = state.getGlobalSetting('ownerNumber', config.OWNER_NUMBER) || config.OWNER_NUMBER;

        // ==================== MENU SESSION ====================
        const menuSession = state.getMenuSession(senderNum);

        if (menuSession && Date.now() < menuSession.expires) {
            const match = text.trim().match(/^(\d+)$/);
            
            if (match) {
                const num = parseInt(match[1]);
                const item = menuSession.items.find(i => i.number === num);

                if (item && menuSession.type === 'category') {
                    const { getCategoryEmoji } = require('../commands');
                    const cmds = getCommands();
                    const catCommands = [];

                    for (const [name, cmd] of cmds) {
                        if (cmd.category === item.key) {
                            catCommands.push({ name, desc: cmd.desc || '' });
                        }
                    }

                    const emoji = getCategoryEmoji(item.key);
                    const p = menuSession.prefix || PREFIX;

                    let subMenu = '';
                    subMenu += `╔══════════════════════════════════════╗\n`;
                    subMenu += `║  ${emoji} ${item.name} Commands                 ║\n`;
                    subMenu += `╠══════════════════════════════════════╣\n`;

                    const flatList = [];
                    let counter = 1;

                    for (const { name, desc } of catCommands.sort((a, b) => a.name.localeCompare(b.name))) {
                        subMenu += `║ ${String(counter).padStart(2)}. ${p}${name.padEnd(14)} ${desc.substring(0, 16).padEnd(16)}║\n`;
                        flatList.push({ number: counter, command: name });
                        counter++;
                    }

                    subMenu += `╚══════════════════════════════════════╝\n`;
                    subMenu += `💬 Reply *1-${flatList.length}* • *0* Back • 60s`;

                    state.setMenuSession(senderNum, {
                        items: flatList,
                        type: 'command',
                        expires: Date.now() + 60000,
                        prefix: p
                    });

                    await sock.sendMessage(chatJid, { text: subMenu });
                    return;
                }

                if (item && menuSession.type === 'command') {
                    state.removeMenuSession(senderNum);
                    const cmd = getCommands().get(item.command);
                    if (cmd) {
                        console.log(`[MENU] ${senderNum} → ${item.command}`);
                        await cmd.execute(sock, msg, [], config);
                    }
                    return;
                }
            }

            if (text.trim() === '0' && menuSession.type === 'command') {
                state.removeMenuSession(senderNum);
                const menuCmd = getCommands().get('menu');
                if (menuCmd) await menuCmd.execute(sock, msg, [], config);
                return;
            }

            if (!text.startsWith(PREFIX) && !text.match(/^\d+$/)) return;
        }

        // ==================== MUST START WITH PREFIX ====================
        if (!text.startsWith(PREFIX)) return;

        // ==================== PRIVATE MODE CHECK (STRICT) ====================
        if (mode === 'private') {
            const isOwner = (senderNum === ownerNum);
            const isSelf = isFromMe;
            
            if (!isOwner && !isSelf) {
                // SILENTLY IGNORE - No response at all
                console.log(`[BLOCKED] Private mode - ignored ${senderNum}`);
                return;
            }
        }

        // ==================== EXECUTE COMMAND ====================
        const args = text.slice(PREFIX.length).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();

        if (!cmdName) return;

        const sender = isFromMe ? '[SELF]' : '[USER]';
        console.log(`${sender} ${PREFIX}${cmdName} from ${senderNum} [mode: ${mode}]`);

        const executed = await executeCommand(cmdName, sock, msg, args, config);

        if (!executed && isFromMe) {
            await sock.sendMessage(chatJid, { 
                text: `❌ Unknown: *${PREFIX}${cmdName}*\nType *${PREFIX}help*` 
            });
        }

    } catch (error) {
        if (!error.message?.includes('Bad MAC') && 
            !error.message?.includes('decrypt') &&
            !error.message?.includes('Session error') &&
            !error.message?.includes('Closing session')) {
            console.error('Handler error:', error.message);
        }
    }
}

module.exports = { handleMessage };