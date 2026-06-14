const commands = new Map();
const categories = {};
const aliases = new Map();

const CATEGORY_EMOJIS = {
    general: '📋', fun: '🎉', group: '👥', settings: '⚙️',
    admin: '👑', ai: '🤖', media: '🖼️', bug: '🐛', utility: '🔧'
};

function command(name, options = {}) {
    const { aliases: cmdAliases = [], category = 'general', desc = '' } = options;
    return function(target, propertyKey, descriptor) {
        const fn = descriptor.value;
        const cmdName = name || propertyKey;
        commands.set(cmdName.toLowerCase(), { execute: fn, category, desc });

        if (!categories[category]) {
            categories[category] = { name: category, emoji: CATEGORY_EMOJIS[category] || '📋', cmds: [] };
        }
        categories[category].cmds.push(cmdName);

        for (const alias of cmdAliases) {
            aliases.set(alias.toLowerCase(), cmdName.toLowerCase());
        }
        return descriptor;
    };
}

// Import all category commands
const generalCommands = require('./general');
const funCommands = require('./fun');
const groupCommands = require('./group');
const settingsCommands = require('./settings');
const adminCommands = require('./admin');
const aiCommands = require('./ai');
const mediaCommands = require('./media');
const bugCommands = require('./bug');
const utilityCommands = require('./utility');

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
        if (mod && mod.register) {
            mod.register(commands, categories, cat);
        }
    }
}

async function executeCommand(cmdName, sock, msg, args, config) {
    const name = aliases.get(cmdName.toLowerCase()) || cmdName.toLowerCase();
    const cmd = commands.get(name);
    if (!cmd) return false;
    await cmd.execute(sock, msg, args, config);
    return true;
}

function getCommands() { return commands; }
function getCategories() { return categories; }
function getCategoryEmoji(cat) { return CATEGORY_EMOJIS[cat] || '📋'; }

module.exports = { command, registerAllCommands, executeCommand, getCommands, getCategories, getCategoryEmoji };