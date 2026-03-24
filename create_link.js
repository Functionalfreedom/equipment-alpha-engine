require('dotenv').config();
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

const configuration = new Configuration({
  // CHANGED: This must be 'sandbox' to match your secret
  basePath: PlaidEnvironments.sandbox, 
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const client = new PlaidApi(configuration);

async function createLinkToken() {
  try {
    const response = await client.linkTokenCreate({
      user: { client_user_id: 'hierarchy-test-user-v2' },
      client_name: 'Hierarchy Investment Capital (Sandbox)',
      products: ['auth', 'transactions'],
      country_codes: ['CA'],
      language: 'en',
    });
    console.log("\n\x1b[42m\x1b[30m SUCCESS: SANDBOX LINK TOKEN CREATED \x1b[0m");
    console.log(response.data.link_token);
  } catch (err) {
    console.error("\n\x1b[41m Plaid Error \x1b[0m");
    console.error(err.response?.data || err.message);
  }
}

createLinkToken();
