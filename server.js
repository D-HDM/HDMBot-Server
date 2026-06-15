require('dotenv').config();
require('./scripts/dnsSet');

const express = require('express');
const http = require('http');
const cors = require('cors');
const path = require('path');
const fs = require('fs');
const client = require('./whatsapp/client');
const corsOptions = require('./config/cors');
const env = require('./config/env');
const logger = require('./utils/logger');
const { errorHandler, notFound } = require('./utils/errors');
const { initSocket } = require('./socket');

const app = express();
const PORT = env.PORT;
const BOT_NAME = env.BOT_NAME;
const OWNER_NAME = env.OWNER_NAME;
const SESSION_ID = env.SESSION_ID;

// ==================== MIDDLEWARE ====================
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const skip = ['/qr-status', '/status', '/socket.io'];
        const isSkip = skip.some(p => req.url.startsWith(p));
        if (!isSkip || res.statusCode >= 400) {
            logger.http(`${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
        }
    });
    next();
});

app.set('trust proxy', 1);

// ==================== API ROUTES ====================
app.use('/api/auth', require('./routes/auth'));
app.use('/api/settings', require('./routes/settings'));
app.use('/api/rules', require('./routes/rules'));
app.use('/api/chats', require('./routes/chats'));
app.use('/api/commands', require('./routes/commands'));
app.use('/api/contacts', require('./routes/contacts'));
app.use('/api/sessions', require('./routes/sessions'));
app.use('/api/dashboard', require('./routes/dashboard'));
app.use('/api/broadcast', require('./routes/broadcast'));

// ==================== QR EXPORT ====================
app.post('/api/qr/export', async (req, res) => {
    try {
        const { sessionId } = req.body;
        const { getSessionManager } = require('./whatsapp/sessionManager');
        const sessionManager = getSessionManager();
        const qr = sessionManager.getQRCode(sessionId);
        
        if (qr) {
            sessionManager.setExportedQR(sessionId, qr);
            res.json({ success: true, message: `QR exported for ${sessionId}`, url: '/qr' });
        } else {
            res.json({ success: false, error: 'No QR available. Connect the session first.' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/qr/exported', (req, res) => {
    try {
        const { getSessionManager } = require('./whatsapp/sessionManager');
        const sessionManager = getSessionManager();
        const exported = sessionManager.getExportedQR();
        
        if (exported) {
            res.json({ success: true, sessionId: exported.sessionId, qr: exported.qrString, expiresAt: exported.expiresAt });
        } else {
            res.json({ success: false, error: 'No QR exported yet. Export from Devices page.' });
        }
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== PUBLIC ROUTES ====================
app.get('/api/health', (req, res) => {
    res.json({ success: true, status: 'healthy', bot: client.getConnectionStatus(), uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get('/', (req, res) => {
    const { getCommands } = require('./whatsapp/commands');
    res.json({
        success: true, name: BOT_NAME, owner: OWNER_NAME, version: '2.0.0',
        status: client.getConnectionStatus(), storage: client.isUsingMongoDB() ? 'MongoDB' : 'Local',
        commands: getCommands().size, powered: 'HDM', frontend: env.FRONTEND_URL,
        endpoints: { api: '/api', health: '/health', sessions: '/sessions' }
    });
});

app.get('/api', (req, res) => {
    const { getCommands } = require('./whatsapp/commands');
    res.json({
        success: true,
        bot: { name: BOT_NAME, owner: OWNER_NAME, prefix: env.PREFIX, status: client.getConnectionStatus(), uptime: process.uptime(), commands: getCommands().size },
        server: { port: PORT, platform: process.platform, nodeVersion: process.version, environment: env.NODE_ENV, memory: { usage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100, unit: 'MB' }, timestamp: new Date().toISOString() }
    });
});

app.get('/health', (req, res) => {
    res.json({ success: true, status: 'healthy', bot: client.getConnectionStatus(), uptime: process.uptime(), timestamp: new Date().toISOString() });
});

app.get('/sessions', (req, res) => { res.sendFile(path.join(__dirname, 'public', 'index.html')); });
app.get('/scan', (req, res) => res.redirect('/sessions'));
app.get('/session', (req, res) => res.redirect('/sessions'));

app.get('/status', (req, res) => {
    res.json({ success: true, bot_name: BOT_NAME, owner: OWNER_NAME, connected: client.getConnectionStatus() === 'connected', status: client.getConnectionStatus(), prefix: env.PREFIX, storage: client.isUsingMongoDB() ? 'MongoDB' : 'Local', powered: 'HDM' });
});

app.post('/connect', async (req, res) => {
    try {
        const { getSessionManager } = require('./whatsapp/sessionManager');
        const sessionManager = getSessionManager();
        const sessionId = req.body.sessionId || SESSION_ID;
        if (sessionManager.isConnected(sessionId)) return res.json({ success: true, message: 'Already connected!' });
        const result = await sessionManager.connect(sessionId);
        res.json({ success: true, ...result });
    } catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.get('/qr', (req, res) => {
    const qr = client.getQRCode();
    if (qr) return res.json({ success: true, qr });
    if (client.getConnectionStatus() === 'connected') return res.json({ success: true, connected: true });
    res.json({ success: false, error: 'No QR available.', needConnection: true });
});

app.get('/qr-status', (req, res) => {
    res.json({ connected: client.getConnectionStatus() === 'connected', qr: client.getQRCode() || null, qrScanned: client.getQRScanned(), status: client.getConnectionStatus() });
});

app.post('/disconnect', async (req, res) => {
    try { await client.disconnect(); res.json({ success: true, message: 'Disconnected!' }); }
    catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

app.delete('/delete-session', async (req, res) => {
    try { await client.deleteSession(); res.json({ success: true, message: 'Session deleted!' }); }
    catch (error) { res.status(500).json({ success: false, error: error.message }); }
});

// ==================== STATIC ====================
app.use(express.static('public'));

// ==================== ERROR HANDLING ====================
app.use(notFound);
app.use(errorHandler);

// ==================== STARTUP ====================
async function startServer() {
    ['sessions', 'logs', 'temp', 'uploads', 'scripts'].forEach(dir => {
        const p = path.join(__dirname, dir);
        if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    });

    const httpServer = http.createServer(app);
    initSocket(httpServer);

    const server = httpServer.listen(PORT, () => {
        const W = 40;
        console.log('');
        console.log('╔' + '═'.repeat(W - 2) + '╗');
        console.log(center('HDM BOT Server', W));
        console.log('╠' + '═'.repeat(W - 2) + '╣');
        console.log(center(`🌐 Port: ${PORT}`, W));
        console.log(center(`🏷️  ${env.NODE_ENV.toUpperCase()}`, W));
        console.log(center(`👑 ${OWNER_NAME}`, W));
        console.log(center(`💾 ${client.isUsingMongoDB() ? 'MongoDB' : 'Local'} | 👥 Multi`, W));
        console.log(center(`🔌 Socket.IO`, W));
        console.log('╠' + '═'.repeat(W - 2) + '╣');
        console.log(center(`🏠 /         → JSON`, W));
        console.log(center(`📱 /sessions → Panel`, W));
        console.log(center(`🔌 /api      → API`, W));
        console.log(center(`❤️ /health   → Health`, W));
        console.log(center(`🌐 ${env.FRONTEND_URL || 'localhost:3000'}`, W));
        console.log('╠' + '═'.repeat(W - 2) + '╣');
        console.log(center(`⏰ ${new Date().toLocaleString()}`, W));
        console.log('╚' + '═'.repeat(W - 2) + '╝');
        console.log('');
        logger.info(`Server started on port ${PORT} [${env.NODE_ENV}]`);
    });

    if (env.AUTO_CONNECT_DEFAULT) await reconnectAllSessions();
    return server;
}

function center(text, width) {
    const clean = text.replace(/\x1b\[[0-9;]*m/g, '');
    const len = clean.length;
    const pad = Math.max(0, width - len - 2);
    const left = Math.floor(pad / 2);
    const right = pad - left;
    return '║' + ' '.repeat(left) + text + ' '.repeat(right) + '║';
}

async function reconnectAllSessions() {
    const { getSessionManager } = require('./whatsapp/sessionManager');
    const sessionManager = getSessionManager();
    const sessionsToReconnect = new Set();

    if (client.isUsingMongoDB()) {
        try {
            const Session = require('./models/session');
            const validSessions = await Session.find({ status: 'active', 'creds.me': { $exists: true } });
            for (const s of validSessions) {
                if (s.sessionId && s.creds && Object.keys(s.creds).length > 0) {
                    sessionsToReconnect.add(s.sessionId);
                    logger.info(`Session found in MongoDB: ${s.sessionId}`);
                }
            }
        } catch {}
    }

    const sessionsDir = path.join(__dirname, 'sessions');
    if (fs.existsSync(sessionsDir)) {
        const dirs = fs.readdirSync(sessionsDir).filter(f => {
            const fp = path.join(sessionsDir, f);
            return fs.statSync(fp).isDirectory() && f !== '.gitkeep';
        });
        for (const dir of dirs) {
            const credsFile = path.join(sessionsDir, dir, 'creds.json');
            if (fs.existsSync(credsFile)) {
                try {
                    const creds = JSON.parse(fs.readFileSync(credsFile, 'utf8'));
                    if (creds?.me) { sessionsToReconnect.add(dir); logger.info(`Session found locally: ${dir}`); }
                } catch {}
            }
        }
    }

    sessionsToReconnect.add(SESSION_ID);

    if (sessionsToReconnect.size === 0) { logger.info('No valid sessions found. Visit /sessions'); return; }

    logger.info(`Auto-reconnecting ${sessionsToReconnect.size} session(s)...`);
    for (const sessionId of sessionsToReconnect) {
        try {
            const result = await sessionManager.connect(sessionId);
            if (result.connected) logger.info(`✅ [${sessionId}] Reconnected`);
            else if (result.qr) logger.info(`📱 [${sessionId}] QR needed`);
            await new Promise(r => setTimeout(r, 2000));
        } catch (err) { logger.error(`[${sessionId}] ${err.message}`); }
    }
}

let server = null;
async function shutdown(signal) {
    logger.warn(`Received ${signal} - Shutting down...`);
    if (server) await new Promise(r => server.close(r));
    const { getSessionManager } = require('./whatsapp/sessionManager');
    for (const [id] of getSessionManager().sessions) await getSessionManager().disconnect(id).catch(() => {});
    if (client.isUsingMongoDB()) await require('mongoose').disconnect();
    logger.info('Shutdown complete');
    process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGHUP', () => shutdown('SIGHUP'));

process.on('uncaughtException', (error) => { logger.error('Uncaught:', error.message); if (env.isProd) process.exit(1); });
process.on('unhandledRejection', (reason) => { logger.error('Rejection:', reason?.message || reason); if (env.isProd) process.exit(1); });

startServer().then(s => { server = s; });