require('dotenv').config();
const {
    default: makeWASocket,
    useMultiFileAuthState,
    DisconnectReason,
    fetchLatestBaileysVersion,
    makeCacheableSignalKeyStore,
    Browsers
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');
const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const mongoose = require('mongoose');
const Session = require('./models/session');

// ==================== CONFIGURATION ====================
const PREFIX = process.env.PREFIX || '.';
const BOT_NAME = process.env.BOT_NAME || 'HDM BOT';
const OWNER_NAME = process.env.OWNER_NAME || 'Davix HDM';
const OWNER_NUMBER = process.env.OWNER_NUMBER;
const SESSION_ID = process.env.SESSION_ID || 'HDM-BOT-SESSION';
const MONGODB_URI = process.env.MONGODB_URI;

// ==================== EXPORT STATE ====================
let sock = null;
let qrCodeData = null;
let qrScanned = false;
let connectionStatus = 'disconnected';
let usingMongoDB = false;

// ==================== MONGODB CONNECTION ====================
if (MONGODB_URI && MONGODB_URI !== '') {
    usingMongoDB = true;
    mongoose.connect(MONGODB_URI).then(() => {
        console.log('📦 MongoDB connected - Sessions will persist');
        // Clean expired sessions on startup
        Session.cleanExpiredSessions().catch(() => {});
    }).catch(err => {
        console.error('❌ MongoDB connection failed:', err.message);
        console.log('📁 Falling back to local storage');
        usingMongoDB = false;
    });
} else {
    console.log('📁 Using local file storage');
}

// ==================== LOGGER CONFIG ====================
const logsDir = path.join(__dirname, 'logs');
if (!fs.existsSync(logsDir)) {
    fs.mkdirSync(logsDir, { recursive: true });
}

const logger = pino({ 
    level: 'silent',
    transport: {
        target: 'pino/file',
        options: { destination: path.join(logsDir, 'baileys.log') }
    }
});

// ==================== COMMAND HANDLER ====================
const commands = new Map();

function registerCommands() {
    commands.set('menu', {
        desc: 'Show available commands',
        execute: async (msg) => {
            const helpMenu = `
╔═══════════════════╗
║    *${BOT_NAME}*    ║
║   By ${OWNER_NAME}   ║
╚═══════════════════╝

📌 *Available Commands:*
${PREFIX}menu - Show this menu
${PREFIX}ping - Check bot latency
${PREFIX}owner - Show owner info
${PREFIX}info - Bot information
${PREFIX}sticker - Create sticker
${PREFIX}help - Show all commands
${PREFIX}stats - Session statistics

✨ *Powered by HDM*
            `;
            await sock.sendMessage(msg.key.remoteJid, { text: helpMenu });
        }
    });

    commands.set('ping', {
        desc: 'Check bot latency',
        execute: async (msg) => {
            const start = Date.now();
            await sock.sendMessage(msg.key.remoteJid, { text: '📊 *Testing...*' });
            const latency = Date.now() - start;
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `🏓 *Pong!*\n⏱️ Latency: ${latency}ms\n💾 Storage: ${usingMongoDB ? '☁️ MongoDB' : '📁 Local'}`
            });
        }
    });

    commands.set('owner', {
        desc: 'Show owner information',
        execute: async (msg) => {
            const ownerInfo = `
👑 *Bot Owner Information*

*Name:* ${OWNER_NAME}
*Bot:* ${BOT_NAME}
*Status:* Active ✅

📞 Contact for:
- Bug reports
- Feature requests
- Partnership
            `;
            await sock.sendMessage(msg.key.remoteJid, { text: ownerInfo });
        }
    });

    commands.set('info', {
        desc: 'Bot information',
        execute: async (msg) => {
            const uptime = process.uptime();
            const hours = Math.floor(uptime / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);

            let sessionInfo = '';
            if (usingMongoDB) {
                const session = await Session.findOne({ sessionId: SESSION_ID });
                if (session) {
                    sessionInfo = `\n*Session:* ${session.status}\n*Last Connected:* ${session.metadata.lastConnected?.toLocaleString() || 'N/A'}`;
                }
            }

            const info = `
🤖 *${BOT_NAME}*

*Creator:* ${OWNER_NAME}
*Prefix:* ${PREFIX}
*Uptime:* ${hours}h ${minutes}m ${seconds}s
*Platform:* WhatsApp
*Framework:* HDM
*Self CMD:* ✅ Enabled
*Status:* ${connectionStatus.toUpperCase()}
*Storage:* ${usingMongoDB ? '☁️ MongoDB' : '📁 Local'}${sessionInfo}
            `;
            await sock.sendMessage(msg.key.remoteJid, { text: info });
        }
    });

    commands.set('help', {
        desc: 'Detailed help',
        execute: async (msg) => {
            let helpText = `📚 *${BOT_NAME} Command List*\n\n`;
            for (const [name, cmd] of commands) {
                helpText += `*${PREFIX}${name}* - ${cmd.desc}\n`;
            }
            helpText += `\n💡 Send ${PREFIX}menu for quick menu`;
            await sock.sendMessage(msg.key.remoteJid, { text: helpText });
        }
    });

    commands.set('sticker', {
        desc: 'Create sticker from image',
        execute: async (msg) => {
            const messageType = Object.keys(msg.message)[0];
            if (messageType === 'imageMessage') {
                try {
                    const buffer = await sock.downloadMediaMessage(msg);
                    await sock.sendMessage(msg.key.remoteJid, { 
                        sticker: buffer,
                        packName: BOT_NAME,
                        authorName: OWNER_NAME
                    });
                } catch (error) {
                    await sock.sendMessage(msg.key.remoteJid, { 
                        text: '❌ Failed to create sticker.'
                    });
                }
            } else {
                await sock.sendMessage(msg.key.remoteJid, { 
                    text: '❌ Send an image with caption *.sticker*'
                });
            }
        }
    });

    commands.set('stats', {
        desc: 'Show session statistics',
        execute: async (msg) => {
            if (!usingMongoDB) {
                return await sock.sendMessage(msg.key.remoteJid, { 
                    text: '📊 Stats only available with MongoDB storage.'
                });
            }

            const stats = await Session.getSessionStats();
            const session = await Session.findOne({ sessionId: SESSION_ID });
            
            let statsText = `📊 *Session Statistics*\n\n`;
            statsText += `*Current Session:*\n`;
            statsText += `- Status: ${session?.status || 'N/A'}\n`;
            statsText += `- Created: ${session?.createdAt?.toLocaleString() || 'N/A'}\n`;
            statsText += `- Last Updated: ${session?.updatedAt?.toLocaleString() || 'N/A'}\n`;
            statsText += `- Last Connected: ${session?.metadata?.lastConnected?.toLocaleString() || 'N/A'}\n\n`;
            statsText += `*All Sessions:*\n`;
            
            stats.forEach(s => {
                statsText += `- ${s._id}: ${s.count} session(s)\n`;
            });

            await sock.sendMessage(msg.key.remoteJid, { text: statsText });
        }
    });
}

