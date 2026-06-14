// Per-session isolated state (like Python's global dicts)
let sessionState = {
    activeAttacks: {},
    menuSessions: {},
    mutedUsers: {},
    warningUsers: {},
    badWords: {},
    antiLink: {},
    onlyAdmin: {},
    antiStatus: {},
    memberStats: {},
    pairingCodes: {},
    
    // Settings
    globalSettings: {
        prefix: process.env.PREFIX || '.',
        ownerNumber: process.env.BOT_OWNER_NUMBER || process.env.OWNER_NUMBER || '',
        adminNumbers: (process.env.ADMIN_NUMBERS || '').split(',').filter(Boolean),
        bugUsers: [],
        enableAI: true,
        enableBug: true,
        defaultAI: process.env.DEFAULT_AI_MODEL || 'hdmai',
        footer: '',
        bugLogs: []
    },
    
    // Per-user settings
    userSettings: {}
};

function loadState(state) {
    if (state) sessionState = { ...sessionState, ...state };
}

function getState() {
    return sessionState;
}

// ==================== GLOBAL SETTINGS ====================

function getGlobalSetting(key, defaultValue) {
    return sessionState.globalSettings[key] ?? defaultValue;
}

function setGlobalSetting(key, value) {
    sessionState.globalSettings[key] = value;
}

// ==================== USER SETTINGS ====================

function getUserSetting(userNum, key, defaultValue) {
    if (!sessionState.userSettings[userNum]) sessionState.userSettings[userNum] = {};
    return sessionState.userSettings[userNum][key] ?? defaultValue;
}

function setUserSetting(userNum, key, value) {
    if (!sessionState.userSettings[userNum]) sessionState.userSettings[userNum] = {};
    sessionState.userSettings[userNum][key] = value;
}

// ==================== ATTACKS ====================

function setAttack(id, data) { sessionState.activeAttacks[id] = data; }
function getAttack(id) { return sessionState.activeAttacks[id]; }
function getAttacks() { return sessionState.activeAttacks; }
function removeAttack(id) { delete sessionState.activeAttacks[id]; }

// ==================== MENU SESSIONS ====================

function setMenuSession(userNum, data) { sessionState.menuSessions[userNum] = data; }
function getMenuSession(userNum) { return sessionState.menuSessions[userNum]; }
function removeMenuSession(userNum) { delete sessionState.menuSessions[userNum]; }

// ==================== PAIRING CODES ====================

function setPairingCode(code, data) { sessionState.pairingCodes[code] = data; }
function getPairingCode(code) { return sessionState.pairingCodes[code]; }

// ==================== GROUP STATE ====================

// Anti-link
function getAntiLink(groupJid) {
    if (!sessionState.antiLink[groupJid]) {
        sessionState.antiLink[groupJid] = { enabled: false, action: 'delete' };
    }
    return sessionState.antiLink[groupJid];
}
function setAntiLink(groupJid, data) {
    sessionState.antiLink[groupJid] = data;
}

// Anti-status
function getAntiStatus(groupJid) {
    if (!sessionState.antiStatus[groupJid]) {
        sessionState.antiStatus[groupJid] = { enabled: false, action: 'warn' };
    }
    return sessionState.antiStatus[groupJid];
}
function setAntiStatus(groupJid, data) {
    sessionState.antiStatus[groupJid] = data;
}

// Only admin
function getOnlyAdmin(groupJid) {
    return sessionState.onlyAdmin[groupJid] || false;
}
function setOnlyAdmin(groupJid, value) {
    sessionState.onlyAdmin[groupJid] = value;
}

// Welcome message
function getWelcome(groupJid) {
    return sessionState.globalSettings[`welcome_${groupJid}`] || '';
}
function setWelcome(groupJid, text) {
    sessionState.globalSettings[`welcome_${groupJid}`] = text;
}

// Goodbye message
function getGoodbye(groupJid) {
    return sessionState.globalSettings[`goodbye_${groupJid}`] || '';
}
function setGoodbye(groupJid, text) {
    sessionState.globalSettings[`goodbye_${groupJid}`] = text;
}

// Muted users
function setMutedUser(groupJid, userJid, data) {
    if (!sessionState.mutedUsers[groupJid]) sessionState.mutedUsers[groupJid] = {};
    sessionState.mutedUsers[groupJid][userJid] = data;
}
function getMutedUsers(groupJid) {
    return sessionState.mutedUsers[groupJid] || {};
}
function removeMutedUser(groupJid, userJid) {
    if (sessionState.mutedUsers[groupJid]) {
        delete sessionState.mutedUsers[groupJid][userJid];
    }
}

// Warning limit
function setWarningLimit(groupJid, limit) {
    if (!sessionState.warningUsers[groupJid]) {
        sessionState.warningUsers[groupJid] = { limit: 3, users: {} };
    }
    sessionState.warningUsers[groupJid].limit = limit;
}
function getWarningLimit(groupJid) {
    return sessionState.warningUsers[groupJid]?.limit || 3;
}

// Bad words
function addBadWord(groupJid, word) {
    if (!sessionState.badWords[groupJid]) sessionState.badWords[groupJid] = [];
    if (!sessionState.badWords[groupJid].includes(word)) {
        sessionState.badWords[groupJid].push(word);
    }
}
function removeBadWord(groupJid, word) {
    if (!sessionState.badWords[groupJid]) return false;
    const idx = sessionState.badWords[groupJid].indexOf(word);
    if (idx === -1) return false;
    sessionState.badWords[groupJid].splice(idx, 1);
    return true;
}
function getBadWords(groupJid) {
    return sessionState.badWords[groupJid] || [];
}

// Anti-badword
function setAntiBadWord(groupJid, data) {
    sessionState.globalSettings[`antibadword_${groupJid}`] = data;
}
function getAntiBadWord(groupJid) {
    return sessionState.globalSettings[`antibadword_${groupJid}`] || { enabled: false, action: 'delete' };
}

// Member stats
function getMemberStats(groupJid) {
    return sessionState.memberStats[groupJid];
}
function setMemberStats(groupJid, data) {
    sessionState.memberStats[groupJid] = { ...data, timestamp: Date.now() };
}

module.exports = {
    loadState,
    getState,
    getGlobalSetting,
    setGlobalSetting,
    getUserSetting,
    setUserSetting,
    setAttack,
    getAttack,
    getAttacks,
    removeAttack,
    setMenuSession,
    getMenuSession,
    removeMenuSession,
    setPairingCode,
    getPairingCode,
    getAntiLink,
    setAntiLink,
    getAntiStatus,
    setAntiStatus,
    getOnlyAdmin,
    setOnlyAdmin,
    getWelcome,
    setWelcome,
    getGoodbye,
    setGoodbye,
    setMutedUser,
    getMutedUsers,
    removeMutedUser,
    setWarningLimit,
    getWarningLimit,
    addBadWord,
    removeBadWord,
    getBadWords,
    setAntiBadWord,
    getAntiBadWord,
    getMemberStats,
    setMemberStats
};