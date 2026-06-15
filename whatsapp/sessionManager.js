const fs = require('fs');
const path = require('path');
const qrcode = require('qrcode');
const mongoose = require('mongoose');
const Session = require('../models/session');
const {
    default: makeWASocket, useMultiFileAuthState, DisconnectReason,
    fetchLatestBaileysVersion, makeCacheableSignalKeyStore, Browsers
} = require('@whiskeysockets/baileys');
const pino = require('pino');
const { Boom } = require('@hapi/boom');

class SessionManager {
    constructor() {
        this.sessions = new Map();
        this.logger = pino({ level: 'silent' });
        this.defaultSessionId = process.env.SESSION_ID || 'HDM-BOT-SESSION';
        this.exportedQR = null;
    }

    async startDefaultSession() {
        const sessionDir = path.join(__dirname, '..', 'sessions', this.defaultSessionId);
        const credsFile = path.join(sessionDir, 'creds.json');

        if (fs.existsSync(credsFile)) {
            try {
                const creds = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
                if (creds && creds.me) {
                    console.log(`📁 [${this.defaultSessionId}] Local session found`);
                    await this.connect(this.defaultSessionId);
                    return;
                }
            } catch {}
        }

        const MONGODB_URI = process.env.MONGODB_URI;
        if (MONGODB_URI && MONGODB_URI !== '') {
            try {
                const existing = await Session.findOne({ sessionId: this.defaultSessionId, creds: { $exists: true, $ne: {} } });
                if (existing && existing.creds && Object.keys(existing.creds).length > 0) {
                    console.log(`📦 [${this.defaultSessionId}] MongoDB session found`);
                    const sd = path.join(__dirname, '..', 'sessions', this.defaultSessionId);
                    if (!fs.existsSync(sd)) fs.mkdirSync(sd, { recursive: true });
                    fs.writeFileSync(path.join(sd, 'creds.json'), JSON.stringify(existing.creds, null, 2));
                    if (existing.keys) {
                        for (const [key, value] of Object.entries(existing.keys)) {
                            fs.writeFileSync(path.join(sd, `${key}.json`), JSON.stringify(value, null, 2));
                        }
                    }
                    console.log(`   📁 Restored to local storage`);
                    await this.connect(this.defaultSessionId);
                    return;
                }
            } catch (err) { console.error('MongoDB check error:', err.message); }
        }

        console.log('📱 No session found. Visit /sessions to connect.');
    }

    async connect(sessionId) {
        if (this.sessions.has(sessionId)) {
            const existing = this.sessions.get(sessionId);
            if (existing.status === 'connected') { return { success: true, connected: true }; }
            if (existing.status === 'connecting') { return { success: true, message: 'Connecting...' }; }
            this.sessions.delete(sessionId);
        }

        console.log(`🔌 [${sessionId}] Connecting...`);
        const sessionData = { sock: null, qrCode: null, qrScanned: false, status: 'connecting' };
        this.sessions.set(sessionId, sessionData);

        try {
            const { state, saveCreds } = await this.getAuthState(sessionId);
            const { version } = await fetchLatestBaileysVersion();

            const sock = makeWASocket({
                version, logger: this.logger, printQRInTerminal: false,
                auth: { creds: state.creds, keys: makeCacheableSignalKeyStore(state.keys, this.logger) },
                browser: ['HDM BOT', 'Chrome', '1.0.0'],
                generateHighQualityLinkPreview: true, markOnlineOnConnect: true
            });

            sock.ev.on('creds.update', saveCreds);

            sock.ev.on('connection.update', async (update) => {
                const { connection, lastDisconnect, qr } = update;
                const current = this.sessions.get(sessionId);
                if (!current) return;

                if (qr) {
                    console.log(`📱 [${sessionId}] QR ready`);
                    try { current.qrCode = await qrcode.toDataURL(qr); current.qrScanned = false; current.status = 'connecting'; this._emitQRUpdate(sessionId, current.qrCode, false, false); } catch {}
                }

                if (connection === 'open') {
                    console.log(`✅ [${sessionId}] Connected!`);
                    current.qrCode = null; current.qrScanned = true; current.status = 'connected'; current.sock = sock;
                    const phoneNumber = sock.user?.id?.split(':')[0] || '';
                    if (phoneNumber) { console.log(`   📱 ${phoneNumber}`); await this._backupToMongoDB(sessionId, phoneNumber); }
                    this._emitQRUpdate(sessionId, null, true, true);
                    this._broadcastSessions();
                }

                if (connection === 'close') {
                    const statusCode = lastDisconnect?.error instanceof Boom ? lastDisconnect.error.output.statusCode : 0;
                    console.log(`[${sessionId}] Closed [${statusCode}]`);

                    // 440 = Session already active elsewhere - don't reconnect
                    if (statusCode === 440) {
                        current.status = 'connected';
                        return;
                    }

                    // Logged out
                    if (statusCode === DisconnectReason.loggedOut) {
                        console.log(`❌ [${sessionId}] Logged out`);
                        this.sessions.delete(sessionId);
                        this._emitQRUpdate(sessionId, null, false, false);
                        this._broadcastSessions();
                        try { await Session.findOneAndUpdate({ sessionId }, { status: 'inactive' }); } catch {}
                        return;
                    }

                    // Other disconnects - reconnect
                    if (this.sessions.has(sessionId)) {
                        current.status = 'disconnected'; current.qrCode = null; current.qrScanned = false;
                        this._emitQRUpdate(sessionId, null, false, false);
                        this._broadcastSessions();
                        setTimeout(() => {
                            if (this.sessions.has(sessionId) && this.sessions.get(sessionId).status === 'disconnected') {
                                console.log(`🔄 [${sessionId}] Reconnecting...`);
                                this.connect(sessionId);
                            }
                        }, 5000);
                    }
                }
            });

            sock.ev.on('messages.upsert', async ({ messages }) => {
                const msg = messages[0];
                if (!msg.message) return;
                const { handleMessage } = require('./handlers/message');
                await handleMessage(sock, msg, {
                    PREFIX: process.env.PREFIX || '.', BOT_NAME: process.env.BOT_NAME || 'HDM BOT',
                    OWNER_NAME: process.env.OWNER_NAME || 'Davix HDM',
                    OWNER_NUMBER: process.env.BOT_OWNER_NUMBER || process.env.OWNER_NUMBER,
                    SESSION_ID: sessionId, connectionStatus: this.sessions.get(sessionId)?.status || 'disconnected'
                });
            });

            sock.ev.on('group-participants.update', async (update) => {
                const st = require('./state');
                const { id: gid, participants, action } = update;
                if (action === 'add') {
                    const msg = st.getWelcome(gid);
                    if (msg) for (const p of participants) {
                        try { await sock.sendMessage(gid, { text: msg.replace(/@user/g, `@${p.split('@')[0]}`), mentions: [p] }); } catch {}
                    }
                }
                if (action === 'remove') {
                    const msg = st.getGoodbye(gid);
                    if (msg) for (const p of participants) {
                        try { await sock.sendMessage(gid, { text: msg.replace(/@user/g, `@${p.split('@')[0]}`) }); } catch {}
                    }
                }
            });

            await new Promise(r => setTimeout(r, 3000));
            const current = this.sessions.get(sessionId);
            return { success: true, qr: current?.qrCode || null, needQr: !current?.qrScanned };
        } catch (error) {
            console.error(`[${sessionId}] Error:`, error.message);
            this.sessions.delete(sessionId);
            throw error;
        }
    }

