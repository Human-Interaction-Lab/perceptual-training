// tests/__mocks__/boxService.js
class MockBoxService {
    constructor() {
        this.testTypes = {
            COMPREHENSION: 'COMPREHENSION',
            EFFORT: 'EFFORT',
            INTELLIGIBILITY: 'INTELLIGIBILITY'
        };
    }

    async getUserFolder(userId) {
        return { id: 'mock-folder-id', name: userId };
    }

    async getFileStream(userId, filePattern) {
        const { Readable } = require('stream');
        return new Readable({
            read() {
                this.push(Buffer.from('mock audio data'));
                this.push(null);
            }
        });
    }

    async getTestFile(userId, testType, version, sentence) {
        return this.getFileStream(userId, 'mock_file.wav');
    }

    async getTrainingFile(userId, day, sentence) {
        return this.getFileStream(userId, 'mock_training.wav');
    }

    async fileExists(userId, filename) {
        return true;
    }

    async listUserFiles(userId) {
        return [
            'mock_comp_01_01.wav',
            'mock_eff_01.wav',
            'mock_int_01.wav'
        ];
    }
}

module.exports = new MockBoxService();