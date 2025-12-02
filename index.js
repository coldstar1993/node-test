// filename: queryMinaGraphQL.js
const axios = require("axios");

const endpoint = "https://api.minascan.io/node/devnet/v1/graphql";

// GraphQL query
const query = `
query EncodedSnarkedLedgerAccountMembership($stateHash: String!, $accountInfos: [AccountInput!]!) {
  encodedSnarkedLedgerAccountMembership(stateHash: $stateHash, accountInfos: $accountInfos) {
    account
    merklePath {
      left
      right
    }
  }
  block(stateHash: $stateHash) {
    protocolState {
      blockchainState {
          snarkedLedgerHash
      }
    }
}
`;

// Variables
const variables = {
  stateHash: "3NL5hv4ysELXF2Tg5UZDMgBFcQLTM1tGtRRzMhgyLa5EzvbeDQhq",
  accountInfos: [
    {
      publicKey: "B62qrLDt9eM5AVz84YnZWME3VMY4CQjiTH29WuBPRQQi54gD8Murrvn",
      token: "xFGpiVZhxrVsiuse2vxQKL7J3y1aqPcnVqm4kBTYNmzLR1XL5P"
    }
  ]
};

async function main() {
  for (let i = 0; i < 10; i++) {
    try {
      const response = await axios.post(endpoint, {
        query,
        variables
      }, {
        headers: {
          "Content-Type": "application/json"
        }
      });

      console.log("Response data:", JSON.stringify(response.data, null, 2));
    } catch (err) {
      console.error("Error querying GraphQL:", err.message);
    }
  }
}

main();
