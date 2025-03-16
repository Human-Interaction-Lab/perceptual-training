// src/services/audioService.js
const BASE_URL = 'http://localhost:3000';

// Cache audio objects to reduce loading time
const audioCache = new Map();

const audioService = {
    // Preload audio objects into memory
    _preloadAudioObject(url) {
        if (!audioCache.has(url)) {
            const audio = new Audio(url);
            // Start loading the audio (without playing)
            audio.load();
            audioCache.set(url, audio);
        }
        return audioCache.get(url);
    },

    async playTestAudio(phase, testType, version, sentence) {
        try {
            const cacheKey = `${phase}_${testType}_${version}_${sentence}`;

            // Check if we have the URL in localStorage
            const cachedUrl = localStorage.getItem(`audio_url_${cacheKey}`);

            let audioUrl;
            let filename;

            if (cachedUrl) {
                // Use cached URL to avoid server roundtrip
                audioUrl = cachedUrl;
                filename = localStorage.getItem(`audio_filename_${cacheKey}`);
            } else {
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
                audioUrl = `${BASE_URL}${data.url}`;
                filename = data.filename;

                // Cache the URL and filename for future use
                localStorage.setItem(`audio_url_${cacheKey}`, audioUrl);
                localStorage.setItem(`audio_filename_${cacheKey}`, filename);
            }

            // Play the audio file
            await this.playAudioFromUrl(audioUrl);

            // Notify backend that file was played
            await this.notifyAudioPlayed(filename);

            return true;
        } catch (error) {
            console.error('Error playing test audio:', error);
            throw error;
        }
    },

    async playTrainingAudio(day, sentence) {
        try {
            const cacheKey = `training_day${day}_${sentence}`;

            // Check if we have the URL in localStorage
            const cachedUrl = localStorage.getItem(`audio_url_${cacheKey}`);

            let audioUrl;
            let filename;

            if (cachedUrl) {
                // Use cached URL to avoid server roundtrip
                audioUrl = cachedUrl;
                filename = localStorage.getItem(`audio_filename_${cacheKey}`);
            } else {
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
                audioUrl = `${BASE_URL}${data.url}`;
                filename = data.filename;

                // Cache the URL and filename for future use
                localStorage.setItem(`audio_url_${cacheKey}`, audioUrl);
                localStorage.setItem(`audio_filename_${cacheKey}`, filename);
            }

            // Play the audio file
            await this.playAudioFromUrl(audioUrl);

            // Notify backend that file was played
            await this.notifyAudioPlayed(filename);

            return true;
        } catch (error) {
            console.error('Error playing training audio:', error);
            throw error;
        }
    },

    playAudioFromUrl(url) {
        return new Promise((resolve, reject) => {
            // Try to use cached audio object if available
            let audio = audioCache.get(url);

            if (!audio) {
                audio = new Audio(url);
                audioCache.set(url, audio);
            }

            // Reset audio to beginning if it was played before
            audio.currentTime = 0;

            const onEnd = () => {
                audio.removeEventListener('ended', onEnd);
                resolve();
            };

            const onError = (error) => {
                audio.removeEventListener('error', onError);
                console.error('Audio playback error:', error);
                audioCache.delete(url); // Remove from cache on error
                reject(new Error('Failed to play audio'));
            };

            audio.addEventListener('ended', onEnd);
            audio.addEventListener('error', onError);

            // Attempt to play the audio
            audio.play().catch(error => {
                audio.removeEventListener('ended', onEnd);
                audio.removeEventListener('error', onError);
                reject(error);
            });
        });
    },

    // Cache URLs during preloading
    cacheAudioUrls(files) {
        if (!files || !files.length) return;

        files.forEach(file => {
            // Preload the audio object for faster playback
            this._preloadAudioObject(`${BASE_URL}${file.url}`);
        });
    },

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
        }
    },

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
                    activeTestTypes
                })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.error || 'Failed to preload audio files');
            }

            const data = await response.json();
            console.log(`Preloaded ${data.files?.length || 0} audio files for ${phase}${trainingDay ? ` day ${trainingDay}` : ''}${activeTestTypes ? ` (test types: ${activeTestTypes.join(', ')})` : ''}`);

            // Cache all URLs when preloaded
            this.cacheAudioUrls(data.files);

            return data;
        } catch (error) {
            console.error('Error preloading audio files:', error);
            return { success: false, error: error.message };
        }
    },

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
            return { success: false, error: error.message };
        }
    },

    dispose() {
        // Clear any cached audio objects
        audioCache.forEach(audio => {
            audio.pause();
            audio.src = '';
        });
        audioCache.clear();
    }
};

export default audioService;