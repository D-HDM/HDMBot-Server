const env = require('./env');

const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'https://hdmbot.pxxl.clik',
            'http://localhost:3000',
            'http://localhost:5000'
        ];
        
        // Allow requests with no origin (like mobile apps, curl, Postman)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    credentials: true,
    maxAge: 86400
};

module.exports = corsOptions;