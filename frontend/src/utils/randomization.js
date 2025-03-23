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
        // Simple seeded random function
        const seededRandom = () => {
            seed = (seed * 9301 + 49297) % 233280;
            return seed / 233280;
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

export { stratifyAndRandomizeFiles, getGroupForPhase };