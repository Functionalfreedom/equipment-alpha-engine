require('dotenv').config();
const { Configuration, PlaidApi, PlaidEnvironments } = require('plaid');

// This logic automatically detects if you are Live or Testing
const environment = process.env.PLAID_ENV === 'development' 
    ? PlaidEnvironments.development 
    : PlaidEnvironments.sandbox;

const configuration = new Configuration({
  basePath: environment,
  baseOptions: {
    headers: {
      'PLAID-CLIENT-ID': process.env.PLAID_CLIENT_ID,
      'PLAID-SECRET': process.env.PLAID_SECRET,
    },
  },
});

const client = new PlaidApi(configuration);

async function watchForFees() {
  console.log(`\n\x1b[36m RUNNING IN ${process.env.PLAID_ENV.toUpperCase()} MODE \x1b[0m`);
  try {
    const response = await client.transactionsGet({
      access_token: process.env.PLAID_ACCESS_TOKEN,
      start_date: '2026-03-01',
      end_date: '2026-03-21',
    });

    const txns = response.data.transactions;
    const highValue = txns.filter(t => Math.abs(t.amount) >= 2500);

    if (highValue.length > 0) {
        console.log(`\x1b[42m\x1b[30m FOUND ${highValue.length} NEW BROKERAGE FEES \x1b[0m`);
        highValue.forEach(t => console.log(`- ${t.name}: $${Math.abs(t.amount)}`));
    } else {
        console.log("No new high-value deposits detected.");
    }
  } catch (err) {
    console.error("System Error:", err.response?.data?.error_message || err.message);
  }
}

watchForFees();
