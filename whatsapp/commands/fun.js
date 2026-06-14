const axios = require('axios');

function register(commands, categories, category) {
    commands.set('joke', {
        category,
        desc: 'Get a random joke',
        execute: async (sock, msg, args, config) => {
            try {
                const { data } = await axios.get('https://v2.jokeapi.dev/joke/Any?safe-mode', { timeout: 5000 });
                const joke = data.type === 'single' ? data.joke : `${data.setup}\n\n${data.delivery}`;
                await sock.sendMessage(msg.key.remoteJid, { text: joke });
            } catch {
                await sock.sendMessage(msg.key.remoteJid, { text: '😂 Why did the dev go broke? He used up all his cache!' });
            }
        }
    });

    commands.set('quote', {
        category,
        desc: 'Get a random quote',
        execute: async (sock, msg, args, config) => {
            try {
                const { data } = await axios.get('https://api.quotable.io/random', { timeout: 5000 });
                await sock.sendMessage(msg.key.remoteJid, { text: `"${data.content}"\n— ${data.author}` });
            } catch {
                await sock.sendMessage(msg.key.remoteJid, { text: '"The only way to do great work is to love what you do." — Steve Jobs' });
            }
        }
    });
}

module.exports = { register };