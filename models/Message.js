const mongoose = require('mongoose');

const messageSchema = new mongoose.Schema({
    sessionId: { type: String, default: 'HDM-BOT-SESSION', index: true },
    chatId: { type: String, required: true, index: true },
    chatName: { type: String },
    from: { type: String },
    body: { type: String },
    direction: { type: String, enum: ['in', 'out'], default: 'in' },
    isCommand: { type: Boolean, default: false },
    commandName: { type: String },
    messageType: { type: String },
    hasMedia: { type: Boolean, default: false },
    mediaType: { type: String },
    timestamp: { type: Date, default: Date.now, index: true }
}, { timestamps: false, collection: 'messages' });

messageSchema.index({ sessionId: 1, chatId: 1, timestamp: -1 });

module.exports = mongoose.model('Message', messageSchema);