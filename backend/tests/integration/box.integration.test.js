require('dotenv').config();
const fs = require('fs');
const path = require('path');
const BoxService = require('../../boxService');

// Only run these tests when specifically called with BOX_TEST=true
const runBoxTests = process.env.BOX_TEST === 'true';

// Check required environment variables before importing BoxService
const requiredEnvVars = [
    'BOX_CLIENT_ID',
    'BOX_CLIENT_SECRET',
    'BOX_KEY_ID',
    'BOX_PRIVATE_KEY',
    'BOX_PASSPHRASE',
    'BOX_ROOT_FOLDER_ID',
    'BOX_ENTERPRISE_ID'
];

const missingEnvVars = requiredEnvVars.filter(varName => !process.env[varName]);

if (missingEnvVars.length > 0) {
    console.error('\nMissing required environment variables:');
    missingEnvVars.forEach(varName => console.error(`- ${varName}`));
    console.error('\nPlease set these variables in your .env file.\n');
    process.exit(1);
}


// Test configuration
const TEST_CONFIG = {
    speaker: 'Grace Norman',
    testFiles: {
        comprehension: 'Grace Norman_Comp_01_01.wav',
        effort: 'Grace Norman_EFF01.wav',
        intelligibility: 'Grace Norman_Int01.wav',
        training: 'Grace Norman_Trn_02_01.wav'
    },
    outputDir: path.join(__dirname, '../../test-downloads')
};

// Helper function to ensure output directory exists
const setupOutputDir = () => {
    if (!fs.existsSync(TEST_CONFIG.outputDir)) {
        fs.mkdirSync(TEST_CONFIG.outputDir, { recursive: true });
    }
};

// Helper function to stream to file
const streamToFile = async (stream, filename) => {
    return new Promise((resolve, reject) => {
        const writeStream = fs.createWriteStream(path.join(TEST_CONFIG.outputDir, filename));
        stream.pipe(writeStream);
        writeStream.on('finish', resolve);
        writeStream.on('error', reject);
    });
};

