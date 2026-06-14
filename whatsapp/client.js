require('dotenv').config();
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');
const { getSessionManager } = require('./sessionManager');
const { registerAllCommands } = require('./commands');

// ==================== CONFIGURATION ====================
const BOT_NAME = process.env.BOT_NAME || 'HDM BOT';
const OWNER_NAME = process.env.OWNER_NAME || 'Davix HDM';
const MONGODB_URI = process.env.MONGODB_URI;

// ==================== MONGODB ====================
if (MONGODB_URI && MONGODB_URI !== '') {
    mongoose.connect(MONGODB_URI).then(() => {
        console.log('📦 MongoDB connected');
    }).catch(err => {
        console.error('❌ MongoDB failed:', err.message);
    });
}

// ==================== LOGGER ====================
const originalConsoleError = console.error;
console.error = function(...args) {
    const msg = args.join(' ');
    if (msg.includes('Bad MAC') || msg.includes('decrypt') || 
        msg.includes('Session error') || msg.includes('Closing session')) return;
    originalConsoleError.apply(console, args);
};

// ==================== INITIALIZE ====================
registerAllCommands();

// ==================== START DEFAULT SESSION ====================
async function startDefaultSession() {
    const sessionManager = getSessionManager();
    await sessionManager.startDefaultSession();
}

// ==================== EXPORT ====================
module.exports = {
    getSessionManager,
    startDefaultSession,
    getQRCode: () => {
        const defaultId = process.env.SESSION_ID || 'HDM-BOT-SESSION';
        return getSessionManager().getQRCode(defaultId);
    },
    getQRScanned: () => {
        const defaultId = process.env.SESSION_ID || 'HDM-BOT-SESSION';
        return getSessionManager().isQRScanned(defaultId);
    },
    getConnectionStatus: () => {
        const defaultId = process.env.SESSION_ID || 'HDM-BOT-SESSION';
        return getSessionManager().isConnected(defaultId) ? 'connected' : 'disconnected';
    },
    isUsingMongoDB: () => !!(MONGODB_URI && MONGODB_URI !== ''),
    resetQR: () => {},
    disconnect: async () => {
        const defaultId = process.env.SESSION_ID || 'HDM-BOT-SESSION';
        await getSessionManager().disconnect(defaultId);
    },
    deleteSession: async () => {
        const defaultId = process.env.SESSION_ID || 'HDM-BOT-SESSION';
        await getSessionManager().disconnect(defaultId);
        const sessionDir = path.join(__dirname, '..', 'sessions', defaultId);
        if (fs.existsSync(sessionDir)) fs.rmSync(sessionDir, { recursive: true, force: true });
    }
};

if (require.main === module) {
    console.log('🤖 Starting HDM BOT...');
    startDefaultSession();
}