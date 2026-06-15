const fs = require('fs');
const path = require('path');
const env = require('../config/env');

const logDir = path.join(__dirname, '..', env.LOG_DIR || 'logs');
if (!fs.existsSync(logDir)) {
    fs.mkdirSync(logDir, { recursive: true });
}

const levels = { error: 0, warn: 1, info: 2, http: 3, debug: 4 };
const currentLevel = levels[env.LOG_LEVEL] || levels.info;

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    yellow: '\x1b[33m',
    green: '\x1b[32m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    gray: '\x1b[90m',
};

const levelColors = {
    error: colors.red,
    warn: colors.yellow,
    info: colors.green,
    http: colors.cyan,
    debug: colors.magenta,
};

const formatMessage = (level, message, ...args) => {
    const timestamp = new Date().toISOString();
    const color = levelColors[level] || colors.reset;
    const extra = args.length ? ' ' + args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ') : '';
    return `${colors.gray}${timestamp}${colors.reset} ${color}[${level.toUpperCase()}]${colors.reset} ${message}${extra}`;
};

// Rotate logs if too large (keep last LOG_RETENTION_DAYS)
const rotateLogs = () => {
    const files = fs.readdirSync(logDir).filter(f => f.endsWith('.log'));
    const now = Date.now();
    const maxAge = env.LOG_RETENTION_DAYS * 24 * 60 * 60 * 1000;

    for (const file of files) {
        const filePath = path.join(logDir, file);
        const stats = fs.statSync(filePath);
        if (now - stats.mtimeMs > maxAge) {
            fs.unlinkSync(filePath);
        }
    }
};

// Rotate daily
rotateLogs();
setInterval(rotateLogs, 24 * 60 * 60 * 1000);

const logger = {
    error: (message, ...args) => {
        if (currentLevel >= levels.error) {
            const line = formatMessage('error', message, ...args);
            console.error(line);
            fs.appendFileSync(path.join(logDir, 'error.log'), line.replace(/\x1b\[[0-9;]*m/g, '') + '\n');
        }
    },

    warn: (message, ...args) => {
        if (currentLevel >= levels.warn) {
            const line = formatMessage('warn', message, ...args);
            console.warn(line);
            fs.appendFileSync(path.join(logDir, 'combined.log'), line.replace(/\x1b\[[0-9;]*m/g, '') + '\n');
        }
    },

    info: (message, ...args) => {
        if (currentLevel >= levels.info) {
            const line = formatMessage('info', message, ...args);
            console.log(line);
            fs.appendFileSync(path.join(logDir, 'combined.log'), line.replace(/\x1b\[[0-9;]*m/g, '') + '\n');
        }
    },

    http: (message, ...args) => {
        if (currentLevel >= levels.http) {
            const line = formatMessage('http', message, ...args);
            console.log(line);
            fs.appendFileSync(path.join(logDir, 'combined.log'), line.replace(/\x1b\[[0-9;]*m/g, '') + '\n');
        }
    },

    debug: (message, ...args) => {
        if (currentLevel >= levels.debug) {
            const line = formatMessage('debug', message, ...args);
            console.debug(line);
        }
    },

    // Log to specific file
    toFile: (filename, message) => {
        const filePath = path.join(logDir, filename);
        const line = `[${new Date().toISOString()}] ${message}`;
        fs.appendFileSync(filePath, line + '\n');
    },

    // Stream for Morgan/HTTP logging
    stream: {
        write: (message) => {
            const clean = message.trim();
            if (clean) {
                fs.appendFileSync(path.join(logDir, 'access.log'), `[${new Date().toISOString()}] ${clean}\n`);
            }
        }
    }
};

module.exports = logger;