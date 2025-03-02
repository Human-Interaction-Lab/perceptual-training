// scripts/explore-box.js
require('dotenv').config();
const BoxService = require('../boxService');

async function exploreBox() {
    try {
        console.log('Connecting to Box...');

        // First check the root folder
        const rootContents = await BoxService.listFolderContents();

        // Get all files for Grace Norman with pagination
        console.log('\nRetrieving all files for Grace Norman...');
        let allFiles = [];
        let offset = 0;
        let hasMoreItems = true;

        while (hasMoreItems) {
            const files = await BoxService.listUserFiles('Grace Norman', { limit: 1000, offset });
            allFiles = allFiles.concat(files);
            console.log(`Retrieved ${files.length} files, total so far: ${allFiles.length}`);

            if (files.length < 1000) {
                hasMoreItems = false;
            } else {
                offset += 1000;
            }
        }

        console.log(`\nTotal files found: ${allFiles.length}`);
        console.log('First 10 files:', allFiles.slice(0, 10));
        console.log('Last 10 files:', allFiles.slice(-10));

        console.log('\nExploration complete.');

    } catch (error) {
        console.error('Error exploring Box:', error);
    }
}

// Execute if run directly
if (require.main === module) {
    exploreBox()
        .then(() => process.exit(0))
        .catch(err => {
            console.error('Script failed:', err);
            process.exit(1);
        });
}