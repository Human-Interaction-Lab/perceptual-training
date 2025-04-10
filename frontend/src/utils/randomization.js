// Define localStorage polyfill for Node.js environment
// This allows the code to run on the server without errors when accessing localStorage
if (typeof localStorage === 'undefined') {
    // Simple localStorage polyfill for Node environment
    const nodeLocalStorage = {
        _data: {},
        getItem: function (key) {
            return this._data[key] || null;
        },
        setItem: function (key, value) {
            this._data[key] = value.toString();
        },
        removeItem: function (key) {
            delete this._data[key];
        }
    };

    // In Node environment, define global localStorage
    global.localStorage = nodeLocalStorage;
    console.log("Created localStorage polyfill for Node environment");
}

// Helper function to create a numeric hash from a string
const hashString = (str) => {
    let hash = 0;
    if (str.length === 0) return hash;

    for (let i = 0; i < str.length; i++) {
        const char = str.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // Convert to 32bit integer
    }

    return Math.abs(hash);
};

// Create a seeded random function that doesn't modify the original seed
const createSeededRandom = (seed) => {
    let seedValue = seed;
    return () => {
        seedValue = (seedValue * 9301 + 49297) % 233280;
        return seedValue / 233280;
    };
};

// Create a single randomized sequence of all intelligibility files for a user
// This ensures consistent randomization across all phases
const getFullRandomizedSequence = (userId = null) => {
    // Use a consistent key for localStorage to retrieve the sequence
    const storageKey = userId ? `intelligibility_sequence_${userId}` : 'intelligibility_sequence_default';

    // Try to retrieve from localStorage first for consistency across sessions
    if (typeof localStorage !== 'undefined') {
        try {
            const savedSequence = localStorage.getItem(storageKey);
            if (savedSequence) {
                console.log(`Retrieved saved intelligibility sequence for user ${userId || 'default'}`);
                return JSON.parse(savedSequence);
            }
        } catch (e) {
            console.warn('Error reading saved sequence from localStorage:', e);
        }
    }

    // Create a new randomized sequence if not found in localStorage
    console.log(`Creating new randomized intelligibility sequence for user ${userId || 'default'}`);

    // Create array of all file indices [1...160]
    const totalFiles = 160;
    const allIndices = Array.from({ length: totalFiles }, (_, i) => i + 1);

    // Seed the randomization based on userId
    const seedValue = userId ? hashString(userId) : Math.floor(Math.random() * 10000);
    const seededRandom = createSeededRandom(seedValue);

    // Fisher-Yates shuffle to randomize the entire sequence
    for (let i = allIndices.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom() * (i + 1));
        [allIndices[i], allIndices[j]] = [allIndices[j], allIndices[i]];
    }

    // Save to localStorage for consistency across sessions
    if (typeof localStorage !== 'undefined') {
        try {
            localStorage.setItem(storageKey, JSON.stringify(allIndices));
            console.log(`Saved randomized sequence to localStorage with key ${storageKey}`);
        } catch (e) {
            console.warn('Error saving sequence to localStorage:', e);
        }
    }

    return allIndices;
};

// for backwards compatibility - uses stratified groups rather than single sequence
const stratifyAndRandomizeFiles = (total, groupSize, seed = null) => {
    console.log(`Stratifying ${total} files into groups of size ${groupSize}`);

    // Create array of all file indices [1...total]
    const allIndices = Array.from({ length: total }, (_, i) => i + 1);

    // Safety check - log a warning if there aren't enough files
    if (total < groupSize * 8) {
        console.warn(`Warning: Not enough files (${total}) to create 8 unique groups of ${groupSize} files.`);
    }

    // Split into groups of groupSize
    const groups = [];
    for (let i = 0; i < allIndices.length; i += groupSize) {
        groups.push(allIndices.slice(i, i + groupSize));
    }

    // Seed random selection if provided
    if (seed !== null) {
        // Generate a seed based on userId
        let seedValue = seed ? hashString(seed) : Math.floor(Math.random() * 10000);
        const seededRandom = createSeededRandom(seedValue);

        // Fisher-Yates shuffle with seeded random
        for (let i = groups.length - 1; i > 0; i--) {
            const j = Math.floor(seededRandom() * (i + 1));
            [groups[i], groups[j]] = [groups[j], groups[i]];
        }
    } else {
        // Shuffle groups randomly
        groups.sort(() => Math.random() - 0.5);
    }

    return groups;
};

