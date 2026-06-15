require('dotenv').config();

module.exports = {
    // Server
    PORT: process.env.PORT || 5000,
    NODE_ENV: process.env.NODE_ENV || 'development',
    APP_URL: process.env.APP_URL || 'http://localhost:5000',
    FRONTEND_URL: process.env.FRONTEND_URL || 'http://localhost:3000',

    // MongoDB
    MONGODB_URI: process.env.MONGODB_URI || '',

    // JWT
    JWT_SECRET: process.env.JWT_SECRET || 'default_secret_change_me',
    JWT_EXPIRE: process.env.JWT_EXPIRE || '7d',
    JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '30d',

    // CORS
    CORS_ORIGIN: process.env.CORS_ORIGIN || '*',

    // Bot
    PREFIX: process.env.PREFIX || '.',
    BOT_NAME: process.env.BOT_NAME || 'HDM BOT',
    OWNER_NAME: process.env.OWNER_NAME || 'Davix HDM',
    OWNER_NUMBER: process.env.BOT_OWNER_NUMBER || process.env.OWNER_NUMBER || '',
    SESSION_ID: process.env.SESSION_ID || 'HDM-BOT-SESSION',

    // Multi-Session
    MAX_SESSIONS: parseInt(process.env.MAX_SESSIONS) || 5,
    AUTO_CONNECT_DEFAULT: process.env.AUTO_CONNECT_DEFAULT !== 'false',

    // Rate Limiting
    RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW) || 60000,
    RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX) || 30,
    AUTOREPLY_COOLDOWN_DEFAULT: parseInt(process.env.AUTOREPLY_COOLDOWN_DEFAULT) || 10,
    COMMAND_COOLDOWN_DEFAULT: parseInt(process.env.COMMAND_COOLDOWN_DEFAULT) || 5,

    // Media
    UPLOAD_DIR: process.env.UPLOAD_DIR || './uploads',
    MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE) || 10485760,
    ALLOWED_MEDIA_TYPES: (process.env.ALLOWED_MEDIA_TYPES || 'image/jpeg,image/png,image/webp,video/mp4,audio/mp3').split(','),

    // Logging
    LOG_LEVEL: process.env.LOG_LEVEL || 'info',
    LOG_DIR: process.env.LOG_DIR || './logs',
    LOG_RETENTION_DAYS: parseInt(process.env.LOG_RETENTION_DAYS) || 30,

    // AI
    ENABLE_AI_COMMANDS: process.env.ENABLE_AI_COMMANDS !== 'false',
    DEFAULT_AI_MODEL: process.env.DEFAULT_AI_MODEL || 'hdmai',
    HDM_AI_API_URL: process.env.HDM_AI_API_URL || '',
    HDM_AI_API_KEY: process.env.HDM_AI_API_KEY || '',

    // Bug System
    ENABLE_BUG_COMMANDS: process.env.ENABLE_BUG_COMMANDS !== 'false',
    BUG_ALLOWED_USERS: (process.env.BUG_ALLOWED_USERS || '').split(',').filter(Boolean),
    BUG_MAX_MESSAGES: parseInt(process.env.BUG_MAX_MESSAGES) || 10000,

    // Admin
    ADMIN_NUMBERS: (process.env.ADMIN_NUMBERS || '').split(',').filter(Boolean),

    // Helpers
    isProd: process.env.NODE_ENV === 'production',
    isDev: process.env.NODE_ENV !== 'production'
};