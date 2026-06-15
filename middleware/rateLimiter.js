const env = require('../config/env');

const requests = new Map();

// Clean old entries every minute
setInterval(() => {
    const now = Date.now();
    for (const [key, data] of requests) {
        if (now - data.windowStart > env.RATE_LIMIT_WINDOW) {
            requests.delete(key);
        }
    }
}, 60000);

const rateLimiter = (maxRequests = env.RATE_LIMIT_MAX) => {
    return (req, res, next) => {
        const key = req.ip || req.connection.remoteAddress;
        const now = Date.now();

        if (!requests.has(key)) {
            requests.set(key, { count: 1, windowStart: now });
            return next();
        }

        const data = requests.get(key);

        if (now - data.windowStart > env.RATE_LIMIT_WINDOW) {
            data.count = 1;
            data.windowStart = now;
            return next();
        }

        if (data.count >= maxRequests) {
            return res.status(429).json({
                success: false,
                error: 'Too many requests. Please try again later.'
            });
        }

        data.count++;
        next();
    };
};

module.exports = rateLimiter;