const mongoose = require('mongoose');
const env = require('./env');

const connectDB = async () => {
    const uri = env.MONGODB_URI;

    if (!uri || uri === '') {
        console.log('📁 No MongoDB URI - using local file storage');
        return null;
    }

    try {
        const conn = await mongoose.connect(uri, {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        });

        const dbName = conn.connection.db.databaseName;
        const host = conn.connection.host;
        const isAtlas = host.includes('mongodb.net') || host.includes('mongodb.net');
        const hostType = isAtlas ? '☁️ MongoDB Atlas' : '💻 Localhost';

        console.log(`📦 MongoDB Connected`);
        console.log(`   🗄️  Database: ${dbName}`);
        console.log(`   🖥️  Host: ${hostType} (${host})`);
        console.log(`   📊 Pool Size: 10`);

        // Handle connection events
        mongoose.connection.on('error', (err) => {
            console.error(`❌ MongoDB Error: ${err.message}`);
        });

        mongoose.connection.on('disconnected', () => {
            console.warn('⚠️  MongoDB Disconnected');
        });

        mongoose.connection.on('reconnected', () => {
            console.log('🔄 MongoDB Reconnected');
        });

        return conn;
    } catch (error) {
        console.error(`❌ MongoDB Connection Failed: ${error.message}`);
        console.log('📁 Falling back to local file storage');
        return null;
    }
};

module.exports = connectDB;