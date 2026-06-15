require('../scripts/dnsSet');
require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });

const mongoose = require('mongoose');
const readline = require('readline');
const User = require('../models/User');
const Session = require('../models/session');
const Rule = require('../models/Rule');
const Command = require('../models/Command');
const Message = require('../models/Message');
const Contact = require('../models/Contact');
const env = require('../config/env');

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/hdm-bot';

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bold: '\x1b[1m'
};

function log(msg, color = 'white') {
    console.log(`${colors[color]}${msg}${colors.reset}`);
}

function divider() {
    console.log('─'.repeat(50));
}

async function connect() {
    try {
        await mongoose.connect(MONGODB_URI);
        return true;
    } catch (error) {
        log(`Connection failed: ${error.message}`, 'red');
        return false;
    }
}

function ask(question) {
    return new Promise(resolve => {
        rl.question(`${colors.cyan}${question}${colors.reset}`, answer => {
            resolve(answer.trim());
        });
    });
}

// ==================== AUTH ADMIN (Login Users) ====================

async function createAuthUser() {
    log('\n➕ Create Login User (for React Frontend)', 'cyan');
    divider();
    
    log('This creates a user that can login to the web dashboard.', 'yellow');
    log('These are NOT WhatsApp bot admins.\n', 'yellow');
    
    const username = await ask('Username: ');
    if (!username) return log('Username required. Cancelled.', 'red');
    
    const email = await ask('Email: ');
    if (!email) return log('Email required. Cancelled.', 'red');
    
    const password = await ask('Password (min 6 chars): ');
    if (!password || password.length < 6) return log('Password must be 6+ characters. Cancelled.', 'red');
    
    const role = await ask('Role (admin/user) [admin]: ') || 'admin';
    if (!['admin', 'user'].includes(role)) return log('Role must be admin or user. Cancelled.', 'red');

    try {
        const user = await User.create({ username, email, password, role });
        log(`\n✅ Login user created!`, 'green');
        log(`   Username: ${user.username}`, 'white');
        log(`   Email: ${user.email}`, 'white');
        log(`   Role: ${user.role}`, 'white');
        log(`\n   Login at: /api/auth/login`, 'cyan');
    } catch (error) {
        if (error.code === 11000) {
            log(`\n❌ User with that email or username already exists`, 'red');
        } else {
            log(`\n❌ Error: ${error.message}`, 'red');
        }
    }
}

async function listAuthUsers() {
    log('\n👥 Login Users (React Frontend)', 'cyan');
    divider();
    
    try {
        const users = await User.find({}).sort({ createdAt: -1 });
        if (users.length === 0) {
            log('No login users found. Create one first!', 'yellow');
            return;
        }
        
        users.forEach((u, i) => {
            const status = u.isActive ? '🟢' : '🔴';
            const lastLogin = u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : 'Never';
            log(`  ${i + 1}. ${status} ${u.username} | ${u.role} | ${u.email} | Last: ${lastLogin}`, 'white');
        });
        log(`\nTotal: ${users.length} users`, 'green');
    } catch (error) {
        log(`Error: ${error.message}`, 'red');
    }
}

async function deleteAuthUser() {
    log('\n🗑️ Delete Login User', 'cyan');
    divider();
    
    const users = await User.find({}).sort({ createdAt: -1 });
    if (users.length === 0) return log('No users to delete', 'yellow');
    
    users.forEach((u, i) => log(`  ${i + 1}. ${u.username} (${u.role}) - ${u.email}`, 'white'));
    
    const num = await ask('\nNumber to delete (0 to cancel): ');
    const index = parseInt(num) - 1;
    
    if (index === -1) return log('Cancelled', 'yellow');
    if (index < 0 || index >= users.length) return log('Invalid selection', 'red');
    
    const user = users[index];
    const confirm = await ask(`Delete "${user.username}"? Type username to confirm: `);
    
    if (confirm === user.username) {
        await User.findByIdAndDelete(user._id);
        log(`✅ ${user.username} deleted`, 'green');
    } else {
        log('Cancelled', 'yellow');
    }
}

