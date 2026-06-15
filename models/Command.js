const mongoose = require('mongoose');

const commandSchema = new mongoose.Schema({
    sessionId: { type: String, default: 'HDM-BOT-SESSION', index: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    category: { type: String, default: 'custom' },
    response: { type: String, required: true },
    enabled: { type: Boolean, default: true },
    aliases: [{ type: String }],
    cooldown: { type: Number, default: 5 },
    adminOnly: { type: Boolean, default: false },
    usageCount: { type: Number, default: 0 },
    createdBy: { type: String }
}, { timestamps: true, collection: 'commands' });

commandSchema.index({ sessionId: 1, name: 1 }, { unique: true });

module.exports = mongoose.model('Command', commandSchema);