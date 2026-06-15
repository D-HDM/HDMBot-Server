const mongoose = require('mongoose');

const ruleSchema = new mongoose.Schema({
    sessionId: { type: String, default: 'HDM-BOT-SESSION', index: true },
    trigger: { type: String, required: true },
    response: { type: String, required: true },
    matchType: { 
        type: String, 
        enum: ['exact', 'contains', 'startsWith', 'regex'], 
        default: 'contains' 
    },
    enabled: { type: Boolean, default: true },
    category: { type: String, enum: ['global', 'group', 'private'], default: 'global' },
    groupId: { type: String, default: null },
    priority: { type: Number, default: 0 },
    createdBy: { type: String },
    usageCount: { type: Number, default: 0 }
}, { timestamps: true, collection: 'rules' });

ruleSchema.index({ sessionId: 1, enabled: 1 });
ruleSchema.index({ category: 1, groupId: 1 });

module.exports = mongoose.model('Rule', ruleSchema);