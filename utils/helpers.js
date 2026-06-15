const crypto = require('crypto');

const helpers = {
    generateId: (length = 12) => {
        return crypto.randomBytes(length).toString('hex').slice(0, length);
    },

    formatPhone: (phone) => {
        return String(phone).replace(/[^0-9]/g, '');
    },

    sanitizeText: (text) => {
        return String(text).replace(/[<>]/g, '').trim();
    },

    paginate: (page = 1, limit = 20) => {
        const skip = (Math.max(1, parseInt(page)) - 1) * parseInt(limit);
        return { skip, limit: parseInt(limit) };
    },

    asyncHandler: (fn) => (req, res, next) => {
        Promise.resolve(fn(req, res, next)).catch(next);
    },

    sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

    getPaginationMeta: (total, page, limit) => ({
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
        hasMore: page * limit < total
    })
};

module.exports = helpers;