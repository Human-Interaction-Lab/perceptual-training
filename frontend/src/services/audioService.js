// src/services/audioService.js
const BASE_URL = 'http://localhost:3000';
import { getGroupForPhase } from '../utils/randomization';

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