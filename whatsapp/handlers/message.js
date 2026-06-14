const { executeCommand } = require('../commands');
const state = require('../state');

async function handleMessage(sock, msg, config) {
    try {
        const messageType = Object.keys(msg.message || {})[0];
        if (!messageType) return;

        const messageContent = msg.message[messageType];
        let text = '';
        
        if (messageType === 'conversation') text = messageContent;
        else if (messageType === 'extendedTextMessage') text = messageContent.text || '';
        else if (messageType === 'imageMessage') text = messageContent.caption || '';
        else if (messageType === 'videoMessage') text = messageContent.caption || '';

        if (!text) return;

        const senderJid = msg.key.participant || msg.key.remoteJid;
        const senderNum = senderJid.split('@')[0];
        const chatJid = msg.key.remoteJid;
        const isFromMe = msg.key.fromMe;

        // Get user's custom prefix
        const userPrefix = state.getUserSetting(senderNum, 'prefix', config.PREFIX);
        const PREFIX = userPrefix || config.PREFIX;

        // Check mode
        const mode = state.getUserSetting(senderNum, 'mode', 'public');
        if (mode === 'private' && !isFromMe) {
            const ownerNum = state.getGlobalSetting('ownerNumber', config.OWNER_NUMBER);
            if (senderNum !== ownerNum) return;
        }

        if (!text.startsWith(PREFIX)) return;

        const args = text.slice(PREFIX.length).trim().split(/ +/);
        const cmdName = args.shift().toLowerCase();

        if (!cmdName) return;

        console.log(`[CMD] ${PREFIX}${cmdName} from ${senderNum}`);

        const executed = await executeCommand(cmdName, sock, msg, args, config);
        if (!executed && isFromMe) {
            await sock.sendMessage(chatJid, { text: `❌ Unknown: *${PREFIX}${cmdName}*` });
        }
    } catch (error) {
        if (!error.message?.includes('Bad MAC') && !error.message?.includes('decrypt')) {
            console.error('Message handler error:', error.message);
        }
    }
}

module.exports = { handleMessage };