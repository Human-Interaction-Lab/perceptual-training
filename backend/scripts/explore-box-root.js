// scripts/explore-box-root.js
require('dotenv').config();
const BoxSDK = require('box-node-sdk');

async function exploreBox() {
    try {
        console.log('Connecting to Box...');

        // Initialize SDK with your app credentials
        const sdk = new BoxSDK({
            clientID: process.env.BOX_CLIENT_ID,
            clientSecret: process.env.BOX_CLIENT_SECRET,
            appAuth: {
                keyID: process.env.BOX_KEY_ID,
                privateKey: process.env.BOX_PRIVATE_KEY,
                passphrase: process.env.BOX_PASSPHRASE
            }
        });

        // Get enterprise client
        console.log('Enterprise ID:', process.env.BOX_ENTERPRISE_ID);
        const client = sdk.getAppAuthClient('enterprise', process.env.BOX_ENTERPRISE_ID);

        // Always start from root (id: 0)
        console.log('Exploring root folder (id: 0)...');
        const rootItems = await client.folders.getItems('0');

        console.log(`\nFound ${rootItems.total_count} items in root folder:`);
        rootItems.entries.forEach(item => {
            console.log(`- ${item.type}: ${item.name} (ID: ${item.id})`);
        });

        // Allow exploring a specific subfolder
        if (process.argv[2]) {
            const folderName = process.argv[2];
            console.log(`\nLooking for folder: ${folderName}`);

            const targetFolder = rootItems.entries.find(
                entry => entry.type === 'folder' && entry.name === folderName
            );

            if (targetFolder) {
                console.log(`Found folder ${folderName}. Exploring contents...`);
                const folderContents = await client.folders.getItems(targetFolder.id);

                console.log(`\nFound ${folderContents.total_count} items in folder ${folderName}:`);
                folderContents.entries.forEach(item => {
                    console.log(`- ${item.type}: ${item.name} (ID: ${item.id})`);
                });
            } else {
                console.log(`Folder "${folderName}" not found in root directory.`);
            }
        }

        console.log('\nExploration complete.');
    } catch (error) {
        console.error('Error exploring Box:', error);

        // Print more detailed error info
        if (error.response && error.response.body) {
            console.error('Error details:', JSON.stringify(error.response.body, null, 2));
        }
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