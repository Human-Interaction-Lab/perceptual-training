const { MongoMemoryServer } = require('mongodb-memory-server');
const mongoose = require('mongoose');

let mongod;

beforeAll(async () => {
    console.log('Setting up test database connection...');
    mongod = await MongoMemoryServer.create();
    const uri = mongod.getUri();

    await mongoose.connect(uri);
    console.log('Successfully connected to MongoDB Memory Server');
});

afterAll(async () => {
    await mongoose.disconnect();
    await mongod.stop();
});

// Export mongoose for use in tests
module.exports = { mongoose };