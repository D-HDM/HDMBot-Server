require('dotenv').config();
const express = require('express');
const path = require('path');
const fs = require('fs');
const client = require('./client');

const app = express();
const PORT = process.env.PORT || 5000;
const BOT_NAME = process.env.BOT_NAME || 'HDM BOT';
const OWNER_NAME = process.env.OWNER_NAME || 'Davix HDM';
const SESSION_ID = process.env.SESSION_ID || 'HDM-BOT-SESSION';
const MONGODB_URI = process.env.MONGODB_URI;

// ==================== MIDDLEWARE ====================
app.use(express.json());
app.use(express.static('public'));

app.use((req, res, next) => {
    console.log(`${new Date().toISOString()} - ${req.method} ${req.url}`);
    next();
});

// ==================== API ROUTES ====================

// Session manager page
app.get('/scan', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Home route
app.get('/', (req, res) => {
    res.json({
        success: true,
        bot: BOT_NAME,
        owner: OWNER_NAME,
        status: client.getConnectionStatus(),
        sessionManager: '/scan',
        storage: MONGODB_URI ? 'MongoDB' : 'Local',
        powered: 'HDM',
        endpoints: {
            scan: '/scan',
            status: '/status',
            connect: '/connect',
            qr: '/qr',
            'qr-status': '/qr-status',
            disconnect: '/disconnect',
            'delete-session': '/delete-session'
        }
    });
});

// Status endpoint
app.get('/status', (req, res) => {
    const sessionDir = path.join(__dirname, 'sessions', SESSION_ID);
    const sessionExists = (fs.existsSync(sessionDir) && fs.readdirSync(sessionDir).length > 0) || 
                          (MONGODB_URI && client.getConnectionStatus() !== 'disconnected');
    const connected = client.getConnectionStatus() === 'connected';
    
    res.json({
        success: true,
        bot_name: BOT_NAME,
        owner: OWNER_NAME,
        connected: connected,
        sessionExists: sessionExists || connected,
        status: client.getConnectionStatus(),
        prefix: process.env.PREFIX || '.',
        uptime: process.uptime(),
        storage: MONGODB_URI ? 'MongoDB' : 'Local',
        powered: 'HDM'
    });
});

// Initiate connection
app.post('/connect', async (req, res) => {
    try {
        const status = client.getConnectionStatus();
        
        if (status === 'connected') {
            return res.json({
                success: true,
                message: 'Already connected to WhatsApp!'
            });
        }

        if (status === 'connecting') {
            return res.json({
                success: true,
                message: 'Connection in progress. QR code will appear shortly.'
            });
        }

        client.resetQR();
        console.log('🔌 Initiating WhatsApp connection...');
        
        // Start connection
        client.connectToWhatsApp().catch(err => {
            console.error('Connection error:', err.message);
        });
        
        res.json({
            success: true,
            message: 'Connection initiated! QR code will appear in a few seconds.'
        });
    } catch (error) {
        console.error('Connect error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Get QR code
app.get('/qr', (req, res) => {
    const qrCode = client.getQRCode();
    const connected = client.getConnectionStatus() === 'connected';
    
    if (qrCode) {
        res.json({
            success: true,
            qr: qrCode
        });
    } else if (connected) {
        res.json({
            success: true,
            connected: true,
            message: 'Already connected to WhatsApp!'
        });
    } else {
        res.json({
            success: false,
            error: 'No QR code available. Click Connect first.',
            needConnection: true
        });
    }
});

// QR Status polling
app.get('/qr-status', (req, res) => {
    const status = client.getConnectionStatus();
    const qrCode = client.getQRCode();
    const scanned = client.getQRScanned();
    
    res.json({
        connected: status === 'connected',
        qr: qrCode || null,
        qrScanned: scanned,
        status: status
    });
});

// Disconnect
app.post('/disconnect', async (req, res) => {
    try {
        console.log('🔌 Disconnecting WhatsApp...');
        await client.disconnect();
        
        res.json({
            success: true,
            message: 'Disconnected successfully! Session preserved.'
        });
    } catch (error) {
        console.error('Disconnect error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// Delete session (both local and MongoDB)
app.delete('/delete-session', async (req, res) => {
    try {
        console.log('🗑️ Deleting session...');
        
        // Disconnect first
        await client.disconnect();
        
        // Delete local session files
        const sessionDir = path.join(__dirname, 'sessions', SESSION_ID);
        if (fs.existsSync(sessionDir)) {
            fs.rmSync(sessionDir, { recursive: true, force: true });
        }
        
        // Delete MongoDB session if exists
        if (MONGODB_URI) {
            const mongoose = require('mongoose');
            if (mongoose.connection.readyState === 1) {
                const collections = await mongoose.connection.db.listCollections().toArray();
                const sessionCollection = collections.find(c => c.name === 'sessions');
                if (sessionCollection) {
                    await mongoose.connection.db.collection('sessions').deleteOne({ 
                        sessionId: SESSION_ID 
                    });
                }
            }
        }
        
        res.json({
            success: true,
            message: 'Session deleted successfully! Scan QR to reconnect.'
        });
    } catch (error) {
        console.error('Delete error:', error);
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
});

// ==================== START SERVER ====================
async function startServer() {
    app.listen(PORT, () => {
        console.log(`
╔══════════════════════════════════╗
║      ${BOT_NAME} Server        ║
╠══════════════════════════════════╣
║ 🌐 Port: ${PORT}                   ║
║ 👑 Owner: ${OWNER_NAME}        ║
║ 💾 Storage: ${MONGODB_URI ? 'MongoDB' : 'Local'}   ║
║ ⚡ Powered by HDM              ║
║ 📱 Panel: http://localhost:${PORT}/scan
║ ⏰ ${new Date().toLocaleString()}
╚══════════════════════════════╝
        `);
    });

    // Auto-connect if session exists
    const sessionDir = path.join(__dirname, 'sessions', SESSION_ID);
    const sessionExists = fs.existsSync(sessionDir) && fs.readdirSync(sessionDir).length > 0;
    
    if (sessionExists || MONGODB_URI) {
        console.log('📱 Checking for existing session...');
        if (MONGODB_URI) {
            console.log('📦 MongoDB session storage enabled');
        }
        console.log('🔄 Attempting auto-connect...\n');
        
        client.connectToWhatsApp().then(() => {
            // Connection status will be handled by the client
        }).catch(err => {
            console.error('Auto-connect error:', err.message);
        });
    } else {
        console.log('📱 No session found.');
        console.log(`🌐 Visit http://localhost:${PORT}/scan to connect.\n`);
    }
}

// ==================== GRACEFUL SHUTDOWN ====================
process.on('SIGINT', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    if (MONGODB_URI) {
        const mongoose = require('mongoose');
        await mongoose.disconnect();
        console.log('📦 MongoDB disconnected');
    }
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n🛑 Shutting down gracefully...');
    if (MONGODB_URI) {
        const mongoose = require('mongoose');
        await mongoose.disconnect();
        console.log('📦 MongoDB disconnected');
    }
    process.exit(0);
});

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
    console.error('❌ Uncaught Exception:', error.message);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('❌ Unhandled Rejection:', reason?.message || reason);
});

// ==================== START ====================
startServer();