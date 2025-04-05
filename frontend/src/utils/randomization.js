// for randomization of intelligibility files
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

        // Use a seeded random function that doesn't modify the seed directly
        const seededRandom = () => {
            seedValue = (seedValue * 9301 + 49297) % 233280;
            return seedValue / 233280;
        };

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

// Function to get a specific group for a phase/day
const getGroupForPhase = (phase, trainingDay = null, userId = null) => {
    // Total of 160 intelligibility files available
    // Use 140 of them: 20 for pretest, 80 for training tests (20×4), 20 for posttest1, 20 for posttest2
    const totalFiles = 160;
    const groupSize = 20;
    
    console.log(`Getting group for phase ${phase}, day ${trainingDay}, totalFiles=${totalFiles}`);

    // Use userId as seed if available for consistent randomization per user
    // For test users, use a different seed for each one to ensure different audio assignments
    let seed;
    if (userId && userId.startsWith('test_')) {
        // Add phase to seed to ensure different assignments for pretest vs posttest test users
        seed = userId + '_' + phase;
    } else {
        seed = userId;
    }
    
    const groups = stratifyAndRandomizeFiles(totalFiles, groupSize, seed);

    // Map phases to group indices (0-7)
    let groupIndex;

    // Map phases to specific group indices to avoid overlap
    // Group assignments (8 groups total):
    // 0: pretest
    // 1-4: training tests (days 1-4)
    // 5: posttest1
    // 6: posttest2
    // 7: intentionally left unused as backup
    
    if (phase === 'pretest') {
        // Pretest uses group 0
        groupIndex = 0;
        console.log(`Pretest using group index ${groupIndex}`);
    } else if (phase === 'training') {
        // Regular training doesn't use intelligibility files
        // So we'll just return group 7 (unused) which won't matter
        groupIndex = 7;
        console.log(`Training phase using group index ${groupIndex} (unused)`);
    } else if (phase === 'training_test') {
        // Each training_test day gets its own group to avoid overlap
        if (trainingDay && trainingDay >= 1 && trainingDay <= 4) {
            // Training test uses groups 1-4
            groupIndex = trainingDay;
            console.log(`Training test for day ${trainingDay} using group index ${groupIndex}`);
        } else {
            console.warn(`Invalid training test day: ${trainingDay}. Using default group 1.`);
            groupIndex = 1; // Default to first training group
        }
    } else if (phase === 'posttest1') {
        // Posttest1 uses group 5
        groupIndex = 5;
        console.log(`Posttest1 using group index ${groupIndex}`);
    } else if (phase === 'posttest2') {
        // Posttest2 uses group 6
        groupIndex = 6;
        console.log(`Posttest2 using group index ${groupIndex}`);
    } else {
        // Default to last group (7) for any other phase
        groupIndex = 7;
    }

    // Ensure index is within bounds
    groupIndex = groupIndex % groups.length;

    return groups[groupIndex];
};

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

// Function to randomize comprehension stories
const randomizeComprehensionStories = (userId = null, phase = null) => {
    // Define all available comprehension story IDs (assuming there are 6 total stories)
    const allStoryIds = ["Comp_01", "Comp_02", "Comp_03", "Comp_04", "Comp_05", "Comp_06"];

    // We need to assign 2 stories to each of 3 phases (pretest, posttest1, posttest2)
    // without repetition

    // Generate a seed based on userId
    let seedValue;
    
    // For test users, use a different seed for each phase
    if (userId && userId.startsWith('test_') && phase) {
        seedValue = hashString(userId + '_' + phase);
    } else {
        seedValue = userId ? hashString(userId) : Math.floor(Math.random() * 10000);
    }

    // Use a seeded random function that doesn't modify the seed directly
    const seededRandom = () => {
        seedValue = (seedValue * 9301 + 49297) % 233280;
        return seedValue / 233280;
    };

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
    let seedValue;
    
    // For test users, use a different seed for each phase
    if (userId && userId.startsWith('test_') && phase) {
        seedValue = hashString(userId + '_' + phase);
    } else {
        seedValue = userId ? hashString(userId) : Math.floor(Math.random() * 10000);
    }

    // Generate array of all file indices [1...90]
    const allIndices = Array.from({ length: totalFiles }, (_, i) => i + 1);

    // Split into 3 groups of 30 files each
    const groups = [];
    for (let i = 0; i < allIndices.length; i += groupSize) {
        groups.push(allIndices.slice(i, i + groupSize));
    }

    // Shuffle groups using seeded random
    const seededRandom = () => {
        seedValue = (seedValue * 9301 + 49297) % 233280;
        return seedValue / 233280;
    };

    for (let i = groups.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom() * (i + 1));
        [groups[i], groups[j]] = [groups[j], groups[i]];
    }

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

// Function to randomize training stories - which story is shown on which day
const randomizeTrainingStories = (userId = null) => {
    // Available story numbers
    const storyIds = ["02", "03", "04", "07"];
    
    // Generate a seed based on userId
    let seedValue;
    if (userId) {
        seedValue = hashString(userId + '_training_stories');
    } else {
        seedValue = Math.floor(Math.random() * 10000);
    }
    
    // Use a seeded random function that doesn't modify the seed directly
    const seededRandom = () => {
        seedValue = (seedValue * 9301 + 49297) % 233280;
        return seedValue / 233280;
    };
    
    // Shuffle the story IDs using Fisher-Yates with seeded random
    const shuffledStories = [...storyIds];
    for (let i = shuffledStories.length - 1; i > 0; i--) {
        const j = Math.floor(seededRandom() * (i + 1));
        [shuffledStories[i], shuffledStories[j]] = [shuffledStories[j], shuffledStories[i]];
    }
    
    // Create a mapping from training day to story number
    const mapping = {};
    for (let day = 1; day <= 4; day++) {
        // Use modulo to handle cases with fewer stories than days
        mapping[day] = shuffledStories[(day - 1) % shuffledStories.length];
    }
    
    return mapping;
};

// Get the randomized story number for a specific training day
const getStoryForTrainingDay = (day, userId = null) => {
    const mapping = randomizeTrainingStories(userId);
    return mapping[day] || null;
};

export {
    stratifyAndRandomizeFiles,
    getGroupForPhase,
    randomizeComprehensionStories,
    getStoriesForPhase,
    randomizeEffortFiles,
    getEffortFilesForPhase,
    randomizeTrainingStories,
    getStoryForTrainingDay
};