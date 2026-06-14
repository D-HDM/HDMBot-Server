const axios = require('axios');
const state = require('../state');

async function queryHDMAI(prompt) {
    try {
        const url = process.env.HDM_AI_API_URL || 'https://hdm-ai-server.onrender.com/api/v1/general/chat/public';
        const key = process.env.HDM_AI_API_KEY || 'hdm_gen_94b1a42c30805c31852105c287a5812272857a0af82e1e58';
        const { data } = await axios.post(url, { message: prompt, system_prompt: 'You are HDM BOT, a helpful WhatsApp assistant. Be concise.', interface: 'client' }, { headers: { 'x-api-key': key }, timeout: 60000 });
        return data?.data?.reply || `❌ HDM AI: ${data?.message || 'Unknown'}`;
    } catch (e) { return `❌ HDM AI: ${e.message}`; }
}

async function queryDeepSeek(prompt) {
    try {
        const key = process.env.DEEPSEEK_API_KEY;
        if (!key) return '❌ DeepSeek API key not set.';
        const { data } = await axios.post('https://api.deepseek.com/v1/chat/completions', { model: 'deepseek-chat', messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 1000 }, { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 30000 });
        return data.choices[0].message.content;
    } catch (e) { return `❌ DeepSeek: ${e.message}`; }
}

async function queryGemini(prompt) {
    try {
        const key = process.env.GEMINI_API_KEY;
        if (!key) return '❌ Gemini API key not set.';
        const { data } = await axios.post(`https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent?key=${key}`, { contents: [{ parts: [{ text: prompt }] }] }, { timeout: 30000 });
        return data.candidates[0].content.parts[0].text;
    } catch (e) { return `❌ Gemini: ${e.message}`; }
}

async function queryChatGPT(prompt) {
    try {
        const key = process.env.OPENAI_API_KEY;
        if (!key) return '❌ ChatGPT API key not set.';
        const { data } = await axios.post('https://api.openai.com/v1/chat/completions', { model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 1000 }, { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 30000 });
        return data.choices[0].message.content;
    } catch (e) { return `❌ ChatGPT: ${e.message}`; }
}

async function queryGrok(prompt) {
    try {
        const key = process.env.GROK_API_KEY;
        if (!key) return '❌ Grok API key not set.';
        const { data } = await axios.post('https://api.x.ai/v1/chat/completions', { model: 'grok-2-latest', messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 1000 }, { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 30000 });
        return data.choices[0].message.content;
    } catch (e) { return `❌ Grok: ${e.message}`; }
}

async function queryGroq(prompt) {
    try {
        const key = process.env.GROQ_API_KEY;
        if (!key) return '❌ Groq API key not set.';
        const { data } = await axios.post('https://api.groq.com/openai/v1/chat/completions', { model: 'llama-3.3-70b-versatile', messages: [{ role: 'user', content: prompt }], temperature: 0.7, max_tokens: 1000 }, { headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' }, timeout: 30000 });
        return data.choices[0].message.content;
    } catch (e) { return `❌ Groq: ${e.message}`; }
}

function register(commands, categories, category) {
    commands.set('ai', {
        category,
        desc: 'Ask AI (default model)',
        execute: async (sock, msg, args, config) => {
            if (!args.length) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Usage: ${config.PREFIX}ai <question>` });
            await sock.sendMessage(msg.key.remoteJid, { text: '🤖 Thinking...' });
            const defaultAI = state.getGlobalSetting('defaultAI', 'hdmai');
            let response;
            switch (defaultAI) {
                case 'deepseek': response = await queryDeepSeek(args.join(' ')); break;
                case 'gemini': response = await queryGemini(args.join(' ')); break;
                case 'chatgpt': response = await queryChatGPT(args.join(' ')); break;
                case 'grok': response = await queryGrok(args.join(' ')); break;
                case 'groq': response = await queryGroq(args.join(' ')); break;
                default: response = await queryHDMAI(args.join(' '));
            }
            await sock.sendMessage(msg.key.remoteJid, { text: response });
        }
    });

    commands.set('hdmai', {
        category,
        desc: 'Ask HDM AI',
        execute: async (sock, msg, args, config) => {
            if (!args.length) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Usage: ${config.PREFIX}hdmai <question>` });
            await sock.sendMessage(msg.key.remoteJid, { text: '🤖 HDM AI thinking...' });
            await sock.sendMessage(msg.key.remoteJid, { text: await queryHDMAI(args.join(' ')) });
        }
    });

    commands.set('deepseek', {
        category,
        desc: 'Ask DeepSeek AI',
        execute: async (sock, msg, args, config) => {
            if (!args.length) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Usage: ${config.PREFIX}deepseek <question>` });
            await sock.sendMessage(msg.key.remoteJid, { text: '🤖 DeepSeek thinking...' });
            await sock.sendMessage(msg.key.remoteJid, { text: await queryDeepSeek(args.join(' ')) });
        }
    });

    commands.set('gemini', {
        category,
        desc: 'Ask Gemini AI',
        execute: async (sock, msg, args, config) => {
            if (!args.length) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Usage: ${config.PREFIX}gemini <question>` });
            await sock.sendMessage(msg.key.remoteJid, { text: '🧠 Gemini thinking...' });
            await sock.sendMessage(msg.key.remoteJid, { text: await queryGemini(args.join(' ')) });
        }
    });

    commands.set('chatgpt', {
        category,
        desc: 'Ask ChatGPT',
        execute: async (sock, msg, args, config) => {
            if (!args.length) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Usage: ${config.PREFIX}chatgpt <question>` });
            await sock.sendMessage(msg.key.remoteJid, { text: '💬 ChatGPT thinking...' });
            await sock.sendMessage(msg.key.remoteJid, { text: await queryChatGPT(args.join(' ')) });
        }
    });

    commands.set('grok', {
        category,
        desc: 'Ask Grok AI',
        execute: async (sock, msg, args, config) => {
            if (!args.length) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Usage: ${config.PREFIX}grok <question>` });
            await sock.sendMessage(msg.key.remoteJid, { text: '🚀 Grok thinking...' });
            await sock.sendMessage(msg.key.remoteJid, { text: await queryGrok(args.join(' ')) });
        }
    });

    commands.set('groq', {
        category,
        desc: 'Ask Groq AI',
        execute: async (sock, msg, args, config) => {
            if (!args.length) return await sock.sendMessage(msg.key.remoteJid, { text: `❌ Usage: ${config.PREFIX}groq <question>` });
            await sock.sendMessage(msg.key.remoteJid, { text: '⚡ Groq thinking...' });
            await sock.sendMessage(msg.key.remoteJid, { text: await queryGroq(args.join(' ')) });
        }
    });
}

module.exports = { register };