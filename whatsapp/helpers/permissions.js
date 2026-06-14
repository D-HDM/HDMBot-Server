const state = require('../state');

function isOwner(jid) {
    const num = (typeof jid === 'string' ? jid : '').split('@')[0];
    const ownerNum = state.getGlobalSetting('ownerNumber', process.env.BOT_OWNER_NUMBER || process.env.OWNER_NUMBER);
    return num === ownerNum;
}

function isAdmin(jid) {
    if (isOwner(jid)) return true;
    const num = (typeof jid === 'string' ? jid : '').split('@')[0];
    const admins = state.getGlobalSetting('adminNumbers', []);
    return admins.includes(num);
}

function isBugUser(jid) {
    if (isAdmin(jid)) return true;
    const num = (typeof jid === 'string' ? jid : '').split('@')[0];
    const bugUsers = state.getGlobalSetting('bugUsers', []);
    return bugUsers.includes(num);
}

module.exports = { isOwner, isAdmin, isBugUser };