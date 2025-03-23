// for randomization of intelligibility files
const stratifyAndRandomizeFiles = (total, groupSize, seed = null) => {
    // Create array of all file indices [1...total]
    const allIndices = Array.from({ length: total }, (_, i) => i + 1);

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
    // Total of 160 intelligibility files
    const totalFiles = 160;
    const groupSize = 20;

    // Use userId as seed if available for consistent randomization per user
    const seed = userId ? hashString(userId) : null;
    const groups = stratifyAndRandomizeFiles(totalFiles, groupSize, seed);

    // Map phases to group indices (0-7)
    let groupIndex;

    if (phase === 'pretest') {
        groupIndex = 0;
    } else if (phase === 'training') {
        // Training days 1-4 use groups 1-4
        groupIndex = trainingDay;
    } else if (phase === 'posttest1') {
        groupIndex = 5;
    } else if (phase === 'posttest2') {
        groupIndex = 6;
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
const randomizeComprehensionStories = (userId = null) => {
    // Define all available comprehension story IDs (assuming there are 6 total stories)
    const allStoryIds = ["Comp_01", "Comp_02", "Comp_03", "Comp_04", "Comp_05", "Comp_06"];

    // We need to assign 2 stories to each of 3 phases (pretest, posttest1, posttest2)
    // without repetition

    // Generate a seed based on userId
    let seedValue = userId ? hashString(userId) : Math.floor(Math.random() * 10000);

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
    const allPhaseStories = randomizeComprehensionStories(userId);
    return allPhaseStories[phase] || [];
};

export { stratifyAndRandomizeFiles, getGroupForPhase, randomizeComprehensionStories, getStoriesForPhase };