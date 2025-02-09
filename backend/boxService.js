// boxService.js
const BoxSDK = require('box-node-sdk');

class BoxService {
  constructor() {
    this.sdk = new BoxSDK({
      clientID: process.env.BOX_CLIENT_ID,
      clientSecret: process.env.BOX_CLIENT_SECRET,
      appAuth: {
        keyID: process.env.BOX_KEY_ID,
        privateKey: process.env.BOX_PRIVATE_KEY,
        passphrase: process.env.BOX_PASSPHRASE
      }
    });

    this.client = this.sdk.getAppAuthClient('enterprise');
    this.rootFolderId = process.env.BOX_ROOT_FOLDER_ID;

    // Valid test types
    this.testTypes = {
      COMPREHENSION: 'Comp',
      EFFORT: 'EFF',
      INTELLIGIBILITY: 'Int'
    };
  }

  async getUserFolder(userId) {
    try {
      const folders = await this.client.folders.getItems(this.rootFolderId);
      let userFolder = folders.entries.find(entry =>
        entry.type === 'folder' && entry.name === userId
      );

      if (!userFolder) {
        userFolder = await this.client.folders.create(
          this.rootFolderId,
          userId
        );
      }

      return userFolder;
    } catch (error) {
      console.error(`Error accessing folder for user ${userId}:`, error);
      throw error;
    }
  }

  async getFileStream(userId, filePattern) {
    try {
      const userFolder = await this.getUserFolder(userId);
      const files = await this.client.folders.getItems(userFolder.id);

      const file = files.entries.find(entry =>
        entry.type === 'file' && entry.name.startsWith(`${userId}_${filePattern}`)
      );

      if (!file) {
        throw new Error(`File matching pattern ${filePattern} not found for user ${userId}`);
      }

      return this.client.files.getReadStream(file.id);
    } catch (error) {
      console.error('Box file access error:', error);
      throw error;
    }
  }

  // Get test file (pretest or posttest) with specific test type
  async getTestFile(userId, phase, testType, sentence) {
    if (!Object.values(this.testTypes).includes(testType)) {
      throw new Error(`Invalid test type: ${testType}`);
    }

    const prefix = phase === 'pretest' ? 'Pre' : 'Post';
    const pattern = `${prefix}_${testType}_${String(sentence).padStart(2, '0')}`;
    return this.getFileStream(userId, pattern);
  }

  // Get training file
  async getTrainingFile(userId, day, sentence) {
    const pattern = `Trn_${String(day).padStart(2, '0')}_${String(sentence).padStart(2, '0')}`;
    return this.getFileStream(userId, pattern);
  }

  async fileExists(userId, filePattern) {
    try {
      const files = await this.listUserFiles(userId);
      return files.some(filename => filename.startsWith(`${userId}_${filePattern}`));
    } catch (error) {
      console.error('Box verification error:', error);
      throw error;
    }
  }

  async listUserFiles(userId) {
    try {
      const userFolder = await this.getUserFolder(userId);
      const files = await this.client.folders.getItems(userFolder.id);

      return files.entries
        .filter(entry => entry.type === 'file')
        .map(entry => entry.name);
    } catch (error) {
      console.error(`Error listing files for user ${userId}:`, error);
      throw error;
    }
  }

  // Parse filename to get test information
  parseFileName(filename) {
    const parts = filename.split('_');
    if (parts.length < 2) return null;

    const type = parts[1].toLowerCase();

    // Handle different test types for pre/post tests
    if (type === 'pre' || type === 'post') {
      return {
        phase: type === 'pre' ? 'pretest' : 'posttest',
        testType: parts[2],
        sentence: parseInt(parts[3])
      };
    }

    // Handle training files
    if (type === 'trn') {
      return {
        phase: 'training',
        day: parseInt(parts[2]),
        sentence: parseInt(parts[3])
      };
    }

    return null;
  }

  // Get all files for a specific test type
  async getTestTypeFiles(userId, phase, testType) {
    try {
      const files = await this.listUserFiles(userId);
      const prefix = phase === 'pretest' ? 'Pre' : 'Post';

      return files.filter(filename =>
        filename.startsWith(`${userId}_${prefix}_${testType}_`)
      );
    } catch (error) {
      console.error(`Error getting ${testType} files:`, error);
      throw error;
    }
  }
}

module.exports = new BoxService();