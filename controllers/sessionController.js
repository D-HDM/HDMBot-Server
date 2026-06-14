const fs = require('fs');
const path = require('path');
const Session = require('../models/session');
const { getSessionManager } = require('../whatsapp/sessionManager');

// ==================== SESSION CONTROLLER ====================

const sessionController = {

    // ========== LIST ALL SESSIONS ==========
    list: async (req, res) => {
        try {
            // Clean empty sessions first
            await Session.deleteMany({ 
                $or: [
                    { sessionId: '' }, 
                    { sessionId: null }, 
                    { sessionId: { $exists: false } } 
                ] 
            });

            const sessions = await Session.find({}).select('-creds -keys').sort({ updatedAt: -1 });
            const sessionManager = getSessionManager();

            // Deduplicate
            const seen = new Set();
            const uniqueSessions = [];
            
            for (const s of sessions) {
                if (!s.sessionId || seen.has(s.sessionId)) continue;
                seen.add(s.sessionId);
                uniqueSessions.push(s);
            }

            const sessionList = uniqueSessions.map(s => {
                const isConnected = sessionManager.isConnected(s.sessionId);
                
                // Get phone from connected socket if missing
                let phone = s.metadata?.phoneNumber;
                if (!phone || phone === 'N/A') {
                    const sock = sessionManager.getSocket(s.sessionId);
                    if (sock?.user?.id) {
                        phone = sock.user.id.split(':')[0];
                    }
                }

                return {
                    id: s.sessionId,
                    status: isConnected ? 'connected' : (s.status || 'inactive'),
                    botName: s.metadata?.botName || s.sessionId,
                    phoneNumber: phone || 'N/A',
                    ownerName: s.metadata?.ownerName || 'N/A',
                    platform: s.metadata?.platform || 'WhatsApp',
                    lastConnected: s.metadata?.lastConnected || s.updatedAt,
                    createdAt: s.createdAt,
                    updatedAt: s.updatedAt
                };
            });

            res.json({
                success: true,
                count: sessionList.length,
                sessions: sessionList
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== GET SINGLE SESSION ==========
    get: async (req, res) => {
        try {
            const { id } = req.params;
            const session = await Session.findOne({ sessionId: id }).select('-creds -keys');

            if (!session) {
                return res.status(404).json({ success: false, error: 'Session not found' });
            }

            const sessionManager = getSessionManager();
            const isConnected = sessionManager.isConnected(id);
            const sock = sessionManager.getSocket(id);
            const phone = sock?.user?.id?.split(':')[0] || session.metadata?.phoneNumber || 'N/A';

            res.json({
                success: true,
                session: {
                    id: session.sessionId,
                    status: isConnected ? 'connected' : (session.status || 'inactive'),
                    botName: session.metadata?.botName || session.sessionId,
                    phoneNumber: phone,
                    ownerName: session.metadata?.ownerName || 'N/A',
                    platform: session.metadata?.platform || 'WhatsApp',
                    deviceInfo: session.metadata?.deviceInfo || '',
                    lastConnected: session.metadata?.lastConnected || session.updatedAt,
                    createdAt: session.createdAt,
                    updatedAt: session.updatedAt
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== CREATE SESSION ==========
    create: async (req, res) => {
        try {
            const { sessionId, botName, ownerNumber, ownerName } = req.body;

            if (!sessionId || !sessionId.trim()) {
                return res.status(400).json({ success: false, error: 'sessionId is required' });
            }

            const cleanId = sessionId.trim().replace(/[^a-zA-Z0-9_-]/g, '');

            if (!cleanId) {
                return res.status(400).json({ success: false, error: 'Invalid session ID. Use letters, numbers, hyphens, underscores.' });
            }

            // Check max
            const maxSessions = parseInt(process.env.MAX_SESSIONS) || 5;
            const count = await Session.countDocuments({ sessionId: { $ne: '', $exists: true } });
            if (count >= maxSessions) {
                return res.status(400).json({ success: false, error: `Max ${maxSessions} sessions. Delete one first.` });
            }

            // Check duplicate
            const existing = await Session.findOne({ sessionId: cleanId });
            if (existing) {
                return res.status(409).json({ success: false, error: `Session "${cleanId}" already exists` });
            }

            const session = new Session({
                sessionId: cleanId,
                creds: {},
                keys: {},
                status: 'inactive',
                metadata: {
                    botName: botName || cleanId,
                    ownerName: ownerName || process.env.OWNER_NAME || 'Unknown',
                    phoneNumber: ownerNumber || '',
                    platform: 'WhatsApp',
                    deviceInfo: 'HDM BOT v2.0.0'
                }
            });

            await session.save();

            // Create local dir
            const sessionDir = path.join(__dirname, '..', 'sessions', cleanId);
            if (!fs.existsSync(sessionDir)) {
                fs.mkdirSync(sessionDir, { recursive: true });
            }

            console.log(`✅ Session created: ${cleanId}`);

            res.status(201).json({
                success: true,
                message: `Session "${cleanId}" created`,
                session: {
                    id: session.sessionId,
                    status: session.status,
                    botName: session.metadata.botName
                }
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== DELETE SESSION ==========
    delete: async (req, res) => {
        try {
            const { id } = req.params;

            const sessionManager = getSessionManager();
            if (sessionManager.isConnected(id)) {
                await sessionManager.disconnect(id);
            }

            const result = await Session.deleteOne({ sessionId: id });

            if (result.deletedCount === 0) {
                return res.status(404).json({ success: false, error: 'Session not found' });
            }

            // Delete local files
            const sessionDir = path.join(__dirname, '..', 'sessions', id);
            if (fs.existsSync(sessionDir)) {
                fs.rmSync(sessionDir, { recursive: true, force: true });
            }

            console.log(`🗑️ Session deleted: ${id}`);

            res.json({ success: true, message: `Session "${id}" deleted` });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== CONNECT ==========
    connect: async (req, res) => {
        try {
            const { id } = req.params;
            const sessionManager = getSessionManager();

            const session = await Session.findOne({ sessionId: id });
            if (!session) {
                return res.status(404).json({ success: false, error: 'Session not found. Create it first.' });
            }

            if (sessionManager.isConnected(id)) {
                return res.json({ success: true, message: 'Already connected', connected: true });
            }

            console.log(`🔌 Connecting: ${id}`);
            const result = await sessionManager.connect(id);

            res.json({
                success: true,
                message: result.qr ? 'QR ready' : 'Connecting...',
                qr: result.qr || null,
                needQr: result.needQr !== false
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== DISCONNECT ==========
    disconnect: async (req, res) => {
        try {
            const { id } = req.params;
            const sessionManager = getSessionManager();

            if (!sessionManager.isConnected(id)) {
                return res.json({ success: true, message: 'Not connected' });
            }

            await sessionManager.disconnect(id);
            console.log(`🔌 Disconnected: ${id}`);

            res.json({ success: true, message: `Disconnected` });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== GET QR ==========
    getQR: async (req, res) => {
        try {
            const { id } = req.params;
            const sessionManager = getSessionManager();

            if (sessionManager.isConnected(id)) {
                return res.json({ success: true, connected: true, message: 'Already connected' });
            }

            const qr = sessionManager.getQRCode(id);

            if (qr) {
                res.json({ success: true, qr });
            } else {
                res.json({ success: false, error: 'No QR. Click Connect first.', needConnection: true });
            }
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    },

    // ========== GET STATUS ==========
    getStatus: async (req, res) => {
        try {
            const { id } = req.params;
            const sessionManager = getSessionManager();

            res.json({
                success: true,
                sessionId: id,
                connected: sessionManager.isConnected(id),
                status: sessionManager.getStatus(id),
                qr: sessionManager.getQRCode(id) || null,
                qrScanned: sessionManager.isQRScanned(id)
            });
        } catch (error) {
            res.status(500).json({ success: false, error: error.message });
        }
    }
};

module.exports = sessionController;