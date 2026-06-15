const mongoose = require('mongoose');

const sessionSchema = new mongoose.Schema({
    sessionId: { 
        type: String, 
        required: true, 
        unique: true,
        index: true 
    },
    creds: { 
        type: Object, 
        default: {} 
    },
    keys: { 
        type: Object, 
        default: {} 
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'expired'],
        default: 'inactive'
    },
    metadata: {
        botName: { type: String, default: 'HDM BOT' },
        ownerName: { type: String, default: 'Davix HDM' },
        phoneNumber: { type: String, default: '' },
        platform: { type: String, default: 'WhatsApp' },
        lastConnected: { type: Date },
        deviceInfo: { type: String, default: 'HDM BOT v2.0.0' }
    }
}, {
    timestamps: true,
    collection: 'sessions'
});

// Indexes
sessionSchema.index({ updatedAt: -1 });
sessionSchema.index({ status: 1 });

// Pre-save hook
sessionSchema.pre('save', function(next) {
    if (this.isModified('creds') && Object.keys(this.creds).length > 0) {
        this.metadata.lastConnected = new Date();
        this.status = 'active';
    }
    next();
});

// Static: Find active session with valid creds
sessionSchema.statics.findValidSession = function(sessionId) {
    return this.findOne({ 
        sessionId, 
        status: 'active',
        'creds.me': { $exists: true }
    });
};

// Static: Save or update session creds
sessionSchema.statics.saveCreds = async function(sessionId, creds, keys) {
    return await this.findOneAndUpdate(
        { sessionId },
        {
            sessionId,
            creds,
            keys,
            status: 'active',
            'metadata.lastConnected': new Date(),
            $setOnInsert: {
                'metadata.botName': process.env.BOT_NAME || 'HDM BOT',
                'metadata.ownerName': process.env.OWNER_NAME || 'Davix HDM',
                'metadata.platform': 'WhatsApp'
            }
        },
        { upsert: true, new: true }
    );
};

// Static: Deactivate session
sessionSchema.statics.deactivateSession = async function(sessionId) {
    return await this.findOneAndUpdate(
        { sessionId },
        { status: 'inactive' }
    );
};

// Method: Check if session is expired (>30 days unused)
sessionSchema.methods.isExpired = function() {
    const thirtyDays = 30 * 24 * 60 * 60 * 1000;
    return Date.now() - this.updatedAt.getTime() > thirtyDays;
};

// Method: Has valid credentials
sessionSchema.methods.hasValidCreds = function() {
    return this.creds && Object.keys(this.creds).length > 0 && !!this.creds.me;
};

const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;