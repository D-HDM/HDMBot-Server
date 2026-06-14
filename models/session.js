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
        required: true 
    },
    keys: { 
        type: Object, 
        required: true 
    },
    status: {
        type: String,
        enum: ['active', 'inactive', 'expired'],
        default: 'active'
    },
    metadata: {
        botName: {
            type: String,
            default: 'HDM BOT'
        },
        ownerName: {
            type: String,
            default: 'Davix HDM'
        },
        phoneNumber: String,
        platform: {
            type: String,
            default: 'WhatsApp'
        },
        lastConnected: Date,
        deviceInfo: String
    }
}, {
    timestamps: true, // Adds createdAt and updatedAt automatically
    collection: 'sessions'
});

// Indexes for better query performance
sessionSchema.index({ updatedAt: -1 });
sessionSchema.index({ status: 1 });

// Pre-save middleware
sessionSchema.pre('save', function(next) {
    // Update lastConnected timestamp when credentials change
    if (this.isModified('creds')) {
        this.metadata.lastConnected = new Date();
    }
    next();
});

// Static method to find active session
sessionSchema.statics.findActiveSession = function(sessionId) {
    return this.findOne({ 
        sessionId, 
        status: 'active' 
    });
};

// Method to check if session is expired (older than 7 days)
sessionSchema.methods.isExpired = function() {
    const sevenDays = 7 * 24 * 60 * 60 * 1000;
    return Date.now() - this.updatedAt.getTime() > sevenDays;
};

// Method to deactivate session
sessionSchema.methods.deactivate = async function() {
    this.status = 'inactive';
    return await this.save();
};

// Method to reactivate session
sessionSchema.methods.activate = async function() {
    this.status = 'active';
    return await this.save();
};

// Static method to clean up expired sessions
sessionSchema.statics.cleanExpiredSessions = async function() {
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    return await this.deleteMany({ 
        updatedAt: { $lt: sevenDaysAgo },
        status: 'inactive'
    });
};

// Static method to get session stats
sessionSchema.statics.getSessionStats = async function() {
    const stats = await this.aggregate([
        {
            $group: {
                _id: '$status',
                count: { $sum: 1 },
                lastUpdated: { $max: '$updatedAt' }
            }
        }
    ]);
    return stats;
};

// Create and export the model
const Session = mongoose.model('Session', sessionSchema);

module.exports = Session;