// ==================== SESSION STORAGE HELPERS ====================
async function saveSessionToMongo(creds, keys) {
    if (!usingMongoDB) return;
    try {
        await Session.findOneAndUpdate(
            { sessionId: SESSION_ID },
            { 
                sessionId: SESSION_ID,
                creds: creds,
                keys: keys,
                status: 'active',
                metadata: {
                    botName: BOT_NAME,
                    ownerName: OWNER_NAME,
                    phoneNumber: creds.me?.id?.split(':')[0] || OWNER_NUMBER,
                    platform: 'WhatsApp',
                    lastConnected: new Date(),
                    deviceInfo: 'HDM BOT v1.0.0'
                }
            },
            { upsert: true, new: true }
        );
    } catch (error) {
        console.error('MongoDB save error:', error.message);
    }
}

async function loadSessionFromMongo() {
    if (!usingMongoDB) return null;
    try {
        const session = await Session.findActiveSession(SESSION_ID);
        if (session) {
            console.log('📦 Session loaded from MongoDB');
            console.log(`   Status: ${session.status}`);
            console.log(`   Last Connected: ${session.metadata.lastConnected?.toLocaleString()}`);
            return { creds: session.creds, keys: session.keys };
        }
    } catch (error) {
        console.error('MongoDB load error:', error.message);
    }
    return null;
}

