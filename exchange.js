require('dotenv').config();
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

const configuration = new Configuration({
  basePath: PlaidEnvironments.sandbox,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const client = new PlaidApi(configuration);

async function exchangeToken() {
  try {
    const response = await client.itemPublicTokenExchange({
      public_token: 'public-sandbox-7cf269c7-9e7a-4e81-a469-4c7c45733e39',
    });
    console.log("\n\x1b[42m\x1b[30m SUCCESS: PERMANENT ACCESS TOKEN OBTAINED \x1b[0m");
    console.log(response.data.access_token);
    console.log("\nCopy the 'access-sandbox-...' string above and save it.");
  } catch (err) {
    console.error("\n\x1b[41m Exchange Error \x1b[0m");
    console.error(err.response?.data || err.message);
  }
}

exchangeToken();
