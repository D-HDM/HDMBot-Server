const { Server } = require('socket.io');
const { getSessionManager } = require('./whatsapp/sessionManager');
const client = require('./whatsapp/client');

let io = null;

function initSocket(server) {
    io = new Server(server, {
        cors: {
            origin: process.env.CORS_ORIGIN || '*',
            methods: ['GET', 'POST']
        },
        pingTimeout: 60000,
        pingInterval: 25000
    });

    io.on('connection', (socket) => {
        console.log(`🔌 Socket connected: ${socket.id}`);

        // Send initial status on connect
        sendSessionStatus(socket);

        // Client requests session status
        socket.on('get_sessions', () => {
            sendSessionStatus(socket);
        });

        // Client requests specific session QR
        socket.on('get_qr', async (sessionId) => {
            const sessionManager = getSessionManager();
            const qr = sessionManager.getQRCode(sessionId);
            const connected = sessionManager.isConnected(sessionId);
            socket.emit('qr_update', {
                sessionId,
                qr: qr || null,
                connected,
                qrScanned: sessionManager.isQRScanned(sessionId)
            });
        });

        // Client joins a session room for live updates
        socket.on('watch_session', (sessionId) => {
            socket.join(`session:${sessionId}`);
            console.log(`👀 ${socket.id} watching ${sessionId}`);
        });

        // Client stops watching
        socket.on('unwatch_session', (sessionId) => {
            socket.leave(`session:${sessionId}`);
        });

        socket.on('disconnect', () => {
            console.log(`🔌 Socket disconnected: ${socket.id}`);
        });
    });

    // Start broadcasting session status every 5 seconds
    setInterval(() => {
        broadcastSessionStatus();
    }, 5000);

    console.log('🔌 WebSocket server initialized');
    return io;
}

function sendSessionStatus(socket) {
    const sessionManager = getSessionManager();
    const sessions = [];
    
    for (const [id, data] of sessionManager.sessions) {
        sessions.push({
            sessionId: id,
            status: data.status,
            connected: data.status === 'connected',
            qrAvailable: !!data.qrCode,
            qrScanned: data.qrScanned
        });
    }

    socket.emit('session_status', { sessions });
}

function broadcastSessionStatus() {
    if (!io) return;
    
    const sessionManager = getSessionManager();
    const sessions = [];
    
    for (const [id, data] of sessionManager.sessions) {
        sessions.push({
            sessionId: id,
            status: data.status,
            connected: data.status === 'connected',
            qrAvailable: !!data.qrCode,
            qrScanned: data.qrScanned
        });
    }

    io.emit('session_status', { sessions });
}

// Emit to specific session room
function emitSessionUpdate(sessionId, data) {
    if (!io) return;
    io.to(`session:${sessionId}`).emit('session_update', {
        sessionId,
        ...data
    });
}

// Emit QR update to specific session
function emitQRUpdate(sessionId, qr, qrScanned, connected) {
    if (!io) return;
    io.to(`session:${sessionId}`).emit('qr_update', {
        sessionId,
        qr: qr || null,
        qrScanned: qrScanned || false,
        connected: connected || false
    });
}

function getIO() {
    return io;
}

module.exports = { initSocket, getIO, emitSessionUpdate, emitQRUpdate, broadcastSessionStatus };