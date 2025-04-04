// src/services/audioService.js
import {
    getGroupForPhase,
    getStoriesForPhase,
    getEffortFilesForPhase
} from '../utils/randomization';
import { TRAINING_DAY_TO_STORY } from '../components/trainingData';
import config from '../config';

// Use the constant instead of hardcoded URL
const BASE_URL = config.API_BASE_URL;

// Centralized audio service for handling audio interactions with the backend
const audioService = {

    /**
    * A method to map file number to actual file ID
    * @param {string} phase - 'pretest', 'training', 'posttest1', etc.
    * @param {string} testType - the test
    * @param {string} version - version of file
    * @param {string} index - index of file between 1 - 20
    * @param {string} userId - userId
    * @returns {Promise<void>}
    */
    async playRandomizedTestAudio(phase, testType, version, sentence, userId) {
        try {
            console.log(`playRandomizedTestAudio: phase=${phase}, testType=${testType}, version=${version}, sentence=${sentence}`);
            
            // Normalize phase name to ensure consistency
            const normalizedPhase = phase.startsWith('posttest') ? phase : phase;
            
            // Validate token is available
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No authentication token found - cannot play audio');
                throw new Error('Authentication required');
            }

            // Request the audio file URL from the backend
            console.log(`Fetching audio file from: ${BASE_URL}/audio/${normalizedPhase}/${testType}/${version}/${sentence}`);
            const response = await fetch(
                `${BASE_URL}/audio/${normalizedPhase}/${testType}/${version}/${sentence}`,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                }
            );

            if (!response.ok) {
                console.error(`Error response from server: ${response.status} ${response.statusText}`);
                let errorMessage = 'Failed to get audio file';
                try {
                    const error = await response.json();
                    errorMessage = error.error || errorMessage;
                } catch (parseError) {
                    console.error('Could not parse error response as JSON:', parseError);
                }
                throw new Error(errorMessage);
            }

            const data = await response.json();
            console.log(`Successfully retrieved audio file info: ${data.filename || 'unnamed file'}`);

            if (!data.url) {
                throw new Error('Server response missing audio URL');
            }

            // Play the audio file
            console.log(`Playing audio from: ${BASE_URL}${data.url}`);
            await this.playAudioFromUrl(`${BASE_URL}${data.url}`);

            // Notify backend that file was played
            if (data.filename) {
                console.log(`Notifying backend about played file: ${data.filename}`);
                await this.notifyAudioPlayed(data.filename);
            }

            return true;
        } catch (error) {
            console.error(`Error playing ${testType} audio for ${phase}:`, error);
            
            // Filter out any connection errors
            if (error.message.includes('NetworkError') || 
                error.message.includes('Failed to fetch') || 
                error.message.includes('Network request failed')) {
                throw new Error('Network error - please check your internet connection');
            }
            
            // Check for common audio-related errors
            if (error.message.includes('NotAllowedError')) {
                throw new Error('Browser blocked audio playback - user interaction required');
            }
            
            throw error;
        }
    },


    /**
    * A method to map file number to actual file ID
    * @param {string} phase - 'pretest', 'training', 'posttest1', etc.
    * @param {string} index - index of file between 1 - 30
    * @param {string} userId - userId
    * @returns {Promise<void>}
    */
    async playRandomizedEffortAudio(phase, index, userId = null) {
        try {
            if (!userId) userId = this.extractUserIdFromToken();

            // Get randomized effort files for this phase
            const effortFiles = getEffortFilesForPhase(phase, userId);

            // Map sequential index to actual file number
            const actualFileNumber = effortFiles[index - 1];

            console.log(`Playing randomized effort audio: ${phase}/${index} -> File #${actualFileNumber}`);

            return await this.playTestAudio(phase, 'effort', null, actualFileNumber);
        } catch (error) {
            console.error('Error playing randomized effort audio:', error);
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

                    // Create array of comprehension story files (each story has 2 files)
                    const comprehensionFiles = [];

                    assignedStories.forEach(storyId => {
                        const storyNum = storyId.replace('Comp_', '');
                        for (let i = 1; i <= 2; i++) { // Changed from 10 to 2 clips per story
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

                // randomize effort audio file order
                if (!activeTestTypes || activeTestTypes.includes('effort')) {
                    const effortFiles = getEffortFilesForPhase(phase, userId);

                    // Create effort files info objects
                    const randomizedEffortFiles = effortFiles.map(fileIndex => ({
                        phase,
                        testType: 'effort',
                        actualFile: fileIndex
                    }));

                    filesToPreload.push(...randomizedEffortFiles);
                }
            }

            console.log(`Preloading ${filesToPreload.length} randomized files for ${phase}`);

            // Now preload all the files we identified
            const preloadPromises = filesToPreload.map(async fileInfo => {
                try {
                    // Determine which API endpoint to use based on the file type
                    let url;

                    if (fileInfo.phase === 'training') {
                        // Map training day to story number (02, 03, 04, or 07)
                        const storyNumber = TRAINING_DAY_TO_STORY[fileInfo.day];
                        const mappedDay = storyNumber || fileInfo.day; // Fallback for backward compatibility
                        
                        url = `${BASE_URL}/audio/training/day/${mappedDay}/${fileInfo.actualFile}`;
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
            // Normalize phase name to ensure consistency
            const normalizedPhase = phase.startsWith('posttest') ? phase : phase;

            // Request the audio file URL from the backend
            const response = await fetch(
                `${BASE_URL}/audio/${normalizedPhase}/${testType}/${version}/${sentence}`,
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
            // Map the training day to the actual story number (02, 03, 04, or 07)
            const storyNumber = TRAINING_DAY_TO_STORY[day];
            
            // If we can't find a mapping, use the day directly (for backward compatibility)
            const mappedDay = storyNumber || day;
            
            console.log(`Playing training audio for day ${day} (story ${mappedDay}), sentence ${sentence}`);
            
            // Request the audio file URL from the backend
            const response = await fetch(
                `${BASE_URL}/audio/training/day/${mappedDay}/${sentence}`,
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
            console.log(`Playing audio from URL: ${url}`);
            const audio = new Audio();
            let playTimeout;
            let loadingTimeout;

            // Set up event listeners before setting the source
            // This is important for catching load errors properly
            
            // Audio event handlers
            audio.onended = () => {
                console.log('Audio playback completed normally');
                if (playTimeout) clearTimeout(playTimeout);
                if (loadingTimeout) clearTimeout(loadingTimeout);
                resolve();
            };

            audio.oncanplaythrough = () => {
                console.log('Audio can play through without buffering');
                // Clear loading timeout since we can play now
                if (loadingTimeout) clearTimeout(loadingTimeout);
                
                // Set a new timeout for the actual playback duration
                if (audio.duration && !isNaN(audio.duration)) {
                    const duration = Math.ceil(audio.duration * 1000) + 2000; // Audio duration + 2 seconds buffer
                    console.log(`Setting playback timeout for ${duration}ms`);
                    playTimeout = setTimeout(() => {
                        console.warn('Audio playback timeout - forcing completion');
                        resolve();
                    }, duration);
                }
            };

            audio.onerror = (event) => {
                const errorMessage = `Audio error: ${audio.error ? audio.error.code : 'unknown error'}`;
                console.error(errorMessage, event);
                if (playTimeout) clearTimeout(playTimeout);
                if (loadingTimeout) clearTimeout(loadingTimeout);
                reject(new Error(errorMessage));
            };

            // Just in case these events aren't fired
            audio.onstalled = () => console.warn('Audio playback stalled');
            audio.onsuspend = () => console.warn('Audio loading suspended');
            audio.onabort = () => console.warn('Audio loading aborted');
            
            // Set a timeout for initial loading
            loadingTimeout = setTimeout(() => {
                console.warn('Audio loading timeout - could not load audio file');
                if (this.currentAudio === audio) {
                    this.dispose(); // Clean up this audio element
                }
                reject(new Error('Audio loading timeout'));
            }, 15000); // 15 seconds timeout for loading
            
            // Set the source and begin loading
            audio.src = url;
            audio.load();

            // Use a separate try/catch for play() to ensure we catch any immediate errors
            const playPromise = audio.play().catch(error => {
                console.error('Error starting audio playback:', error);
                if (playTimeout) clearTimeout(playTimeout);
                if (loadingTimeout) clearTimeout(loadingTimeout);
                
                // Check for specific autoplay policy error
                if (error.name === 'NotAllowedError') {
                    return reject(new Error('Playback not allowed - may need user interaction'));
                }
                
                reject(error);
            });
            
            // Track this audio element for cleanup
            this.currentAudio = audio;
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
            // Normalize the phase parameter to ensure consistency
            const normalizedPhase = phase.startsWith('posttest') ? phase : phase;

            console.log(`Preloading audio files for ${normalizedPhase}${trainingDay ? ` day ${trainingDay}` : ''}`);

            const response = await fetch(`${BASE_URL}/api/audio/preload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    phase: normalizedPhase, // Use the normalized phase name
                    trainingDay,
                    activeTestTypes // Send the list of active test types to preload
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to preload audio files');
            }

            const data = await response.json();
            console.log(`Preloaded ${data.files?.length || 0} audio files for ${normalizedPhase}${trainingDay ? ` day ${trainingDay}` : ''}`);
            return data;
        } catch (error) {
            console.error('Error preloading audio files:', error);
            // Don't throw - preloading is an optimization, not a requirement
            return { success: false, error: error.message };
        }
    },

    // Add a specific function for randomized audio files that handles posttest phases
    async preloadRandomizedAudioFiles(phase, trainingDay = null, activeTestTypes = null) {
        // Make sure phase names are consistent in the API call
        const normalizedPhase = phase.startsWith('posttest') ? phase : phase;

        return this.preloadAudioFiles(normalizedPhase, trainingDay, activeTestTypes);
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
        // Cancel any ongoing audio playback
        if (this.currentAudio) {
            try {
                // Pause the audio
                this.currentAudio.pause();
                
                // Reset the audio element
                this.currentAudio.src = '';
                this.currentAudio.load();
                
                // Remove reference
                this.currentAudio = null;
                
                console.log('Audio playback disposed');
            } catch (error) {
                console.error('Error disposing audio:', error);
            }
        }
    }
};

export default audioService;