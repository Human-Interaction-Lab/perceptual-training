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

    // Define test types and their filename patterns
    this.testTypes = {
      COMPREHENSION: {
        code: 'Comp',
        hasVersion: true,
        pattern: (username, version, sentence) =>
          `${username}_Comp_${String(version).padStart(2, '0')}_${String(sentence).padStart(2, '0')}`
      },
      EFFORT: {
        code: 'EFF',
        hasVersion: false,
        pattern: (username, _, sentence) =>
          `${username}_EFF${String(sentence).padStart(2, '0')}`
      },
      INTELLIGIBILITY: {
        code: 'Int',
        hasVersion: false,
        pattern: (username, _, sentence) =>
          `${username}_Int${String(sentence).padStart(2, '0')}`
      }
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
        entry.type === 'file' && entry.name === filePattern
      );

      if (!file) {
        throw new Error(`File ${filePattern} not found for user ${userId}`);
      }

      return this.client.files.getReadStream(file.id);
    } catch (error) {
      console.error('Box file access error:', error);
      throw error;
    }
  }

  // Get test file based on type
  async getTestFile(userId, testType, version, sentence) {
    const typeConfig = this.testTypes[testType.toUpperCase()];
    if (!typeConfig) {
      throw new Error(`Invalid test type: ${testType}`);
    }

    if (typeConfig.hasVersion && !version) {
      throw new Error(`Version required for ${testType}`);
    }

    const filename = typeConfig.pattern(userId, version, sentence);
    return this.getFileStream(userId, filename);
  }

  // Get training file
  async getTrainingFile(userId, day, sentence) {
    const pattern = `${userId}_Trn_${String(day).padStart(2, '0')}_${String(sentence).padStart(2, '0')}`;
    return this.getFileStream(userId, pattern);
  }

  async fileExists(userId, filename) {
    try {
      const files = await this.listUserFiles(userId);
      return files.includes(filename);
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

    const username = parts[0];
    const typeIndicator = parts[1];

    // Handle training files
    if (typeIndicator === 'Trn') {
      return {
        username,
        phase: 'training',
        day: parseInt(parts[2]),
        sentence: parseInt(parts[3])
      };
    }

    // Handle comprehension files
    if (typeIndicator === 'Comp') {
      return {
        username,
        type: 'comprehension',
        version: parseInt(parts[2]),
        sentence: parseInt(parts[3])
      };
    }

    // Handle effort and intelligibility files
    if (typeIndicator.startsWith('EFF') || typeIndicator.startsWith('Int')) {
      const type = typeIndicator.substring(0, 3);
      const sentence = parseInt(typeIndicator.substring(3));
      return {
        username,
        type: type === 'EFF' ? 'effort' : 'intelligibility',
        sentence
      };
    }

    return null;
  }

  // Get pattern for a specific test type
  getFilePattern(testType, username, version = null, sentence) {
    const typeConfig = this.testTypes[testType.toUpperCase()];
    if (!typeConfig) {
      throw new Error(`Invalid test type: ${testType}`);
    }

    return typeConfig.pattern(username, version, sentence);
  }
}

module.exports = new BoxService();