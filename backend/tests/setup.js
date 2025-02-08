// tests/setup.js
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Connect to a new in-memory database before running any tests
beforeAll(async () => {
    mongoServer = await MongoMemoryServer.create();
    const mongoUri = mongoServer.getUri();

    await mongoose.connect(mongoUri, {
        useNewUrlParser: true,
        useUnifiedTopology: true
    });
});

// Clear all test data after every test
afterEach(async () => {
    if (mongoose.connection.readyState === 1) {
        const collections = mongoose.connection.collections;
        for (const key in collections) {
            await collections[key].deleteMany();
        }
    }
});

// Remove and close the db and server
afterAll(async () => {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    if (mongoServer) {
        await mongoServer.stop();
    }
});

// Handle test environment cleanup
process.on('SIGTERM', async () => {
    await cleanup();
    process.exit(0);
});

process.on('SIGINT', async () => {
    await cleanup();
    process.exit(0);
});

async function cleanup() {
    if (mongoose.connection.readyState !== 0) {
        await mongoose.disconnect();
    }
    if (mongoServer) {
        await mongoServer.stop();
    }
}