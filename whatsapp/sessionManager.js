const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const mongoose = require('mongoose');
const Session = require('../models/session');
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

// ==================== SESSION MANAGER ====================

class SessionManager {
    constructor() {
        this.sessions = new Map();
        this.logger = pino({ level: 'silent' });
        this.defaultSessionId = process.env.SESSION_ID || 'HDM-BOT-SESSION';
    }

    async startDefaultSession() {
        const MONGODB_URI = process.env.MONGODB_URI;

        if (MONGODB_URI && MONGODB_URI !== '') {
            try {
                const existing = await Session.findOne({ 
                    sessionId: this.defaultSessionId,
                    creds: { $exists: true, $ne: {} }
                });
                
                if (existing) {
                    console.log(`📱 Default session [${this.defaultSessionId}] found`);
                    await this.connect(this.defaultSessionId);
                } else {
                    console.log('📱 No default session. Visit /scan to connect.');
                }
            } catch (err) {
                console.error('Default session check error:', err.message);
            }
        }
    }

    async connect(sessionId) {
        // Prevent duplicate connections
        if (this.sessions.has(sessionId)) {
            const existing = this.sessions.get(sessionId);
            if (existing.status === 'connected') {
                console.log(`[${sessionId}] Already connected`);
                return { success: true, connected: true };
            }
            if (existing.status === 'connecting') {
                console.log(`[${sessionId}] Already connecting`);
                return { success: true, message: 'Connecting...' };
            }
            // Remove stale
            this.sessions.delete(sessionId);
        }

        console.log(`🔌 [${sessionId}] Connecting...`);

        const sessionData = {
            sock: null,
            qrCode: null,
            qrScanned: false,
            status: 'connecting'
        };
        this.sessions.set(sessionId, sessionData);

        try {
            const { state, saveCreds } = await this.getAuthState(sessionId);
            const { version } = await fetchLatestBaileysVersion();

            const sock = makeWASocket({
                version,
                logger: this.logger,
                printQRInTerminal: false,
                auth: {
                    creds: state.creds,
                    keys: makeCacheableSignalKeyStore(state.keys, this.logger)
                },
                browser: ['HDM BOT', 'Chrome', '1.0.0'],
                generateHighQualityLinkPreview: true,
                markOnlineOnConnect: true
            });

            sock.ev.on('creds.update', saveCreds);

            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;
                const current = this.sessions.get(sessionId);
                if (!current) return;

                if (qr) {
                    console.log(`📱 [${sessionId}] QR ready`);
                    try {
                        current.qrCode = await qrcode.toDataURL(qr);
                        current.qrScanned = false;
                        current.status = 'connecting';
                    } catch {}
                }

                if (connection === 'open') {
                    console.log(`✅ [${sessionId}] Connected!`);
                    current.qrCode = null;
                    current.qrScanned = true;
                    current.status = 'connected';
                    current.sock = sock;

                    // Update phone in MongoDB
                    const phoneNumber = sock.user?.id?.split(':')[0] || '';
                    if (phoneNumber) {
                        console.log(`   📱 ${phoneNumber}`);
                        try {
                            await Session.findOneAndUpdate(
                                { sessionId },
                                {
                                    status: 'active',
                                    'metadata.lastConnected': new Date(),
                                    'metadata.phoneNumber': phoneNumber,
                                    'metadata.platform': 'WhatsApp'
                                },
                                { upsert: true }
                            );
                        } catch {}
                    }
                }

                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error instanceof Boom
                        ? lastDisconnect.error.output.statusCode
                        : 0;

                    console.log(`[${sessionId}] Closed [${statusCode}]`);

                    if (statusCode === DisconnectReason.loggedOut) {
                        console.log(`❌ [${sessionId}] Logged out`);
                        this.sessions.delete(sessionId);
                        try {
                            await Session.findOneAndUpdate(
                                { sessionId },
                                { status: 'inactive' }
                            );
                        } catch {}
                    } else if (this.sessions.has(sessionId)) {
                        current.status = 'disconnected';
                        current.qrCode = null;
                        current.qrScanned = false;
                        // Auto-reconnect after 5s
                        setTimeout(() => {
                            if (this.sessions.has(sessionId) && 
                                this.sessions.get(sessionId).status === 'disconnected') {
                                console.log(`🔄 [${sessionId}] Reconnecting...`);
                                this.connect(sessionId);
                            }
                        }, 5000);
                    }
                }
            });

            // Messages
            sock.ev.on('messages.upsert', async ({ messages }) => {
                const msg = messages[0];
                if (!msg.message) return;

                const { handleMessage } = require('./handlers/message');
                await handleMessage(sock, msg, {
                    PREFIX: process.env.PREFIX || '.',
                    BOT_NAME: process.env.BOT_NAME || 'HDM BOT',
                    OWNER_NAME: process.env.OWNER_NAME || 'Davix HDM',
                    OWNER_NUMBER: process.env.BOT_OWNER_NUMBER || process.env.OWNER_NUMBER,
                    SESSION_ID: sessionId,
                    connectionStatus: this.sessions.get(sessionId)?.status || 'disconnected'
                });
            });

            // Group events
            sock.ev.on('group-participants.update', async (update) => {
                const state = require('./state');
                const { id: groupJid, participants, action } = update;

                if (action === 'add') {
                    const welcomeMsg = state.getWelcome(groupJid);
                    if (welcomeMsg) {
                        for (const participant of participants) {
                            try {
                                await sock.sendMessage(groupJid, {
                                    text: welcomeMsg.replace(/@user/g, `@${participant.split('@')[0]}`),
                                    mentions: [participant]
                                });
                            } catch {}
                        }
                    }
                }
                if (action === 'remove') {
                    const goodbyeMsg = state.getGoodbye(groupJid);
                    if (goodbyeMsg) {
                        for (const participant of participants) {
                            try {
                                await sock.sendMessage(groupJid, {
                                    text: goodbyeMsg.replace(/@user/g, `@${participant.split('@')[0]}`)
                                });
                            } catch {}
                        }
                    }
                }
            });

            // Wait for QR or connection
            await new Promise(r => setTimeout(r, 3000));

            const current = this.sessions.get(sessionId);
            return {
                success: true,
                qr: current?.qrCode || null,
                needQr: !current?.qrScanned
            };

        } catch (error) {
            console.error(`[${sessionId}] Error:`, error.message);
            this.sessions.delete(sessionId);
            throw error;
        }
    }

    async disconnect(sessionId) {
        const data = this.sessions.get(sessionId);
        if (data?.sock) {
            try { await data.sock.logout(); } catch {}
        }
        this.sessions.delete(sessionId);
        console.log(`🔌 [${sessionId}] Disconnected`);
    }

    isConnected(sessionId) {
        return this.sessions.get(sessionId)?.status === 'connected';
    }

    getQRCode(sessionId) {
        return this.sessions.get(sessionId)?.qrCode || null;
    }

    isQRScanned(sessionId) {
        return this.sessions.get(sessionId)?.qrScanned || false;
    }

    getSocket(sessionId) {
        return this.sessions.get(sessionId)?.sock || null;
    }

    getStatus(sessionId) {
        return this.sessions.get(sessionId)?.status || 'disconnected';
    }

    async getAuthState(sessionId) {
        const MONGODB_URI = process.env.MONGODB_URI;

        if (MONGODB_URI && MONGODB_URI !== '') {
            try {
                const session = await Session.findOne({ 
                    sessionId,
                    creds: { $exists: true, $ne: {} }
                });
                
                if (session) {
                    console.log(`📦 [${sessionId}] MongoDB session loaded`);
                    return {
                        state: {
                            creds: session.creds,
                            keys: {
                                get: (type, ids) => {
                                    const data = {};
                                    for (const id of ids) {
                                        const key = `${type}-${id}`;
                                        if (session.keys?.[key]) data[id] = session.keys[key];
                                    }
                                    return data;
                                },
                                set: (data) => {
                                    for (const key in data) {
                                        if (!session.keys) session.keys = {};
                                        session.keys[key] = data[key];
                                    }
                                }
                            }
                        },
                        saveCreds: async () => {
                            await Session.findOneAndUpdate(
                                { sessionId },
                                {
                                    creds: session.creds,
                                    keys: session.keys,
                                    status: 'active',
                                    updatedAt: new Date()
                                },
                                { upsert: true }
                            );
                        }
                    };
                }
            } catch (err) {
                console.error(`[${sessionId}] MongoDB error:`, err.message);
            }
        }

        // Local fallback
        const sessionDir = path.join(__dirname, '..', 'sessions', sessionId);
        if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
        console.log(`📁 [${sessionId}] Local storage`);
        return await useMultiFileAuthState(sessionDir);
    }
}

let instance = null;

function getSessionManager() {
    if (!instance) instance = new SessionManager();
    return instance;
}

module.exports = { SessionManager, getSessionManager };