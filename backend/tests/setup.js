const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');

let mongoServer;

// Increase timeout for the entire test suite
jest.setTimeout(60000);

beforeAll(async () => {
    try {
        // Create MongoDB Memory Server
        mongoServer = await MongoMemoryServer.create({
            binary: {
                version: '6.0.4'  // Specify a stable version
            }
        });

        const mongoUri = mongoServer.getUri();

        // Configure Mongoose
        const mongooseOpts = {
            useNewUrlParser: true,
            useUnifiedTopology: true,
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
            family: 4  // Use IPv4, skip trying IPv6
        };

        // Connect to the in-memory database
        await mongoose.connect(mongoUri, mongooseOpts);

        // Verify connection
        await mongoose.connection.db.admin().ping();
        console.log('Successfully connected to MongoDB Memory Server');

    } catch (err) {
        console.error('MongoDB Memory Server setup failed:', err);
        throw err;
    }
});

beforeEach(async () => {
    if (mongoose.connection.readyState !== 1) {
        throw new Error('MongoDB connection is not ready');
    }

    try {
        // Get all collections
        const collections = mongoose.connection.collections;

        // Clear all collections in parallel
        await Promise.all(
            Object.values(collections).map(collection =>
                collection.deleteMany({})
            )
        );
    } catch (err) {
        console.error('Error clearing collections:', err);
        throw err;
    }
});

afterAll(async () => {
    try {
        // Close Mongoose connection
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }

        // Stop MongoDB Memory Server
        if (mongoServer) {
            await mongoServer.stop({ doCleanup: true });
        }
    } catch (err) {
        console.error('Cleanup failed:', err);
        throw err;
    }
});