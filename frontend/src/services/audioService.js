// src/services/audioService.js
import {
    getGroupForPhase,
    getStoriesForPhase,
    getEffortFilesForPhase,
    getStoryForTrainingDay
} from '../utils/randomization';
import config from '../config';

// Use the constant instead of hardcoded URL
const BASE_URL = config.API_BASE_URL;

// Centralized audio service for handling audio interactions with the backend
const audioService = {
    /**
     * Play a practice audio file for volume adjustment
     * @param {string} speakerId - The ID of the speaker
     * @returns {Promise<boolean>} - True if playback was successful
     */
    async playPracticeAudio(speakerId = '01') {
        try {
            console.log(`Playing practice audio file using Box toolset`);
            const token = localStorage.getItem('token');
            
            if (!token) {
                throw new Error('No authentication token found');
            }
            
            // Match the backend route structure: /audio/:phase/:testType/:version/:sentence
            // Map practice to the expected parameters:
            // - phase: 'practice'
            // - testType: 'practice'
            // - version: 'null' (following pattern of other routes)
            // - sentence: '1' (using 1 as default)
            const url = `${BASE_URL}/audio/practice/practice/null/1`;
            console.log(`Requesting practice audio from: ${url}`);
            
            const response = await fetch(url, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            
            if (!response.ok) {
                throw new Error(`Failed to fetch practice audio: ${response.status}`);
            }
            
            const data = await response.json();
            
            if (!data.url) {
                throw new Error('Server response missing audio URL');
            }
            
            console.log(`Playing practice audio from: ${BASE_URL}${data.url}`);
            // Play the audio file directly using the URL from Box
            await this.playAudioFromUrl(`${BASE_URL}${data.url}`);
            
            // Notify backend that file was played
            if (data.filename) {
                await this.notifyAudioPlayed(data.filename);
            }
            
            return true;
        } catch (error) {
            console.error('Error playing practice audio:', error);
            return false;
        }
    },

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
            console.log(`playRandomizedTestAudio: phase=${phase}, testType=${testType}, version=${version}, sequence index=${sentence}`);
            
            // For intelligibility test, convert the sequential index to randomized file number
            let fileNumber = sentence;
            if (testType.toLowerCase() === 'intelligibility') {
                try {
                    // Import randomization function to get randomized file number
                    const { getGroupForPhase } = require('../utils/randomization');
                    
                    // If userId not provided, try to extract from token
                    if (!userId) {
                        userId = this.extractUserIdFromToken();
                    }
                    
                    // Get the randomized sequence for this phase
                    const randomizedFiles = getGroupForPhase(phase, null, userId);
                    
                    // Map the sequential index (sentence) to the randomized file number
                    // Note: sentence is 1-indexed, array is 0-indexed
                    fileNumber = randomizedFiles[sentence - 1];
                    
                    console.log(`RANDOMIZATION: Using file number ${fileNumber} instead of sequential ${sentence}`);
                } catch (randError) {
                    console.error('Error applying randomization:', randError);
                    // Fallback to sequential if randomization fails
                    fileNumber = sentence;
                }
            }
            
            // Normalize phase name to ensure consistency
            const normalizedPhase = phase.startsWith('posttest') ? phase : phase;
            
            // Validate token is available
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No authentication token found - cannot play audio');
                throw new Error('Authentication required');
            }

            // Request the audio file URL from the backend WITH the randomized file number
            const apiUrl = `${BASE_URL}/audio/${normalizedPhase}/${testType}/${version}/${fileNumber}`;
            console.log(`Fetching audio file from: ${apiUrl}`);
            
            try {
                const response = await fetch(apiUrl, {
                    headers: {
                        'Authorization': `Bearer ${token}`
                    }
                });

                if (!response.ok) {
                    console.error(`Error response from server: ${response.status} ${response.statusText}`);
                    // Instead of failing immediately, we'll try a direct file access approach
                    throw new Error(`Server returned ${response.status}`);
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
            } catch (apiError) {
                console.warn('API route failed, trying direct file access as fallback:', apiError);
                
                // FALLBACK: Try direct file access approach if the API fails
                // For intelligibility test, try a simple direct file URL pattern
                if (testType.toLowerCase() === 'intelligibility') {
                    // Get the randomized file number from the sequence
                    // Import randomization function to ensure we get the same randomized number
                    const { getGroupForPhase } = require('../utils/randomization');
                    const userId = this.extractUserIdFromToken();
                    
                    // Get the randomized sequence for the current phase
                    const randomizedFiles = getGroupForPhase(phase, null, userId);
                    
                    // Map the sequential index (sentence) to the randomized file number
                    const randomizedFileNumber = randomizedFiles[sentence - 1];
                    
                    console.log(`Using randomized file number: ${randomizedFileNumber} instead of sequential number: ${sentence}`);
                    
                    // Try direct access to the randomized file pattern
                    const directUrl = `${BASE_URL}/audio/public/Grace Norman_Int${String(randomizedFileNumber).padStart(2, '0')}.wav`;
                    console.log(`Trying direct file access with randomized number: ${directUrl}`);
                    
                    try {
                        // This will fail if the file doesn't exist, which is fine
                        await this.playAudioFromUrl(directUrl);
                        console.log('Direct file access succeeded!');
                        return true;
                    } catch (directError) {
                        console.error('Direct file access also failed:', directError);
                        throw new Error('Could not access audio file by any method');
                    }
                } else {
                    // For other test types, just rethrow the original error
                    throw apiError;
                }
            }
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
    * Play randomized training audio (for the training phase)
    * @param {string} day - day of training
    * @param {string} index - index between 1 and 20
    * @param {string} userId - userId
    * @returns {Promise<{success: boolean, fileNumber: number, storyNumber: string}>}
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
            
            // First, try to predict the story number based on the randomized mapping for this user
            // This is just a preliminary guess before actual API call
            // Use the userId we already extracted above
            // Use randomized story assignments instead of the fixed mapping
            const mappedStoryNumber = getStoryForTrainingDay(day, userId);
            console.log(`Initial story prediction based on randomized mapping: ${mappedStoryNumber}`);
            
            // Emit a preliminary event with our best guess
            // This helps components show the right text immediately
            if (typeof window !== 'undefined') {
                try {
                    const storyEvent = new CustomEvent('trainingStoryIdentified', {
                        detail: { 
                            storyNumber: mappedStoryNumber,
                            fileNumber: actualFileNumber,
                            preliminary: true
                        }
                    });
                    console.log(`Emitting preliminary story event`);
                    window.dispatchEvent(storyEvent);
                } catch (eventError) {
                    console.error('Failed to emit preliminary event:', eventError);
                }
            }

            // Call the regular playTrainingAudio with the mapped file number
            const result = await this.playTrainingAudio(day, actualFileNumber);
            
            // Get the accurate story number from the result
            const storyNumber = result.storyNumber || mappedStoryNumber;
            
            console.log(`Randomized training audio played with story ${storyNumber}, file #${actualFileNumber}`);
            
            // Emit another event with the confirmed story number after the API call
            if (typeof window !== 'undefined' && storyNumber !== mappedStoryNumber) {
                try {
                    const storyEvent = new CustomEvent('trainingStoryIdentified', {
                        detail: { 
                            storyNumber: storyNumber,
                            fileNumber: actualFileNumber,
                            confirmed: true
                        }
                    });
                    console.log(`Emitting confirmed story event with story=${storyNumber}`);
                    window.dispatchEvent(storyEvent);
                } catch (eventError) {
                    console.error('Failed to emit confirmed event:', eventError);
                }
            }
            
            return { 
                success: true, 
                fileNumber: actualFileNumber,
                storyNumber: storyNumber,
                mappedDay: result.mappedDay
            };
        } catch (error) {
            console.error('Error playing randomized training audio:', error);
            throw error;
        }
    },
    
    /**
    * IMPROVED: Play randomized intelligibility files for the training test phase
    * This version directly uses the playTestAudio function with the correct randomized file number
    * 
    * @param {string} day - day of training (1-4)
    * @param {string|number} fileNumber - The actual file number to play (NOT an index)
    * @param {string} userId - userId
    * @returns {Promise<{success: boolean, fileNumber: number}>}
    */
    async playTrainingTestAudio(day, fileNumber, userId = null) {
        try {
            console.log(`IMPROVED playTrainingTestAudio called for day ${day}, direct file number ${fileNumber}`);
            
            // Extract userId from token if not provided
            if (!userId) {
                userId = this.extractUserIdFromToken();
            }
            
            // CRITICAL FIX: We now receive the actual file number directly, not an index
            // This ensures consistency between playback and response submission
            console.log(`Playing training test audio: Day ${day}, File #${fileNumber}`);
            
            // Simply use the standard playTestAudio method with 'training' phase
            // This ensures we use the same endpoint and parameters for both playing and submitting
            return await this.playTestAudio(
                'training',  // Use 'training' phase for consistency with backend
                'intelligibility',
                null,
                fileNumber  // Use the actual file number directly
            );
        } catch (error) {
            console.error('Error playing training test audio:', error);
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
                        // Use randomized story number instead of fixed mapping
                        const storyNumber = getStoryForTrainingDay(fileInfo.day, userId);
                        
                        // Include the story number as a query parameter
                        url = `${BASE_URL}/audio/training/day/${fileInfo.day}/${fileInfo.actualFile}?story=${storyNumber}`;
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
            
            // Validate token exists
            const token = localStorage.getItem('token');
            if (!token) {
                console.error('No authentication token found');
                throw new Error('Authentication required');
            }
            
            // Construct URL
            const url = `${BASE_URL}/audio/${normalizedPhase}/${testType}/${version}/${sentence}`;
            console.log(`Requesting audio file from: ${url}`);

            // Request the audio file URL from the backend
            const response = await fetch(url, {
                headers: {
                    'Authorization': `Bearer ${token}`
                }
            });

            if (!response.ok) {
                console.error(`Server returned error ${response.status}: ${response.statusText}`);
                
                // Try to read error details if available
                let errorMessage = `Failed to get audio file (${response.status})`;
                try {
                    const errorData = await response.json();
                    errorMessage = errorData.error || errorMessage;
                } catch (parseError) {
                    console.warn('Could not parse error response:', parseError);
                }
                
                // Special handling for 404 errors or "not found" messages
                if (response.status === 404 || 
                    errorMessage.includes('not found') ||
                    errorMessage.includes('Not Found')) {
                    console.error('Audio file not found');
                    throw new Error('AUDIO_NOT_FOUND');
                }
                
                throw new Error(errorMessage);
            }

            // Parse the response to get file URL
            let data;
            try {
                data = await response.json();
            } catch (parseError) {
                console.error('Error parsing audio file response:', parseError);
                throw new Error('Invalid response format from server');
            }
            
            if (!data || !data.url) {
                console.error('Missing URL in server response:', data);
                throw new Error('Server response missing audio URL');
            }

            console.log(`Playing audio from: ${BASE_URL}${data.url}`);
            // Play the audio file
            await this.playAudioFromUrl(`${BASE_URL}${data.url}`);

            // Notify backend that file was played (if filename exists)
            if (data.filename) {
                console.log(`Notifying backend about played file: ${data.filename}`);
                await this.notifyAudioPlayed(data.filename);
            } else {
                console.warn('No filename in response, skipping played notification');
            }

            return true;
        } catch (error) {
            console.error('Error playing test audio:', error);
            
            // Rethrow specific errors like AUDIO_NOT_FOUND for consistent handling
            if (error.message === 'AUDIO_NOT_FOUND') {
                throw error;
            }
            
            // Wrap other errors for consistent handling
            throw new Error(`Failed to play audio: ${error.message}`);
        }
    },

    /**
     * Play audio for training sessions
     * @param {number|string} day - Training day (1-4)
     * @param {number|string} sentence - Sentence number
     * @param {string|null} forceStoryNumber - Optional override to force a specific story number
     * @returns {Promise<{success: boolean, storyNumber: string}>} - Returns success status and the story number used
     */
    async playTrainingAudio(day, sentence, forceStoryNumber = null) {
        try {
            // Use forced story number if provided, otherwise get from user ID
            let storyNumber;
            if (forceStoryNumber) {
                storyNumber = forceStoryNumber;
                console.log(`Using forced story number: ${storyNumber}`);
            } else {
                // Get story number based on user ID (this is just a fallback)
                const userId = this.extractUserIdFromToken();
                storyNumber = getStoryForTrainingDay(day, userId);
            }
            
            console.log(`Playing training audio for day ${day} (story ${storyNumber}), sentence ${sentence}`);
            
            // Request the audio file URL from the backend with the story number as a query parameter
            const response = await fetch(
                `${BASE_URL}/audio/training/day/${day}/${sentence}?story=${storyNumber}`,
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

            // Log the actual audio URL for debugging
            console.log(`Audio URL ready: ${BASE_URL}${data.url}`);
            
            // IMPORTANT: Analyze the URL BEFORE playing the audio
            // This ensures we identify the correct story number BEFORE audio starts
            let actualStoryNumber = storyNumber;
            let extractedFromUrl = false;
            
            // Extensive logging of the exact URL structure
            if (data.url) {
                // Capture the entire URL and filename for detailed inspection
                const fullUrl = `${BASE_URL}${data.url}`;
                console.log(`Analyzing audio URL: ${fullUrl}`);
                
                // Look for story number patterns in the URL using multiple approaches
                // Priority 1: Look for standard Trn_XX_YY pattern
                const trnMatch = data.url.match(/[Tt]rn_(\d{2})_\d{2}/i);
                if (trnMatch && trnMatch[1]) {
                    actualStoryNumber = trnMatch[1];
                    console.log(`Extracted story number from standard Trn pattern: ${actualStoryNumber}`);
                    extractedFromUrl = true;
                }
                // Priority 2: Look for XX_YY.wav pattern
                else if (!extractedFromUrl) {
                    const wavMatch = data.url.match(/(\d{2})_\d{2}\.wav/i);
                    if (wavMatch && wavMatch[1]) {
                        actualStoryNumber = wavMatch[1];
                        console.log(`Extracted story number from .wav filename: ${actualStoryNumber}`);
                        extractedFromUrl = true;
                    }
                }
                
                // Additional pattern checks for other filename formats
                if (!extractedFromUrl) {
                    // Check for pattern like "day/03/01" which indicates story 03
                    const pathMatch = data.url.match(/day\/(\d{2})\/\d+/i);
                    if (pathMatch && pathMatch[1]) {
                        actualStoryNumber = pathMatch[1];
                        console.log(`Extracted story number from URL path: ${actualStoryNumber}`);
                        extractedFromUrl = true;
                    }
                }
                
                // If we can't automatically extract it, log detailed information to help debug
                if (!extractedFromUrl) {
                    console.log(`Could not extract story number from URL structure. URL parts:`, {
                        basename: data.url.split('/').pop(),
                        directory: data.url.split('/').slice(0, -1).join('/'),
                        extension: data.url.split('.').pop()
                    });
                }
                
                // Emit a custom event with the story number BEFORE audio plays
                // This allows components to update immediately without waiting for audio
                if (extractedFromUrl && typeof window !== 'undefined') {
                    try {
                        const storyEvent = new CustomEvent('trainingStoryIdentified', {
                            detail: { 
                                storyNumber: actualStoryNumber,
                                fileNumber: sentence
                            }
                        });
                        console.log(`Emitting story event with story=${actualStoryNumber}, file=${sentence}`);
                        window.dispatchEvent(storyEvent);
                    } catch (eventError) {
                        console.error('Failed to emit custom event:', eventError);
                    }
                }
            }
            
            // Now play the audio file AFTER analysis and event emission
            console.log(`Now playing audio: ${BASE_URL}${data.url}`);
            await this.playAudioFromUrl(`${BASE_URL}${data.url}`);
            
            // Notify backend that file was played
            await this.notifyAudioPlayed(data.filename);
            
            // Additional analysis from filename if URL didn't work
            if (data.filename && !extractedFromUrl) {
                console.log(`Analyzing filename: ${data.filename}`);
                
                // Similar pattern matching on filename
                const filenameMatch = data.filename.match(/[Tt]rn_(\d{2})_\d{2}/i) || 
                                      data.filename.match(/(\d{2})_\d{2}\.wav/i);
                                      
                if (filenameMatch && filenameMatch[1]) {
                    actualStoryNumber = filenameMatch[1];
                    console.log(`Extracted story number from filename: ${actualStoryNumber}`);
                } else {
                    // Final fallback - capture any two-digit number in the filename
                    const digitMatch = data.filename.match(/_(\d{2})_/);
                    if (digitMatch && digitMatch[1]) {
                        actualStoryNumber = digitMatch[1];
                        console.log(`Extracted potential story number from filename: ${actualStoryNumber}`);
                    } else {
                        console.log(`Unable to extract story number from filename`);
                    }
                }
            }
            
            return {
                success: true,
                storyNumber: actualStoryNumber || storyNumber,
                mappedDay: day // Return the original day instead of mapped day
            };
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
                
                // This is a new fallback: Try hacking the URL to see if it's an intelligibility file
                // that we can access directly
                if (url.includes('/audio/') && !url.includes('Grace Norman_Int')) {
                    // Try to extract the phase and sentence number from the URL
                    const phaseMatch = url.match(/\/audio\/([^\/]+)/);
                    const numberMatch = url.match(/\/(\d+)$/);
                    
                    if (phaseMatch && phaseMatch[1] && numberMatch && numberMatch[1]) {
                        const phase = phaseMatch[1];
                        const sequentialNum = parseInt(numberMatch[1]);
                        
                        // Get randomized file number
                        try {
                            const { getGroupForPhase } = require('../utils/randomization');
                            const userId = this.extractUserIdFromToken();
                            
                            // Get the randomized sequence for this phase
                            const randomizedFiles = getGroupForPhase(phase, null, userId);
                            
                            // Map sequential index to randomized file number
                            const randomizedFileNumber = randomizedFiles[sequentialNum - 1];
                            console.log(`Fallback: Using randomized file ${randomizedFileNumber} instead of sequential ${sequentialNum}`);
                            
                            // Construct a direct file URL using randomized number
                            const directUrl = `${BASE_URL}/audio/public/Grace Norman_Int${String(randomizedFileNumber).padStart(2, '0')}.wav`;
                            console.log(`Original audio URL failed, trying randomized fallback URL: ${directUrl}`);
                            
                            // Create a new audio element for the fallback
                            const fallbackAudio = new Audio(directUrl);
                            fallbackAudio.onended = () => {
                                console.log('Fallback audio playback completed successfully');
                                resolve();
                            };
                            fallbackAudio.onerror = () => {
                                console.error('Fallback audio also failed');
                                reject(new Error('All audio playback methods failed'));
                            };
                            
                            // Try playing the fallback
                            fallbackAudio.play().catch(fallbackError => {
                                console.error('Fallback playback attempt failed:', fallbackError);
                                reject(new Error('All audio playback methods failed'));
                            });
                            
                            return; // Exit early since we're handling with fallback
                        } catch (randomizationError) {
                            console.error('Error with randomization in fallback:', randomizationError);
                            
                            // Fall back to sequential as last resort
                            const directUrl = `${BASE_URL}/audio/public/Grace Norman_Int${String(sequentialNum).padStart(2, '0')}.wav`;
                            console.log(`Randomization failed, using sequential fallback: ${directUrl}`);
                            
                            const fallbackAudio = new Audio(directUrl);
                            fallbackAudio.onended = () => {
                                console.log('Sequential fallback audio playback completed');
                                resolve();
                            };
                            fallbackAudio.onerror = () => {
                                console.error('Sequential fallback audio also failed');
                                reject(new Error('All audio playback methods failed'));
                            };
                            
                            fallbackAudio.play().catch(fallbackError => {
                                console.error('Sequential fallback playback attempt failed:', fallbackError);
                                reject(new Error('All audio playback methods failed'));
                            });
                            
                            return; // Exit early
                        }
                    }
                }
                
                // If we reach here, we couldn't create a fallback
                reject(new Error(errorMessage));
            };

            // Just in case these events aren't fired
            audio.onstalled = () => console.warn('Audio playback stalled');
            audio.onsuspend = () => console.warn('Audio loading suspended');
            audio.onabort = () => console.warn('Audio loading aborted');
            
            // Set a timeout for initial loading - reduced to 10 seconds for faster fallback
            loadingTimeout = setTimeout(() => {
                console.warn('Audio loading timeout - could not load audio file');
                if (this.currentAudio === audio) {
                    this.dispose(); // Clean up this audio element
                }
                reject(new Error('Audio loading timeout'));
            }, 10000); // 10 seconds timeout for loading
            
            // Set the source and begin loading
            audio.src = url;
            audio.load();

            // Use a separate try/catch for play() to ensure we catch any immediate errors
            audio.play().catch(error => {
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
     * @param {number|null} maxFiles - Optional maximum number of files to preload per test type
     * @returns {Promise<object>} - Information about preloaded files
     */
    async preloadAudioFiles(phase, trainingDay = null, activeTestTypes = null, maxFiles = null) {
        try {
            // Normalize the phase parameter to ensure consistency
            const normalizedPhase = phase.startsWith('posttest') ? phase : phase;

            console.log(`Preloading audio files for ${normalizedPhase}${trainingDay ? ` day ${trainingDay}` : ''}${maxFiles ? ` (max ${maxFiles} files)` : ''}`);

            // If maxFiles is set, log this special case
            if (maxFiles) {
                console.log(`Limited preloading: only fetching first ${maxFiles} files for faster access`);
            }

            const response = await fetch(`${BASE_URL}/api/audio/preload`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${localStorage.getItem('token')}`
                },
                body: JSON.stringify({
                    phase: normalizedPhase, // Use the normalized phase name
                    trainingDay,
                    activeTestTypes, // Send the list of active test types to preload
                    maxFiles // Add the maxFiles parameter to limit how many files to fetch
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to preload audio files');
            }

            const data = await response.json();
            console.log(`Preloaded ${data.files?.length || 0} audio files for ${normalizedPhase}${trainingDay ? ` day ${trainingDay}` : ''}`);
            
            // If we limited the files and this was successful, mark this as partial preloading
            if (maxFiles && data.success) {
                console.log(`Partial preloading of ${maxFiles} files completed successfully`);
                data.partialPreload = true;
            }
            
            return data;
        } catch (error) {
            console.error('Error preloading audio files:', error);
            // Don't throw - preloading is an optimization, not a requirement
            return { success: false, error: error.message };
        }
    },

    // Add a specific function for randomized audio files that handles posttest phases
    async preloadRandomizedAudioFiles(phase, trainingDay = null, activeTestTypes = null, maxFiles = null) {
        // Make sure phase names are consistent in the API call
        const normalizedPhase = phase.startsWith('posttest') ? phase : phase;
        
        console.log(`preloadRandomizedAudioFiles for ${normalizedPhase}, maxFiles=${maxFiles || 'all'}`);

        // Add maxFiles parameter to control how many files to preload
        return this.preloadAudioFiles(normalizedPhase, trainingDay, activeTestTypes, maxFiles);
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