async function deleteSessionFromMongo() {
    if (!usingMongoDB) return;
    try {
        const session = await Session.findOne({ sessionId: SESSION_ID });
        if (session) {
            await session.deactivate();
            console.log('📦 Session deactivated in MongoDB');
        }
    } catch (error) {
        console.error('MongoDB delete error:', error.message);
    }
}

// ==================== AUTH STATE MANAGEMENT ====================
async function getAuthState() {
    if (usingMongoDB) {
        const mongoSession = await loadSessionFromMongo();
        if (mongoSession) {
            return {
                state: {
                    creds: mongoSession.creds,
                    keys: {
                        get: (type, ids) => {
                            const data = {};
                            for (const id of ids) {
                                const key = `${type}-${id}`;
                                if (mongoSession.keys[key]) {
                                    data[id] = mongoSession.keys[key];
                                }
                            }
                            return data;
                        },
                        set: (data) => {
                            for (const key in data) {
                                mongoSession.keys[key] = data[key];
                            }
                        }
                    }
                },
                saveCreds: async () => {
                    await saveSessionToMongo(mongoSession.creds, mongoSession.keys);
                }
            };
        }
    }

    // Fallback to local files
    const sessionDir = path.join(__dirname, 'sessions', SESSION_ID);
    if (!fs.existsSync(sessionDir)) {
        fs.mkdirSync(sessionDir, { recursive: true });
    }
    return await useMultiFileAuthState(sessionDir);
}

// ==================== MESSAGE HANDLER ====================
async function handleMessage(msg) {
    try {
        const messageType = Object.keys(msg.message || {})[0];
        if (!messageType) return;

        const messageContent = msg.message[messageType];
        
        let text = '';
        if (messageType === 'conversation') {
            text = messageContent;
        } else if (messageType === 'extendedTextMessage') {
            text = messageContent.text;
        } else if (messageType === 'imageMessage') {
            text = messageContent.caption || '';
        } else if (messageType === 'videoMessage') {
            text = messageContent.caption || '';
        }

        if (!text || !text.startsWith(PREFIX)) return;

        const args = text.slice(PREFIX.length).trim().split(/ +/);
        const commandName = args.shift().toLowerCase();

        const sender = msg.key.fromMe ? '[SELF]' : '[USER]';
        console.log(`${sender} ${commandName} command`);

        if (commands.has(commandName)) {
            const command = commands.get(commandName);
            await command.execute(msg, args);
        } else if (msg.key.fromMe) {
            await sock.sendMessage(msg.key.remoteJid, { 
                text: `❌ Unknown: *${PREFIX}${commandName}*\nType ${PREFIX}help`
            });
        }
    } catch (error) {
        if (!error.message?.includes('Bad MAC') && !error.message?.includes('decrypt')) {
            console.error('Message error:', error.message);
        }
    }
}

