// src/services/audioService.js
const BASE_URL = 'http://localhost:3000';

// Centralized audio service for handling audio interactions with the backend
const audioService = {
    /**
     * Play audio for test phases (pretest and posttest)
     * @param {string} phase - 'pretest' or 'posttest'
     * @param {string} testType - 'intelligibility', 'effort', or 'comprehension'
     * @param {number|string} version - Version/story number for comprehension tests
     * @param {number|string} sentence - Sentence number
     * @returns {Promise<void>}
     */
    async playTestAudio(phase, testType, version, sentence) {
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
     * Clean up any resources
     */
    dispose() {
        // This method can be used to cancel any ongoing audio playback
        // For future implementation if needed
    }
};

export default audioService;