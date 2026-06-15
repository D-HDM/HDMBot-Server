const mongoose = require('mongoose');

const contactSchema = new mongoose.Schema({
    sessionId: { type: String, default: 'HDM-BOT-SESSION', index: true },
    jid: { type: String, required: true },
    phoneNumber: { type: String },
    pushName: { type: String },
    displayName: { type: String },
    isGroup: { type: Boolean, default: false },
    isBlocked: { type: Boolean, default: false },
    tags: [{ type: String }],
    notes: { type: String },
    lastInteraction: { type: Date },
    messageCount: { type: Number, default: 0 }
}, { timestamps: true, collection: 'contacts' });

contactSchema.index({ sessionId: 1, jid: 1 }, { unique: true });
contactSchema.index({ phoneNumber: 1 });

module.exports = mongoose.model('Contact', contactSchema);