// ==================== CONNECTION HANDLER ====================
async function connectToWhatsApp() {
    try {
        const { state, saveCreds } = await getAuthState();
        const { version } = await fetchLatestBaileysVersion();

        sock = makeWASocket({
            version,
            logger,
            printQRInTerminal: false,
            auth: {
                creds: state.creds,
                keys: makeCacheableSignalKeyStore(state.keys, logger)
            },
            browser: ['HDM BOT', 'Chrome', '1.0.0'],
            generateHighQualityLinkPreview: true,
            markOnlineOnConnect: true
        });

        sock.ev.on('creds.update', saveCreds);

        sock.ev.on('connection.update', async (update) => {
            const { connection, lastDisconnect, qr } = update;

            if (qr) {
                console.log('📱 QR code generated - Scan from web panel');
                qrScanned = false;
                connectionStatus = 'connecting';
                try {
                    qrCodeData = await qrcode.toDataURL(qr);
                } catch (err) {
                    console.error('QR error:', err.message);
                }
            }

            if (connection === 'open') {
                console.log('✅ Connected to WhatsApp!');
                qrScanned = true;
                qrCodeData = null;
                connectionStatus = 'connected';
                
                console.log(`🤖 ${BOT_NAME} | 👑 ${OWNER_NAME}`);
                console.log(`📌 Prefix: ${PREFIX} | 💾 ${usingMongoDB ? 'MongoDB' : 'Local'}\n`);

                if (OWNER_NUMBER) {
                    const ownerJid = `${OWNER_NUMBER}@s.whatsapp.net`;
                    setTimeout(() => {
                        sock.sendMessage(ownerJid, { 
                            text: `🚀 *${BOT_NAME}* is online!\n\n✅ Connected\n📌 Prefix: ${PREFIX}\n💾 Storage: ${usingMongoDB ? 'MongoDB' : 'Local'}\n\nType ${PREFIX}menu`
                        }).catch(() => {});
                    }, 3000);
                }
            }

            if (connection === 'close') {
                const statusCode = lastDisconnect?.error instanceof Boom 
                    ? lastDisconnect.error.output.statusCode 
                    : 0;

                connectionStatus = 'disconnected';
                console.log(`Connection closed [${statusCode}]`);

                if (statusCode === DisconnectReason.loggedOut) {
                    console.log('❌ Logged out');
                    // Deactivate session in MongoDB
                    if (usingMongoDB) {
                        await deleteSessionFromMongo();
                    }
                    sock = null;
                    qrCodeData = null;
                    qrScanned = false;
                } else {
                    console.log('🔄 Reconnecting in 5s...');
                    qrCodeData = null;
                    qrScanned = false;
                    setTimeout(() => {
                        if (sock) sock = null;
                        connectToWhatsApp();
                    }, 5000);
                }
            }
        });

        sock.ev.on('messages.upsert', async ({ messages }) => {
            try {
                const msg = messages[0];
                if (!msg.message) return;
                await handleMessage(msg);
            } catch (error) {
                if (!error.message?.includes('Bad MAC')) {
                    console.error('Message error:', error.message);
                }
            }
        });

        return sock;
    } catch (error) {
        console.error('Connection error:', error.message);
        connectionStatus = 'disconnected';
        return null;
    }
}

// ==================== INITIALIZE ====================
registerCommands();

// ==================== EXPORT FUNCTIONS ====================
module.exports = {
    connectToWhatsApp,
    getSock: () => sock,
    getQRCode: () => qrCodeData,
    getQRScanned: () => qrScanned,
    getConnectionStatus: () => connectionStatus,
    isUsingMongoDB: () => usingMongoDB,
    resetQR: () => {
        qrCodeData = null;
        qrScanned = false;
    },
    disconnect: async () => {
        if (sock) {
            try {
                await sock.logout();
            } catch (error) {
                console.error('Logout error:', error.message);
            }
            sock = null;
        }
        qrCodeData = null;
        qrScanned = false;
        connectionStatus = 'disconnected';
    },
    deleteSession: async () => {
        await module.exports.disconnect();
        const sessionDir = path.join(__dirname, 'sessions', SESSION_ID);
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
        }
        await deleteSessionFromMongo();
    }
};

if (require.main === module) {
    console.log('🤖 Starting HDM BOT...');
    connectToWhatsApp();
}