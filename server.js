require('dotenv').config();

// ==================== DNS SETUP (MUST BE FIRST) ====================
require('./scripts/dnsSet');

const express = require('express');
const path = require('path');
const fs = require('fs');
const client = require('./whatsapp/client');
const sessionRoutes = require('./routes/sessions');

const app = express();
const PORT = process.env.PORT || 5000;
const BOT_NAME = process.env.BOT_NAME || 'HDM BOT';
const OWNER_NAME = process.env.OWNER_NAME || 'Davix HDM';
const SESSION_ID = process.env.SESSION_ID || 'HDM-BOT-SESSION';

// ==================== MIDDLEWARE ====================
app.use(express.json());

// Request logging
app.use((req, res, next) => {
    const start = Date.now();
    res.on('finish', () => {
        const duration = Date.now() - start;
        const skip = ['/qr-status', '/status'];
        const isSkip = skip.some(p => req.url === p || (req.url.startsWith('/api/sessions/') && req.url.endsWith('/status')));
        
        if (!isSkip || res.statusCode >= 400) {
            console.log(`${new Date().toISOString()} ${req.method} ${req.url} ${res.statusCode} ${duration}ms`);
        }
    });
    next();
});

// ==================== API ROUTES (BEFORE STATIC) ====================

// Session management API
app.use('/api/sessions', sessionRoutes);

// ========== HOME - JSON ==========
app.get('/', (req, res) => {
    const { getCommands } = require('./whatsapp/commands');
    res.json({
        success: true,
        name: BOT_NAME,
        owner: OWNER_NAME,
        version: '2.0.0',
        defaultSession: SESSION_ID,
        status: client.getConnectionStatus(),
        storage: client.isUsingMongoDB() ? 'MongoDB' : 'Local',
        powered: 'HDM',
        commands: getCommands().size,
        uptime: process.uptime(),
        endpoints: {
            home: '/',
            api: '/api',
            health: '/health',
            sessions: '/sessions',
            sessionsApi: '/api/sessions'
        }
    });
});

// ========== API - JSON ==========
app.get('/api', (req, res) => {
    const { getCommands } = require('./whatsapp/commands');
    res.json({
        success: true,
        bot: {
            name: BOT_NAME,
            owner: OWNER_NAME,
            prefix: process.env.PREFIX || '.',
            status: client.getConnectionStatus(),
            storage: client.isUsingMongoDB() ? 'MongoDB' : 'Local',
            uptime: process.uptime(),
            commands: getCommands().size,
            defaultSession: SESSION_ID
        },
        server: {
            port: PORT,
            platform: process.platform,
            nodeVersion: process.version,
            memory: {
                usage: Math.round(process.memoryUsage().heapUsed / 1024 / 1024 * 100) / 100,
                unit: 'MB'
            },
            timestamp: new Date().toISOString()
        }
    });
});

// ========== HEALTH - JSON ==========
app.get('/health', (req, res) => {
    res.status(200).json({
        success: true,
        status: 'healthy',
        bot: client.getConnectionStatus(),
        uptime: process.uptime(),
        timestamp: new Date().toISOString()
    });
});

// ========== SESSIONS PANEL - HTML ==========
app.get('/sessions', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ========== SCAN - REDIRECT ==========
app.get('/scan', (req, res) => {
    res.redirect('/sessions');
});

// ========== STATUS - JSON ==========
app.get('/status', (req, res) => {
    res.json({
        success: true,
        bot_name: BOT_NAME,
        owner: OWNER_NAME,
        connected: client.getConnectionStatus() === 'connected',
        status: client.getConnectionStatus(),
        prefix: process.env.PREFIX || '.',
        storage: client.isUsingMongoDB() ? 'MongoDB' : 'Local',
        powered: 'HDM'
    });
});

// ========== CONNECT ==========
app.post('/connect', async (req, res) => {
    try {
        const { getSessionManager } = require('./whatsapp/sessionManager');
        const sessionManager = getSessionManager();
        const sessionId = req.body.sessionId || SESSION_ID;

        if (sessionManager.isConnected(sessionId)) {
            return res.json({ success: true, message: 'Already connected!' });
        }

        const result = await sessionManager.connect(sessionId);
        res.json({ success: true, ...result });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== QR ==========
app.get('/qr', (req, res) => {
    const qr = client.getQRCode();
    if (qr) return res.json({ success: true, qr });
    if (client.getConnectionStatus() === 'connected') return res.json({ success: true, connected: true });
    res.json({ success: false, error: 'No QR available.', needConnection: true });
});

// ========== QR STATUS ==========
app.get('/qr-status', (req, res) => {
    res.json({
        connected: client.getConnectionStatus() === 'connected',
        qr: client.getQRCode() || null,
        qrScanned: client.getQRScanned(),
        status: client.getConnectionStatus()
    });
});

// ========== DISCONNECT ==========
app.post('/disconnect', async (req, res) => {
    try {
        await client.disconnect();
        res.json({ success: true, message: 'Disconnected!' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ========== DELETE SESSION ==========
app.delete('/delete-session', async (req, res) => {
    try {
        await client.deleteSession();
        res.json({ success: true, message: 'Session deleted!' });
    } catch (error) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// ==================== STATIC FILES (AFTER ALL ROUTES) ====================
app.use(express.static('public'));

// ========== 404 - JSON ==========
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found',
        path: req.url,
        powered: 'HDM'
    });
});

// ==================== STARTUP ====================
async function startServer() {
    ['sessions', 'logs', 'temp', 'uploads', 'scripts'].forEach(dir => {
        const p = path.join(__dirname, dir);
        if (!fs.existsSync(p)) fs.mkdirSync(p, { recursive: true });
    });

    const server = app.listen(PORT, () => {
        console.log('');
        console.log('╔══════════════════════════════════════╗');
        console.log('║         HDM BOT Server               ║');
        console.log('╠══════════════════════════════════════╣');
        console.log(`║  🌐 Port: ${PORT}                       ║`);
        console.log(`║  👑 Owner: ${OWNER_NAME}              ║`);
        console.log(`║  💾 ${client.isUsingMongoDB() ? 'MongoDB' : 'Local'} | 👥 Multi-Session      ║`);
        console.log('╠══════════════════════════════════════╣');
        console.log(`║  🏠 /         → JSON                 ║`);
        console.log(`║  📱 /sessions → Panel                ║`);
        console.log(`║  🔌 /api      → Info                 ║`);
        console.log(`║  ❤️ /health   → Health               ║`);
        console.log('╠══════════════════════════════════════╣');
        console.log(`║  ⏰ ${new Date().toLocaleString()}     ║`);
        console.log('╚══════════════════════════════════════╝');
        console.log('');
    });

    try {
        await client.startDefaultSession();
    } catch (err) {
        console.error('Session start error:', err.message);
    }

    return server;
}

// ==================== SHUTDOWN ====================
let server = null;

async function shutdown(signal) {
    console.log(`\n🛑 ${signal} - Shutting down...`);
    if (server) await new Promise(r => server.close(r));
    const { getSessionManager } = require('./whatsapp/sessionManager');
    for (const [id] of getSessionManager().sessions) {
        await getSessionManager().disconnect(id).catch(() => {});
    }
    if (client.isUsingMongoDB()) {
        await require('mongoose').disconnect();
    }
    console.log('✅ Done');
    process.exit(0);
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));

startServer().then(s => { server = s; });