// Function to get a specific group for a phase/day using a single randomized sequence
const getGroupForPhase = (phase, trainingDay = null, userId = null) => {
    // Group size for each phase
    const groupSize = 20;

    console.log(`Getting intelligibility group for phase ${phase}, day ${trainingDay}`);

    // Get the full randomized sequence for this user
    const fullSequence = getFullRandomizedSequence(userId);

    // Determine the starting index in the sequence based on phase and training day
    let startIndex = 0;

    // Map phases to specific segments in the sequence
    // Segment assignments:
    // 0: pretest (first 20 files)
    // 1-4: training tests days 1-4 (next 80 files)
    // 5: posttest1 (next 20 files) 
    // 6: posttest2 (next 20 files)
    // 7: unused (remaining 20 files as backup)

    if (phase === 'pretest') {
        // Pretest uses the first 20 files (index 0-19)
        startIndex = 0;
        console.log(`Pretest using sequence segment starting at index ${startIndex}`);
    } else if (phase === 'training') {
        // Regular training doesn't use intelligibility files
        // Return unused segment at the end
        startIndex = 140;
        console.log(`Training phase using unused segment (index ${startIndex}+)`);
    } else if (phase === 'training_test') {
        // Each training_test day gets its own segment
        if (trainingDay && trainingDay >= 1 && trainingDay <= 4) {
            startIndex = 20 + (trainingDay - 1) * groupSize;
            console.log(`Training test for day ${trainingDay} using segment at index ${startIndex}`);
        } else {
            console.warn(`Invalid training test day: ${trainingDay}. Using default segment.`);
            startIndex = 20; // Default to first training segment
        }
    } else if (phase === 'posttest1') {
        // Posttest1 uses index 100-119
        startIndex = 100;
        console.log(`Posttest1 using segment at index ${startIndex}`);
    } else if (phase === 'posttest2') {
        // Posttest2 uses index 120-139
        startIndex = 120;
        console.log(`Posttest2 using segment at index ${startIndex}`);
    } else {
        // Default to unused segment for any other phase
        startIndex = 140;
    }

    // Extract the group from the sequence
    const group = fullSequence.slice(startIndex, startIndex + groupSize);
    console.log(`Extracted ${group.length} intelligibility files starting from index ${startIndex}`);

    // Log a few sample files for verification
    if (group.length > 0) {
        const samples = group.slice(0, Math.min(3, group.length));
        console.log(`Sample files for ${phase}: ${samples.join(', ')}...`);
    }

    return group;
};

// Function to randomize comprehension stories
const randomizeComprehensionStories = (userId = null, phase = null) => {
    // Define all available comprehension story IDs (assuming there are 6 total stories)
    const allStoryIds = ["Comp_01", "Comp_02", "Comp_03", "Comp_04", "Comp_05", "Comp_06"];

    // We need to assign 2 stories to each of 3 phases (pretest, posttest1, posttest2)
    // without repetition

    // Generate a seed based on userId
    let seed;

    // For test users, use a different seed for each phase
    if (userId && userId.startsWith('test_') && phase) {
        seed = hashString(userId + '_' + phase);
    } else {
        seed = userId ? hashString(userId) : Math.floor(Math.random() * 10000);
    }

    // Use our consistent seeded random function
    const seededRandom = createSeededRandom(seed);

    // Shuffle the story IDs using Fisher-Yates with seeded random
    const shuffledStories = [...allStoryIds];
    for (let i = shuffledStories.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom() * (i + 1));
        [shuffledStories[i], shuffledStories[j]] = [shuffledStories[j], shuffledStories[i]];
    }

    // Assign 2 stories to each phase
    return {
        pretest: shuffledStories.slice(0, 2),
        posttest1: shuffledStories.slice(2, 4),
        posttest2: shuffledStories.slice(4, 6)
    };
};

// Get stories for a specific phase
const getStoriesForPhase = (phase, userId = null) => {
    const allPhaseStories = randomizeComprehensionStories(userId, phase);
    return allPhaseStories[phase] || [];
};

// Function to randomize effort files in groups of 30
const randomizeEffortFiles = (userId = null, phase = null) => {
    // Total of 90 files in 3 groups of 30 (each containing 15 high + 15 low predictability)
    const totalFiles = 90;
    const groupSize = 30;

    // Get random seed from userId
    let seed;

    // For test users, use a different seed for each phase
    if (userId && userId.startsWith('test_') && phase) {
        seed = hashString(userId + '_' + phase);
    } else {
        seed = userId ? hashString(userId) : Math.floor(Math.random() * 10000);
    }

    // Generate array of all file indices [1...90]
    const allIndices = Array.from({ length: totalFiles }, (_, i) => i + 1);

    // Split into 3 groups of 30 files each
    const groups = [];
    for (let i = 0; i < allIndices.length; i += groupSize) {
        groups.push(allIndices.slice(i, i + groupSize));
    }

    // Use our consistent seeded random function
    const seededRandom = createSeededRandom(seed);

    // Shuffle the groups (order of assignment to phases)
    for (let i = groups.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom() * (i + 1));
        [groups[i], groups[j]] = [groups[j], groups[i]];
    }

    // Also shuffle WITHIN each group to randomize the presentation order
    groups.forEach(group => {
        // Fisher-Yates shuffle for each group internally
        for (let i = group.length - 1; i > 0; i--) {
            const j = Math.floor(seededRandom() * (i + 1));
            [group[i], group[j]] = [group[j], group[i]];
        }
    });

    return {
        pretest: groups[0],
        posttest1: groups[1],
        posttest2: groups[2]
    };
};

