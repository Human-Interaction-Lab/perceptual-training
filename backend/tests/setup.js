const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

beforeAll(async () => {
    jest.setTimeout(60000); // Increase timeout to 60 seconds

    try {
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();

        // Make the URI available globally for other test files
        global.__MONGO_URI__ = mongoUri;

        await mongoose.connect(mongoUri, {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
    } catch (err) {
        console.error('Error in test setup:', err);
        throw err; // Rethrow to fail tests if setup fails
    }
});

afterEach(async () => {
    try {
        if (mongoose.connection.readyState === 1) {
            await Promise.all(
                Object.values(mongoose.connection.collections).map(collection =>
                    collection.deleteMany({})
                )
            );
        }
    } catch (err) {
        console.error('Error cleaning up test data:', err);
        throw err;
    }
});

afterAll(async () => {
    try {
        await mongoose.disconnect();
        if (mongoServer) {
            await mongoServer.stop();
        }
    } catch (err) {
        console.error('Error cleaning up test server:', err);
        throw err;
    }
});