describe('Box Integration Tests', () => {
    // Skip all tests unless BOX_TEST=true
    beforeAll(() => {
        if (!runBoxTests) {
            console.log('\nSkipping Box integration tests. To run these tests:');
            console.log('1. Set up your .env file with Box credentials');
            console.log('2. Run: BOX_TEST=true npm test tests/integration/box.integration.test.js\n');
            console.log('Required environment variables:');
            requiredEnvVars.forEach(varName => console.log(`- ${varName}`));
            console.log('');
        } else {
            setupOutputDir();
            console.log('\nRunning Box integration tests...');
            console.log('Files will be downloaded to:', TEST_CONFIG.outputDir, '\n');
        }
    });

    // Cleanup downloaded files after tests
    afterAll(async () => {
        if (runBoxTests && fs.existsSync(TEST_CONFIG.outputDir)) {
            fs.readdir(TEST_CONFIG.outputDir, (err, files) => {
                if (err) throw err;
                for (const file of files) {
                    fs.unlinkSync(path.join(TEST_CONFIG.outputDir, file));
                }
                fs.rmdirSync(TEST_CONFIG.outputDir);
            });
        }
    });

    describe('Box Connection', () => {
        it('should connect to Box and get user folder', async () => {
            if (!runBoxTests) return;

            const folder = await BoxService.getUserFolder(TEST_CONFIG.speaker);
            expect(folder).toBeDefined();
            expect(folder.id).toBeDefined();
            console.log('Successfully connected to Box and found user folder:', folder.id);
        }, 30000);

        it('should list files in user folder', async () => {
            if (!runBoxTests) return;

            const files = await BoxService.listUserFiles(TEST_CONFIG.speaker);
            expect(Array.isArray(files)).toBe(true);
            expect(files.length).toBeGreaterThan(0);
            console.log('Found files:', files);
        }, 30000);
    });

    describe('Box Folder Exploration', () => {
        it('should explore the root folder structure', async () => {
            if (!runBoxTests) return;

            console.log('\n======= BOX FOLDER STRUCTURE EXPLORATION =======');

            // First explore the root folder
            const rootContents = await BoxService.listFolderContents();

            // Then find the speaker's folder
            const speakerFolder = rootContents.subfolders.find(
                folder => folder.name === TEST_CONFIG.speaker
            );

            if (speakerFolder) {
                // Explore the speaker's folder
                console.log(`\nFound ${TEST_CONFIG.speaker} folder. Exploring contents...`);
                await BoxService.listFolderContents(speakerFolder.id);
            } else {
                console.log(`\nWarning: Could not find folder for ${TEST_CONFIG.speaker}`);
                console.log('Available subfolders:', rootContents.subfolders.map(f => f.name).join(', '));
            }

            console.log('\n======= END OF FOLDER EXPLORATION =======\n');

            // This is just for exploration, so we don't need assertions
            expect(true).toBe(true);
        }, 30000);
    });

    describe('File Streaming', () => {
        it('should stream and save comprehension file', async () => {
            if (!runBoxTests) return;

            const stream = await BoxService.getTestFile(TEST_CONFIG.speaker, 'COMPREHENSION', 1, 1);
            await streamToFile(stream, TEST_CONFIG.testFiles.comprehension);

            const filePath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.testFiles.comprehension);
            expect(fs.existsSync(filePath)).toBe(true);

            const stats = fs.statSync(filePath);
            expect(stats.size).toBeGreaterThan(0);
            console.log('Downloaded comprehension file:', TEST_CONFIG.testFiles.comprehension);
        }, 30000);

        it('should stream and save effort file', async () => {
            if (!runBoxTests) return;

            const stream = await BoxService.getTestFile(TEST_CONFIG.speaker, 'EFFORT', null, 1);
            await streamToFile(stream, TEST_CONFIG.testFiles.effort);

            const filePath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.testFiles.effort);
            expect(fs.existsSync(filePath)).toBe(true);

            const stats = fs.statSync(filePath);
            expect(stats.size).toBeGreaterThan(0);
            console.log('Downloaded effort file:', TEST_CONFIG.testFiles.effort);
        }, 30000);

        it('should stream and save intelligibility file', async () => {
            if (!runBoxTests) return;

            const stream = await BoxService.getTestFile(TEST_CONFIG.speaker, 'INTELLIGIBILITY', null, 1);
            await streamToFile(stream, TEST_CONFIG.testFiles.intelligibility);

            const filePath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.testFiles.intelligibility);
            expect(fs.existsSync(filePath)).toBe(true);

            const stats = fs.statSync(filePath);
            expect(stats.size).toBeGreaterThan(0);
            console.log('Downloaded intelligibility file:', TEST_CONFIG.testFiles.intelligibility);
        }, 30000);

        it('should stream and save training file', async () => {
            if (!runBoxTests) return;

            try {
                console.log('Looking for file pattern:',
                    `${TEST_CONFIG.speaker}_Trn_${String(2).padStart(2, '0')}_${String(1).padStart(2, '0')}.wav`);

                // First try to list files to see what's available
                const files = await BoxService.listUserFiles(TEST_CONFIG.speaker);
                console.log('Available files:', files);

                const stream = await BoxService.getTrainingFile(TEST_CONFIG.speaker, 2, 1);
                await streamToFile(stream, TEST_CONFIG.testFiles.training);

                const filePath = path.join(TEST_CONFIG.outputDir, TEST_CONFIG.testFiles.training);
                expect(fs.existsSync(filePath)).toBe(true);

                const stats = fs.statSync(filePath);
                expect(stats.size).toBeGreaterThan(0);
                console.log('Downloaded training file:', TEST_CONFIG.testFiles.training);
            } catch (error) {
                console.error('Error details:', error);
                throw error;
            }
        }, 30000);
    });
});
