// src/services/audioService.js
import { getGroupForPhase } from '../utils/randomization';
const BASE_URL = 'http://localhost:3000';

// Centralized audio service for handling audio interactions with the backend
const audioService = {

    /**
    * A method to map file number to actual file ID
    * @param {string} phase - 'pretest', 'training', 'posttest', etc.
    * @param {string} testType - the test
    * @param {string} version - version of file
    * @param {string} index - index of file between 1 - 20
    * @param {string} userId - userId
    * @returns {Promise<void>}
    */
    async playRandomizedTestAudio(phase, testType, version, index, userId = null) {
        try {
            // Get the userId from localStorage if not provided
            if (!userId) {
                const token = localStorage.getItem('token');
                const tokenParts = token.split('.');
                if (tokenParts.length === 3) {
                    const payload = JSON.parse(atob(tokenParts[1]));
                    userId = payload.userId;
                }
            }

            // Get randomized file numbers for this phase
            const groupFiles = getGroupForPhase(phase, null, userId);

            // Map the sequential index (1-20) to the actual file number
            const actualFileNumber = groupFiles[index - 1];

            console.log(`Playing randomized ${testType} audio: ${phase}/${version}/${index} -> File #${actualFileNumber}`);

            // Call the regular playTestAudio with the mapped file number
            return await this.playTestAudio(phase, testType, version, actualFileNumber);
        } catch (error) {
            console.error('Error playing randomized test audio:', error);
            throw error;
        }
    },

    /**
    * Also add a method for randomized training test audio
    * @param {string} day - day of training
    * @param {string} index - index between 1 and 20
    * @param {string} userId - userId
    * @returns {Promise<void>}
    */
    async playRandomizedTrainingAudio(day, index, userId = null) {
        try {
            // Get the userId from localStorage if not provided
            if (!userId) {
                const token = localStorage.getItem('token');
                const tokenParts = token.split('.');
                if (tokenParts.length === 3) {
                    const payload = JSON.parse(atob(tokenParts[1]));
                    userId = payload.userId;
                }
            }

            // Get randomized file numbers for training day
            const groupFiles = getGroupForPhase('training', day, userId);

            // Map the sequential index to the actual file number
            const actualFileNumber = groupFiles[index - 1];

            console.log(`Playing randomized training audio: Day ${day}/${index} -> File #${actualFileNumber}`);

            // Call the regular playTrainingAudio with the mapped file number
            return await this.playTrainingAudio(day, actualFileNumber);
        } catch (error) {
            console.error('Error playing randomized training audio:', error);
            throw error;
        }
    },

    /**
     * A method to preload randomized audio files
     * @param {string} phase - 'pretest' or 'posttest'
     * @param {string} trainingDay - day of training if applicable
     * @param {string} activeTestTypes - active testTypes to know which files are relevant
     * @returns {success: true, count: successful, failed: failed}
     */
    async preloadRandomizedAudioFiles(phase, trainingDay = null, activeTestTypes = null) {
        try {
            const userId = this.extractUserIdFromToken();

            // Get the randomized file indices for this phase/day
            let filesToPreload = [];

            if (phase === 'training' && trainingDay) {
                // For training, get the group for this day
                const groupFiles = getGroupForPhase('training', trainingDay, userId);

                // Create array of training file info objects
                filesToPreload = groupFiles.map(fileIndex => ({
                    phase: 'training',
                    day: trainingDay,
                    actualFile: fileIndex
                }));
            }
            else if (phase === 'pretest' || phase.startsWith('posttest')) {
                // For test phases, handle intelligibility tests
                if (!activeTestTypes || activeTestTypes.includes('intelligibility')) {
                    const groupFiles = getGroupForPhase(phase, null, userId);

                    // Create array of intelligibility file info
                    const intelligibilityFiles = groupFiles.map(fileIndex => ({
                        phase,
                        testType: 'intelligibility',
                        actualFile: fileIndex
                    }));

                    filesToPreload.push(...intelligibilityFiles);
                }

                // For comprehension, preload the assigned stories
                if (!activeTestTypes || activeTestTypes.includes('comprehension')) {
                    const assignedStories = getStoriesForPhase(phase, userId);

                    // Create array of comprehension story files (each story has 10 files)
                    const comprehensionFiles = [];

                    assignedStories.forEach(storyId => {
                        const storyNum = storyId.replace('Comp_', '');
                        for (let i = 1; i <= 10; i++) {
                            comprehensionFiles.push({
                                phase,
                                testType: 'comprehension',
                                version: storyNum,
                                sentence: i
                            });
                        }
                    });

                    filesToPreload.push(...comprehensionFiles);
                }

                // Keep effort test preloading sequential for now
                if (!activeTestTypes || activeTestTypes.includes('effort')) {
                    // Create sequential effort files (not randomized yet)
                    const effortFiles = Array.from({ length: 30 }, (_, i) => ({
                        phase,
                        testType: 'effort',
                        actualFile: i + 1
                    }));

                    filesToPreload.push(...effortFiles);
                }
            }

            console.log(`Preloading ${filesToPreload.length} randomized files for ${phase}`);

            // Now preload all the files we identified
            const preloadPromises = filesToPreload.map(async fileInfo => {
                try {
                    // Determine which API endpoint to use based on the file type
                    let url;

                    if (fileInfo.phase === 'training') {
                        url = `${BASE_URL}/audio/training/day/${fileInfo.day}/${fileInfo.actualFile}`;
                    } else if (fileInfo.testType === 'comprehension') {
                        url = `${BASE_URL}/audio/${fileInfo.phase}/${fileInfo.testType}/${fileInfo.version}/${fileInfo.sentence}`;
                    } else {
                        url = `${BASE_URL}/audio/${fileInfo.phase}/${fileInfo.testType}/null/${fileInfo.actualFile}`;
                    }

                    // Request the file
                    const response = await fetch(url, {
                        headers: {
                            'Authorization': `Bearer ${localStorage.getItem('token')}`
                        }
                    });

                    if (!response.ok) {
                        console.warn(`Failed to preload file: ${url}`);
                        return null;
                    }

                    const data = await response.json();
                    return data;
                } catch (error) {
                    console.warn(`Error preloading file:`, fileInfo, error);
                    return null;
                }
            });

            // Wait for all preloading to complete
            const results = await Promise.allSettled(preloadPromises);

            const successful = results.filter(r => r.status === 'fulfilled' && r.value).length;
            const failed = results.length - successful;

            console.log(`Preloaded ${successful} files successfully, ${failed} failed`);

            return {
                success: true,
                count: successful,
                failed: failed
            };
        } catch (error) {
            console.error('Error in randomized preloading:', error);
            return { success: false, error: error.message };
        }
    },

    // Helper to extract userId from token
    extractUserIdFromToken() {
        const token = localStorage.getItem('token');
        if (!token) return null;

        try {
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
                const payload = JSON.parse(atob(tokenParts[1]));
                return payload.userId;
            }
        } catch (e) {
            console.error('Error extracting userId from token:', e);
        }

        return null;
    },


    /**
     * Play audio for test phases (pretest and posttest)
     * @param {string} phase - 'pretest' or 'posttest'
     * @param {string} testType - 'intelligibility', 'effort', or 'comprehension'
     * @param {number|string} version - Version/story number for comprehension tests
     * @param {number|string} sentence - Sentence number
     * @returns {Promise<void>}
     */
    async playTestAudio(phase, testType, version, sentence) {
        console.log('playTestAudio called with:', { phase, testType, version, sentence });

        try {
            // Request the audio file URL from the backend
            const response = await fetch(
                `${BASE_URL}/audio/${phase}/${testType}/${version}/${sentence}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );

            if (!response.ok) {
                const error = await response.json();
                // Specifically check for 404 "not found" errors
                if (response.status === 404) {
                    throw new Error('AUDIO_NOT_FOUND');
                }
                throw new Error(error.error || 'Failed to get audio file');
            }

            const data = await response.json();

            // Play the audio file
            await this.playAudioFromUrl(`${BASE_URL}${data.url}`);

            // Notify backend that file was played
            await this.notifyAudioPlayed(data.filename);

            return true;
        } catch (error) {
            console.error('Error playing test audio:', error);
            throw error;
        }
    },

    /**
     * Play audio for training sessions
     * @param {number|string} day - Training day (1-4)
     * @param {number|string} sentence - Sentence number
     * @returns {Promise<void>}
     */
    async playTrainingAudio(day, sentence) {
        try {
            // Request the audio file URL from the backend
            const response = await fetch(
                `${BASE_URL}/audio/training/day/${day}/${sentence}`,
                {
                    headers: {
                        'Authorization': `Bearer ${localStorage.getItem('token')}`
                    }
                }
            );

            if (!response.ok) {
                const error = await response.json();
                // Specifically check for 404 "not found" errors
                if (response.status === 404) {
                    throw new Error('AUDIO_NOT_FOUND');
                }
                throw new Error(error.error || 'Failed to get audio file');
            }

            const data = await response.json();

            // Play the audio file
            await this.playAudioFromUrl(`${BASE_URL}${data.url}`);

            // Notify backend that file was played
            await this.notifyAudioPlayed(data.filename);

            return true;
        } catch (error) {
            console.error('Error playing training audio:', error);
            throw error;
        }
    },

    /**
     * Play audio from a URL and wait for it to complete
     * @param {string} url - The URL of the audio file
     * @returns {Promise<void>}
     */
    playAudioFromUrl(url) {
        return new Promise((resolve, reject) => {
            const audio = new Audio(url);

            audio.onended = () => {
                resolve();
            };

            audio.onerror = (error) => {
                console.error('Audio playback error:', error);
                reject(new Error('Failed to play audio'));
            };

            audio.play().catch(reject);
        });
    },

    /**
     * Notify the backend that an audio file has been played
     * @param {string} filename - The filename of the played audio
     * @returns {Promise<void>}
     */
    async notifyAudioPlayed(filename) {
        try {
            await fetch(`${BASE_URL}/api/audio/played`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({ filename })
            });
        } catch (error) {
            console.error('Error notifying backend about played audio:', error);
            // Don't throw here to avoid disrupting user experience
        }
    },

    /**
     * Preload all audio files for a specific phase or training day
     * @param {string} phase - 'pretest', 'training', 'posttest', etc.
     * @param {number|null} trainingDay - Required for training phase (1-4)
     * @param {Array<string>|null} activeTestTypes - Optional array of test types to preload
     * @returns {Promise<object>} - Information about preloaded files
     */
    async preloadAudioFiles(phase, trainingDay = null, activeTestTypes = null) {
        try {
            const response = await fetch(`${BASE_URL}/api/audio/preload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    phase,
                    trainingDay,
                    activeTestTypes // Send the list of active test types to preload
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to preload audio files');
            }

            const data = await response.json();
            console.log(`Preloaded ${data.files?.length || 0} audio files for ${phase}${trainingDay ? ` day ${trainingDay}` : ''}${activeTestTypes ? ` (test types: ${activeTestTypes.join(', ')})` : ''}`);
            return data;
        } catch (error) {
            console.error('Error preloading audio files:', error);
            // Don't throw - preloading is an optimization, not a requirement
            return { success: false, error: error.message };
        }
    },

    /**
     * End session and clean up played files
     * @returns {Promise<object>} - Information about the cleanup operation
     */
    async endSession() {
        try {
            const response = await fetch(`${BASE_URL}/api/session/end`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                }
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to end session');
            }

            const data = await response.json();
            console.log(`Session ended: ${data.message}`);
            return data;
        } catch (error) {
            console.error('Error ending session:', error);
            // Still return a value even on error
            return { success: false, error: error.message };
        }
    },

    /**
     * Clean up any resources
     */
    dispose() {
        // This method can be used to cancel any ongoing audio playback
        // For future implementation if needed
    }
};

export default audioService;