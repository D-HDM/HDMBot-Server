// Interactive menu session handler (placeholder for full menu system)
const state = require('../state');

function startMenuSession(userNum, sessionData) {
    state.setMenuSession(userNum, {
        ...sessionData,
        expires: Date.now() + 60000
    });
}

function getMenuSession(userNum) {
    const session = state.getMenuSession(userNum);
    if (session && Date.now() > session.expires) {
        state.removeMenuSession(userNum);
        return null;
    }
    return session;
}

function endMenuSession(userNum) {
    state.removeMenuSession(userNum);
}

module.exports = { startMenuSession, getMenuSession, endMenuSession };