    async _backupToMongoDB(sessionId, phoneNumber) {
        const MONGODB_URI = process.env.MONGODB_URI;
        if (!MONGODB_URI || MONGODB_URI === '') return;
        try {
            const sessionDir = path.join(__dirname, '..', 'sessions', sessionId);
            const credsFile = path.join(sessionDir, 'creds.json');
            if (!fs.existsSync(credsFile)) return;
            const creds = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
            if (!creds || !creds.me) return;
            const keys = {};
            const files = fs.readdirSync(sessionDir);
            for (const file of files) {
                if (file.endsWith('.json') && file !== 'creds.json') {
                    try { keys[file.replace('.json', '')] = JSON.parse(fs.readFileSync(path.join(sessionDir, file), 'utf8')); } catch {}
                }
            }
            await Session.findOneAndUpdate({ sessionId }, { sessionId, creds, keys, status: 'active', 'metadata.lastConnected': new Date(), 'metadata.phoneNumber': phoneNumber || '', $setOnInsert: { 'metadata.botName': sessionId, 'metadata.platform': 'WhatsApp' } }, { upsert: true });
        } catch {}
    }

    setExportedQR(sessionId, qrString) { this.exportedQR = { sessionId, qrString, expiresAt: Date.now() + 60000 }; console.log(`📤 QR exported for ${sessionId}`); }
    getExportedQR() { if (this.exportedQR && Date.now() < this.exportedQR.expiresAt) return this.exportedQR; if (this.exportedQR) this.exportedQR = null; return null; }

    _emitQRUpdate(sessionId, qr, qrScanned, connected) {
        try { const { getIO } = require('../socket'); const io = getIO(); if (io) io.to(`session:${sessionId}`).emit('qr_update', { sessionId, qr, qrScanned, connected }); } catch {}
    }

    _broadcastSessions() {
        try {
            const { getIO } = require('../socket'); const io = getIO();
            if (io) {
                const sessions = [];
                for (const [id, data] of this.sessions) sessions.push({ sessionId: id, status: data.status, connected: data.status === 'connected', qrAvailable: !!data.qrCode, qrScanned: data.qrScanned });
                io.emit('session_status', { sessions });
            }
        } catch {}
    }

    async disconnect(sessionId) { const data = this.sessions.get(sessionId); if (data?.sock) { try { await data.sock.logout(); } catch {} } this.sessions.delete(sessionId); this._broadcastSessions(); }
    isConnected(sessionId) { return this.sessions.get(sessionId)?.status === 'connected'; }
    getQRCode(sessionId) { return this.sessions.get(sessionId)?.qrCode || null; }
    isQRScanned(sessionId) { return this.sessions.get(sessionId)?.qrScanned || false; }
    getSocket(sessionId) { return this.sessions.get(sessionId)?.sock || null; }
    getStatus(sessionId) { return this.sessions.get(sessionId)?.status || 'disconnected'; }

    async getAuthState(sessionId) {
        const sessionDir = path.join(__dirname, '..', 'sessions', sessionId);
        if (!fs.existsSync(sessionDir)) fs.mkdirSync(sessionDir, { recursive: true });
        return await useMultiFileAuthState(sessionDir);
    }
}

let instance = null;
function getSessionManager() { if (!instance) instance = new SessionManager(); return instance; }
module.exports = { SessionManager, getSessionManager };