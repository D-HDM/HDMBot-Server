const env = require('./env');

const corsOptions = {
    origin: function (origin, callback) {
        const allowedOrigins = [
            'https://hdmbot.pxxl.click',
            'https://hdmbot-server.pxxl.click',
            'http://localhost:3000',
            'http://localhost:5000',
            'http://localhost:5173'
        ];
        
        // Allow requests with no origin (mobile apps, curl, Postman, same-origin)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            console.log('CORS blocked:', origin);
            callback(null, true); // TEMP: Allow all for debugging
        }
    },
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'x-api-key'],
    credentials: true,
    maxAge: 86400
};

module.exports = corsOptions;