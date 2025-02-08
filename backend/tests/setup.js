// tests/setup.js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// This ensures the database is connected before any tests run
beforeAll(async () => {
    console.log('Setting up test database connection...');

    try {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();

        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });

        // Verify connection
        await mongoose.connection.db.admin().ping();
        console.log('Successfully connected to MongoDB Memory Server');
        console.log('Connection State:', mongoose.connection.readyState);

    } catch (err) {
        console.error('Failed to connect to test database:', err);
        throw err;
    }
});

afterEach(async () => {
    if (mongoose.connection.readyState === 1) {
        const collections = mongoose.connection.collections;
        await Promise.all(
            Object.values(collections).map(collection =>
                collection.deleteMany({})
            )
        );
    }
});

afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    if (mongoServer) {
        await mongoServer.stop();
    }
});

// Export the connection for test files to use
module.exports = { mongoose };