// Get effort files for a specific phase
const getEffortFilesForPhase = (phase, userId = null) => {
    const allPhaseEffortFiles = randomizeEffortFiles(userId, phase);
    return allPhaseEffortFiles[phase] || [];
};

// Function to get fixed training stories for each day
// No more randomization - using fixed story assignments
const getTrainingStoriesForDay = (day) => {
    // Fixed mapping: 
    // Days 1 and 3 get stories 02 and 04
    // Days 2 and 4 get stories 03 and 07
    switch (day) {
        case 1:
            return ["02", "04"];
        case 2:
            return ["03", "07"];
        case 3:
            return ["02", "04"];
        case 4:
            return ["03", "07"];
        default:
            console.error(`Invalid training day: ${day}`);
            return ["02", "04"]; // fallback to story 02 if invalid day
    }
};

// Get the primary story for a specific training day (for backward compatibility)
const getStoryForTrainingDay = (day, userId = null) => {
    // Return the first story in the pair for this day
    // This maintains backward compatibility with code that expects a single story
    const stories = getTrainingStoriesForDay(day);
    return stories[0] || null;
};

// Function to reset a user's randomized sequence (for debugging or if needed)
const resetIntelligibilitySequence = (userId = null) => {
    const storageKey = userId ? `intelligibility_sequence_${userId}` : 'intelligibility_sequence_default';

    if (typeof localStorage !== 'undefined') {
        try {
            localStorage.removeItem(storageKey);
            console.log(`Reset intelligibility sequence for user ${userId || 'default'}`);
            return true;
        } catch (e) {
            console.warn('Error resetting sequence:', e);
            return false;
        }
    }
    return false;
};

// Debugging function to verify intelligibility sequence is consistent
const testIntelligibilitySequence = (userId = null) => {
    const sequence = getFullRandomizedSequence(userId);

    // Log information about the sequence
    console.log('=======================================');
    console.log(`INTELLIGIBILITY SEQUENCE TEST FOR USER: ${userId || 'default'}`);
    console.log(`Total sequence length: ${sequence.length}`);
    console.log('=======================================');

    // Show a preview of how files are assigned to each phase
    const phases = ['pretest', 'training_test_day1', 'training_test_day2',
        'training_test_day3', 'training_test_day4', 'posttest1', 'posttest2'];

    phases.forEach(phaseKey => {
        let phase, day;

        if (phaseKey.includes('day')) {
            // Extract day number for training test
            phase = 'training_test';
            day = parseInt(phaseKey.replace('training_test_day', ''));
        } else {
            phase = phaseKey;
            day = null;
        }

        const files = getGroupForPhase(phase, day, userId);
        console.log(`${phaseKey}: ${files.slice(0, 5).join(', ')}... (${files.length} files)`);
    });

    console.log('=======================================');

    return sequence;
};

// Use module.exports for CommonJS compatibility (Node.js) and support for require()
// This makes the file compatible with both frontend and backend
if (typeof module !== 'undefined' && module.exports) {
    // CommonJS environment (Node.js)
    module.exports = {
        stratifyAndRandomizeFiles,
        getGroupForPhase,
        randomizeComprehensionStories,
        getStoriesForPhase,
        randomizeEffortFiles,
        getEffortFilesForPhase,
        getTrainingStoriesForDay,
        getStoryForTrainingDay,
        getFullRandomizedSequence,
        testIntelligibilitySequence,
        resetIntelligibilitySequence
    };
} else {
    // ES Module environment (Browser)
    //export {
    //    stratifyAndRandomizeFiles,
    //    getGroupForPhase,
    //    randomizeComprehensionStories,
    //    getStoriesForPhase,
    //    randomizeEffortFiles,
    //    getEffortFilesForPhase,
    //    getTrainingStoriesForDay,
    //    getStoryForTrainingDay,
    //    getFullRandomizedSequence,
    //    testIntelligibilitySequence,
    //    resetIntelligibilitySequence
    //};
}