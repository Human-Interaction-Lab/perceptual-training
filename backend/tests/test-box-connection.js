// test-box-connection.js
require('dotenv').config();
const BoxSDK = require('box-node-sdk');

async function testBoxConnection() {
    try {
        console.log('Testing Box connection...');

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
        console.log('Initializing client with enterprise ID:', process.env.BOX_ENTERPRISE_ID);
        const client = sdk.getAppAuthClient('enterprise', process.env.BOX_ENTERPRISE_ID);

        // Try to get current user
        console.log('Attempting to get service account info...');
        const serviceAccount = await client.users.get('me');
        console.log('Successfully authenticated!');
        console.log('Service Account:', {
            id: serviceAccount.id,
            name: serviceAccount.name,
            login: serviceAccount.login
        });

        // List root items (0 is always the root)
        console.log('\nListing items in root folder (id: 0)...');
        const rootItems = await client.folders.getItems('0');
        console.log(`Found ${rootItems.total_count} items in root`);

        rootItems.entries.forEach(item => {
            console.log(`- ${item.type}: ${item.name} (ID: ${item.id})`);
        });

        // List enterprise users
        console.log('\nListing enterprise users...');
        const users = await client.enterprise.getUsers();
        console.log(`Found ${users.total_count} users in enterprise`);

        users.entries.forEach(user => {
            console.log(`- User: ${user.name} (ID: ${user.id}, Login: ${user.login})`);
        });

    } catch (error) {
        console.error('Error connecting to Box:', error);

        // Print more detailed error info
        if (error.response && error.response.body) {
            console.error('Error details:', JSON.stringify(error.response.body, null, 2));
        }
    }
}

testBoxConnection()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Script failed:', err);
        process.exit(1);
    });