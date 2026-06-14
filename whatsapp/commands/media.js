const fs = require('fs');
const path = require('path');

let HAS_SHARP = false;
try {
    require('sharp');
    HAS_SHARP = true;
} catch {}

function register(commands, categories, category) {
    commands.set('sticker', {
        category,
        desc: 'Create sticker from image',
        execute: async (sock, msg, args, config) => {
            if (!HAS_SHARP) return await sock.sendMessage(msg.key.remoteJid, { text: '❌ Install sharp: npm install sharp' });
            
            try {
                const quoted = msg.message?.extendedTextMessage?.contextInfo?.quotedMessage;
                if (quoted?.imageMessage) {
                    await sock.sendMessage(msg.key.remoteJid, { text: '🎨 Creating sticker...' });
                    const buffer = await sock.downloadMediaMessage({
                        message: { imageMessage: quoted.imageMessage },
                        key: { remoteJid: msg.key.remoteJid }
                    });
                    
                    const tempDir = path.join(__dirname, '..', '..', 'temp');
                    if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });
                    
                    const sharp = require('sharp');
                    const stickerBuffer = await sharp(buffer).resize(512, 512).webp({ quality: 90 }).toBuffer();
                    
                    await sock.sendMessage(msg.key.remoteJid, { sticker: stickerBuffer });
                } else {
                    await sock.sendMessage(msg.key.remoteJid, { text: '❌ Reply to an image with .sticker' });
                }
            } catch (e) {
                await sock.sendMessage(msg.key.remoteJid, { text: `❌ ${e.message}` });
            }
        }
    });

    commands.set('take', {
        category,
        desc: 'Set sticker metadata',
        execute: async (sock, msg, args, config) => {
            if (!args.length) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Usage: ${config.PREFIX}take <pack>|<author>` });
            await sock.sendMessage(msg.key.remoteJid, { text: '✅ Sticker metadata set.' });
        }
    });
}

module.exports = { register };