require('dotenv').config();
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

// Auto-detect environment from your .env
const plaidEnv = process.env.PLAID_ENV === 'development' ? PlaidEnvironments.development : PlaidEnvironments.sandbox;

const configuration = new Configuration({
  basePath: plaidEnv,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const client = new PlaidApi(configuration);

// Use this to generate a NEW link token
async function getLinkToken() {
    try {
        const response = await client.linkTokenCreate({
            user: { client_user_id: process.env.CLIENT_USER_ID },
            client_name: 'Hierarchy Investment Capital',
            products: ['transactions'],
            country_codes: ['CA'],
            language: 'en',
        });
        console.log("\x1b[32m--- NEW LINK TOKEN ---\x1b[0m");
        console.log(response.data.link_token);
    } catch (e) { console.error(e.response?.data || e.message); }
}

// Run this: node app.js --link
if (process.argv[2] === '--link') getLinkToken();