async function toggleAuthUser() {
    log('\n🔒 Toggle User Status', 'cyan');
    divider();
    
    const users = await User.find({}).sort({ createdAt: -1 });
    if (users.length === 0) return log('No users found', 'yellow');
    
    users.forEach((u, i) => {
        const status = u.isActive ? '🟢 Active' : '🔴 Disabled';
        log(`  ${i + 1}. ${u.username} - ${status}`, 'white');
    });
    
    const num = await ask('\nNumber to toggle (0 to cancel): ');
    const index = parseInt(num) - 1;
    
    if (index === -1) return log('Cancelled', 'yellow');
    if (index < 0 || index >= users.length) return log('Invalid selection', 'red');
    
    const user = users[index];
    user.isActive = !user.isActive;
    await user.save();
    
    log(`✅ ${user.username} is now ${user.isActive ? 'active' : 'disabled'}`, 'green');
}

// ==================== SESSION MANAGEMENT ====================

async function listSessions() {
    log('\n📱 WhatsApp Sessions', 'cyan');
    divider();
    
    try {
        const sessions = await Session.find({}).sort({ updatedAt: -1 });
        if (sessions.length === 0) {
            log('No sessions found', 'yellow');
            return;
        }
        
        sessions.forEach((s, i) => {
            const status = s.status === 'active' ? '🟢' : '🔴';
            log(`  ${i + 1}. ${status} ${s.sessionId} | 📱 ${s.metadata?.phoneNumber || 'N/A'} | ${s.metadata?.botName || ''}`, 'white');
        });
        log(`\nTotal: ${sessions.length} sessions`, 'green');
    } catch (error) {
        log(`Error: ${error.message}`, 'red');
    }
}

async function dropSessions() {
    log('\n⚠️  DROP ALL SESSIONS', 'red');
    divider();
    log('This will delete ALL WhatsApp session data!', 'yellow');
    
    const confirm = await ask('Type "DELETE SESSIONS" to confirm: ');
    
    if (confirm === 'DELETE SESSIONS') {
        const result = await Session.deleteMany({});
        log(`✅ Deleted ${result.deletedCount} sessions`, 'green');
    } else {
        log('Cancelled', 'yellow');
    }
}

// ==================== DATABASE MANAGEMENT ====================

async function listCollections() {
    log('\n📚 Database Collections', 'cyan');
    divider();
    
    try {
        const collections = await mongoose.connection.db.listCollections().toArray();
        
        if (collections.length === 0) {
            log('No collections found', 'yellow');
            return;
        }
        
        let total = 0;
        for (const col of collections) {
            const count = await mongoose.connection.db.collection(col.name).countDocuments();
            log(`  📁 ${col.name.padEnd(20)} ${String(count).padStart(6)} documents`, 'white');
            total += count;
        }
        divider();
        log(`  Collections: ${collections.length} | Total Documents: ${total}`, 'green');
    } catch (error) {
        log(`Error: ${error.message}`, 'red');
    }
}

async function dropCollections() {
    log('\n⚠️  DROP COLLECTIONS', 'red');
    divider();
    
    const collections = await mongoose.connection.db.listCollections().toArray();
    log('Available collections:', 'yellow');
    collections.forEach(c => log(`  📁 ${c.name}`, 'white'));
    
    const name = await ask('\nCollection name (or "ALL" for all): ');
    
    if (name === 'ALL') {
        const confirm = await ask('Type "DELETE ALL COLLECTIONS" to confirm: ');
        if (confirm !== 'DELETE ALL COLLECTIONS') return log('Cancelled', 'yellow');
        
        for (const col of collections) {
            await mongoose.connection.db.collection(col.name).drop().catch(() => {});
        }
        log('✅ All collections dropped', 'green');
    } else {
        const confirm = await ask(`Drop "${name}"? Type "DROP ${name}" to confirm: `);
        if (confirm === `DROP ${name}`) {
            await mongoose.connection.db.collection(name).drop().catch(() => {});
            log(`✅ ${name} dropped`, 'green');
        } else {
            log('Cancelled', 'yellow');
        }
    }
}

