const commands = new Map();
const categories = {};
const aliases = new Map();

const CATEGORY_EMOJIS = {
    general: '📋', fun: '🎉', group: '👥', settings: '⚙️',
    admin: '👑', ai: '🤖', media: '🖼️', bug: '🐛', utility: '🔧'
};

const CATEGORY_NAMES = {
    general: 'General', fun: 'Fun', group: 'Group',
    settings: 'Settings', admin: 'Admin', ai: 'AI',
    media: 'Media', bug: 'Bug', utility: 'Utility'
};

// Initialize all categories with empty command arrays
const ALL_CATEGORIES = ['general', 'fun', 'group', 'settings', 'admin', 'ai', 'media', 'bug', 'utility'];

for (const cat of ALL_CATEGORIES) {
    categories[cat] = {
        name: CATEGORY_NAMES[cat] || cat,
        emoji: CATEGORY_EMOJIS[cat] || '📋',
        cmds: []
    };
}

// Override Map.set to auto-track categories
const originalSet = commands.set.bind(commands);
commands.set = function(key, value) {
    const result = originalSet(key, value);
    if (value && value.category && categories[value.category]) {
        if (!categories[value.category].cmds.includes(key)) {
            categories[value.category].cmds.push(key);
        }
    }
    return result;
};

// Override Map.delete to auto-remove from categories
const originalDelete = commands.delete.bind(commands);
commands.delete = function(key) {
    const cmd = commands.get(key);
    if (cmd && cmd.category && categories[cmd.category]) {
        const idx = categories[cmd.category].cmds.indexOf(key);
        if (idx !== -1) categories[cmd.category].cmds.splice(idx, 1);
    }
    return originalDelete(key);
};

// Alias support
function addAlias(alias, commandName) {
    aliases.set(alias.toLowerCase(), commandName.toLowerCase());
}

// ==================== IMPORT ALL COMMAND MODULES ====================
const generalCommands = require('./general');
const funCommands = require('./fun');
const groupCommands = require('./group');
const settingsCommands = require('./settings');
const adminCommands = require('./admin');
const aiCommands = require('./ai');
const mediaCommands = require('./media');
const bugCommands = require('./bug');
const utilityCommands = require('./utility');

// ==================== REGISTER ALL ====================
function registerAllCommands() {
    const allModules = [
        { mod: generalCommands, cat: 'general' },
        { mod: funCommands, cat: 'fun' },
        { mod: groupCommands, cat: 'group' },
        { mod: settingsCommands, cat: 'settings' },
        { mod: adminCommands, cat: 'admin' },
        { mod: aiCommands, cat: 'ai' },
        { mod: mediaCommands, cat: 'media' },
        { mod: bugCommands, cat: 'bug' },
        { mod: utilityCommands, cat: 'utility' }
    ];

    for (const { mod, cat } of allModules) {
        if (mod && typeof mod.register === 'function') {
            mod.register(commands, categories, cat);
        }
    }

    // Log registration
    console.log(`\n📋 Commands Registered:`);
    for (const cat of ALL_CATEGORIES) {
        const count = categories[cat]?.cmds?.length || 0;
        const emoji = CATEGORY_EMOJIS[cat] || '📋';
        const name = CATEGORY_NAMES[cat] || cat;
        console.log(`   ${emoji} ${name}: ${count} commands`);
    }
    console.log(`   📊 Total: ${commands.size} commands\n`);
}

// ==================== EXECUTE COMMAND ====================
async function executeCommand(cmdName, sock, msg, args, config) {
    // Check direct match
    let cmd = commands.get(cmdName.toLowerCase());
    
    // Check aliases
    if (!cmd) {
        const aliasTarget = aliases.get(cmdName.toLowerCase());
        if (aliasTarget) {
            cmd = commands.get(aliasTarget);
        }
    }
    
    if (!cmd) return false;
    
    await cmd.execute(sock, msg, args, config);
    return true;
}

// ==================== GETTERS ====================
function getCommands() { 
    return commands; 
}

function getCategories() { 
    return categories; 
}

function getCategoryEmoji(cat) { 
    return CATEGORY_EMOJIS[cat] || '📋'; 
}

function getCategoryName(cat) {
    return CATEGORY_NAMES[cat] || cat;
}

module.exports = { 
    registerAllCommands, 
    executeCommand, 
    getCommands, 
    getCategories, 
    getCategoryEmoji,
    getCategoryName,
    addAlias
};