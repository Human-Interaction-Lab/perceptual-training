// scripts/explore-box.js
require('dotenv').config();
const BoxService = require('../boxService');

async function exploreBox() {
    try {
        console.log('Connecting to Box...');

        // First check the root folder
        const rootContents = await BoxService.listFolderContents();

        // Allow exploring a specific subfolder
        if (process.argv[2]) {
            const folderName = process.argv[2];
            console.log(`\nLooking for folder: ${folderName}`);

            const targetFolder = rootContents.subfolders.find(f => f.name === folderName);
            if (targetFolder) {
                console.log(`Found folder ${folderName}. Exploring contents...`);
                await BoxService.listFolderContents(targetFolder.id);
            } else {
                console.log(`Folder "${folderName}" not found in root directory.`);
            }
        }

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