async function dropDatabase() {
    log('\n💀 DROP ENTIRE DATABASE', 'red');
    divider();
    log('⚠️  THIS WILL DELETE EVERYTHING! ⚠️', 'red');
    log(`Database: ${mongoose.connection.db.databaseName}`, 'yellow');
    log('');
    
    const step1 = await ask('Step 1/3 - Type "I UNDERSTAND": ');
    if (step1 !== 'I UNDERSTAND') return log('Cancelled', 'yellow');
    
    const step2 = await ask(`Step 2/3 - Type database name "${mongoose.connection.db.databaseName}": `);
    if (step2 !== mongoose.connection.db.databaseName) return log('Name mismatch. Cancelled', 'red');
    
    const step3 = await ask('Step 3/3 - Type "DROP DATABASE NOW": ');
    if (step3 !== 'DROP DATABASE NOW') return log('Cancelled', 'yellow');
    
    try {
        await mongoose.connection.db.dropDatabase();
        log('✅ Database dropped successfully', 'green');
        log('⚠️  Restart the server to reconnect.', 'yellow');
    } catch (error) {
        log(`Error: ${error.message}`, 'red');
    }
}

// ==================== MENU ====================

function showMenu() {
    console.log('');
    log('╔══════════════════════════════════════╗', 'magenta');
    log('║     HDM BOT - Admin CLI Tool         ║', 'magenta');
    log('╠══════════════════════════════════════╣', 'magenta');
    log('║  👤 LOGIN USERS (React Frontend)     ║', 'magenta');
    log('║  1. ➕ Create Login User             ║', 'green');
    log('║  2. 👥 List Login Users              ║', 'white');
    log('║  3. 🔒 Toggle User Active/Disabled   ║', 'white');
    log('║  4. 🗑️  Delete Login User            ║', 'red');
    log('╠══════════════════════════════════════╣', 'magenta');
    log('║  📱 WHATSAPP SESSIONS                ║', 'magenta');
    log('║  5. 📱 List Sessions                 ║', 'white');
    log('║  6. 💣 Drop All Sessions             ║', 'red');
    log('╠══════════════════════════════════════╣', 'magenta');
    log('║  🗄️  DATABASE                        ║', 'magenta');
    log('║  7. 📚 List Collections              ║', 'white');
    log('║  8. 🗑️  Drop Collections             ║', 'red');
    log('║  9. 💀 Drop Entire Database          ║', 'red');
    log('╠══════════════════════════════════════╣', 'magenta');
    log('║  0. 🚪 Exit                          ║', 'white');
    log('╚══════════════════════════════════════╝', 'magenta');
}

async function main() {
    log('\n🔌 Connecting to MongoDB...', 'yellow');
    const connected = await connect();
    
    if (!connected) {
        log('Failed to connect. Check MongoDB URI in .env', 'red');
        process.exit(1);
    }
    
    log(`✅ Connected: ${mongoose.connection.db.databaseName}`, 'green');
    
    let running = true;
    
    while (running) {
        showMenu();
        const choice = await ask('\nSelect option: ');
        
        switch (choice) {
            // Login Users
            case '1': await createAuthUser(); break;
            case '2': await listAuthUsers(); break;
            case '3': await toggleAuthUser(); break;
            case '4': await deleteAuthUser(); break;
            // Sessions
            case '5': await listSessions(); break;
            case '6': await dropSessions(); break;
            // Database
            case '7': await listCollections(); break;
            case '8': await dropCollections(); break;
            case '9': await dropDatabase(); break;
            // Exit
            case '0':
                running = false;
                log('\n👋 Goodbye!', 'green');
                break;
            default:
                log('Invalid option', 'red');
        }
        
        if (running) {
            await ask('\nPress Enter to continue...');
        }
    }
    
    await mongoose.disconnect();
    rl.close();
    process.exit(0);
}

main().catch(error => {
    log(`Fatal error: ${error.message}`, 'red');
    process.exit(1);
});