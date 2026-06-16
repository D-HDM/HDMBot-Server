const state = require('../state');

function extractNumber(jid) {
    let num = (typeof jid === 'string' ? jid : '').split('@')[0];
    // Handle group participant format: 254768784909:150508589334674
    if (num.includes(':')) {
        const parts = num.split(':');
        // Return the real number (first part before :)
        num = parts[0];
    }
    return num;
}

function isOwner(jid) {
    const num = extractNumber(jid);
    const ownerNum = state.getGlobalSetting('ownerNumber', process.env.BOT_OWNER_NUMBER || process.env.OWNER_NUMBER);
    return num === ownerNum;
}

function isAdmin(jid) {
    if (isOwner(jid)) return true;
    const num = extractNumber(jid);
    const admins = state.getGlobalSetting('adminNumbers', []);
    return admins.includes(num);
}

function isBugUser(jid) {
    if (isAdmin(jid)) return true;
    const num = extractNumber(jid);
    const bugUsers = state.getGlobalSetting('bugUsers', []);
    return bugUsers.includes(num);
}

module.exports = { isOwner, isAdmin, isBugUser, extractNumber };