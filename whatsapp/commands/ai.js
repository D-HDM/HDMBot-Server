const axios = require('axios');
const FormData = require('form-data');
const state = require('../state');

// ==================== HDM AI (PRIMARY - uses form-data) ====================
async function queryHDMAI(prompt) {
    try {
        const url = process.env.HDM_AI_API_URL || 'https://hdm-ai-server.onrender.com/api/v1/general/chat/public';
        const key = process.env.HDM_AI_API_KEY || 'hdm_gen_94b1a42c30805c31852105c287a5812272857a0af82e1e58';
        
        const formData = new FormData();
        formData.append('message', prompt);
        formData.append('system_prompt', `You are ${process.env.BOT_NAME || 'HDM BOT'}, a helpful WhatsApp assistant. Keep responses concise and friendly.`);
        formData.append('interface', 'client');

        const { data } = await axios.post(url, formData, {
            headers: {
                'x-api-key': key,
                ...formData.getHeaders()
            },
            timeout: 60000
        });

        if (data.success && data.data?.reply) {
            return data.data.reply;
        }
        return `❌ HDM AI: ${data.message || 'No response'}`;
    } catch (e) {
        return `❌ HDM AI: ${e.message}`;
    }
}

// ==================== DEEPSEEK ====================
async function queryDeepSeek(prompt) {
    try {
        const key = process.env.DEEPSEEK_API_KEY;
        if (!key) return '❌ DeepSeek API key not set.';
        const { data } = await axios.post('https://api.deepseek.com/v1/chat/completions', {
            model: 'deepseek-chat',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 1000
        }, {
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            timeout: 30000
        });
        return data.choices[0].message.content;
    } catch (e) { return `❌ DeepSeek: ${e.message}`; }
}

// ==================== GEMINI ====================
async function queryGemini(prompt) {
    try {
        const key = process.env.GEMINI_API_KEY;
        if (!key) return '❌ Gemini API key not set.';
        const { data } = await axios.post(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`,
            { contents: [{ parts: [{ text: prompt }] }] },
            { timeout: 30000 }
        );
        return data.candidates[0].content.parts[0].text;
    } catch (e) { return `❌ Gemini: ${e.message}`; }
}

// ==================== CHATGPT ====================
async function queryChatGPT(prompt) {
    try {
        const key = process.env.OPENAI_API_KEY;
        if (!key) return '❌ ChatGPT API key not set.';
        const { data } = await axios.post('https://api.openai.com/v1/chat/completions', {
            model: 'gpt-3.5-turbo',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 1000
        }, {
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            timeout: 30000
        });
        return data.choices[0].message.content;
    } catch (e) { return `❌ ChatGPT: ${e.message}`; }
}

// ==================== GROK ====================
async function queryGrok(prompt) {
    try {
        const key = process.env.GROK_API_KEY;
        if (!key) return '❌ Grok API key not set.';
        const { data } = await axios.post('https://api.x.ai/v1/chat/completions', {
            model: 'grok-2-latest',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 1000
        }, {
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            timeout: 30000
        });
        return data.choices[0].message.content;
    } catch (e) { return `❌ Grok: ${e.message}`; }
}

// ==================== GROQ ====================
async function queryGroq(prompt) {
    try {
        const key = process.env.GROQ_API_KEY;
        if (!key) return '❌ Groq API key not set.';
        const { data } = await axios.post('https://api.groq.com/openai/v1/chat/completions', {
            model: 'llama-3.3-70b-versatile',
            messages: [{ role: 'user', content: prompt }],
            temperature: 0.7,
            max_tokens: 1000
        }, {
            headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
            timeout: 30000
        });
        return data.choices[0].message.content;
    } catch (e) { return `❌ Groq: ${e.message}`; }
}

// ==================== REGISTER COMMANDS ====================
function register(commands, categories, category) {
    
    // .ai - Default AI (uses HDM AI)
    commands.set('ai', {
        category,
        desc: 'Ask AI (HDM AI)',
        execute: async (sock, msg, args, config) => {
            if (!args.length) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Usage: ${config.PREFIX}ai <question>` });
            await sock.sendMessage(msg.key.remoteJid, { text: '🤖 Thinking...' });
            const response = await queryHDMAI(args.join(' '));
            await sock.sendMessage(msg.key.remoteJid, { text: response });
        }
    });

    // .hdmai
    commands.set('hdmai', {
        category,
        desc: 'Ask HDM AI',
        execute: async (sock, msg, args, config) => {
            if (!args.length) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Usage: ${config.PREFIX}hdmai <question>` });
            await sock.sendMessage(msg.key.remoteJid, { text: '🤖 HDM AI thinking...' });
            const response = await queryHDMAI(args.join(' '));
            await sock.sendMessage(msg.key.remoteJid, { text: response });
        }
    });

    // .deepseek
    commands.set('deepseek', {
        category,
        desc: 'Ask DeepSeek AI',
        execute: async (sock, msg, args, config) => {
            if (!args.length) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Usage: ${config.PREFIX}deepseek <question>` });
            await sock.sendMessage(msg.key.remoteJid, { text: '🤖 DeepSeek thinking...' });
            const response = await queryDeepSeek(args.join(' '));
            await sock.sendMessage(msg.key.remoteJid, { text: response });
        }
    });

    // .gemini
    commands.set('gemini', {
        category,
        desc: 'Ask Gemini AI',
        execute: async (sock, msg, args, config) => {
            if (!args.length) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Usage: ${config.PREFIX}gemini <question>` });
            await sock.sendMessage(msg.key.remoteJid, { text: '🧠 Gemini thinking...' });
            const response = await queryGemini(args.join(' '));
            await sock.sendMessage(msg.key.remoteJid, { text: response });
        }
    });

    // .chatgpt
    commands.set('chatgpt', {
        category,
        desc: 'Ask ChatGPT',
        execute: async (sock, msg, args, config) => {
            if (!args.length) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Usage: ${config.PREFIX}chatgpt <question>` });
            await sock.sendMessage(msg.key.remoteJid, { text: '💬 ChatGPT thinking...' });
            const response = await queryChatGPT(args.join(' '));
            await sock.sendMessage(msg.key.remoteJid, { text: response });
        }
    });

    // .grok
    commands.set('grok', {
        category,
        desc: 'Ask Grok AI',
        execute: async (sock, msg, args, config) => {
            if (!args.length) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Usage: ${config.PREFIX}grok <question>` });
            await sock.sendMessage(msg.key.remoteJid, { text: '🚀 Grok thinking...' });
            const response = await queryGrok(args.join(' '));
            await sock.sendMessage(msg.key.remoteJid, { text: response });
        }
    });

    // .groq
    commands.set('groq', {
        category,
        desc: 'Ask Groq AI',
        execute: async (sock, msg, args, config) => {
            if (!args.length) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Usage: ${config.PREFIX}groq <question>` });
            await sock.sendMessage(msg.key.remoteJid, { text: '⚡ Groq thinking...' });
            const response = await queryGroq(args.join(' '));
            await sock.sendMessage(msg.key.remoteJid, { text: response });
        }
    });
}

module.exports = { register };