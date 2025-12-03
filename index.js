const axios = require("axios");

//const endpoint = "https://api.minascan.io/node/devnet/v1/graphql"; // This is buggy as hell nothing works
const endpoint = "https://mina-node.devnet.nori.it.com/graphql"; // This endpoint works for the latest reliably, currently for me works for the newStateHash (but this might change after some time ¯\_(ツ)_/¯) but not the oldStateHash

const newStateHash = "3NKgkDjJrtT1UevsfgTzVewJL6sWEZe9tQbJn2irYFXNyRFRreTU"; // From issue
const oldStateHash = "3NL5hv4ysELXF2Tg5UZDMgBFcQLTM1tGtRRzMhgyLa5EzvbeDQhq"; // Original

// Query to get latest block
const bestChainQuery = `
  query {
    bestChain(maxLength: 1) {
      stateHash
      protocolState {
        consensusState {
          blockHeight
        }
      }
    }
  }
`;

// Main query
const accountQuery = `
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
}
`;

async function getLatestStateHash() {
  console.log("Fetching latest state hash...");
  const startTime = Date.now();

  try {
    const response = await axios.post(
      endpoint,
      {
        query: bestChainQuery,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    const latestBlock = response.data?.data?.bestChain?.[0];
    if (latestBlock) {
      const stateHash = latestBlock.stateHash;
      const blockHeight = latestBlock.protocolState.consensusState.blockHeight;
      console.log(`✓ Fetched in ${elapsed} seconds`);
      console.log(`  Latest stateHash: ${stateHash}`);
      console.log(`  Block height: ${blockHeight}\n`);
      return stateHash;
    } else {
      console.log(`✗ No data returned after ${elapsed} seconds\n`);
      return null;
    }
  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.error(
      `✗ Failed to fetch latest state hash after ${elapsed} seconds:`,
      err.message
    );
    return null;
  }
}

async function testQuery(stateHash, label) {
  console.log(`${"=".repeat(60)}`);
  console.log(`Testing with ${label}`);
  console.log(`StateHash: ${stateHash}`);
  console.log("=".repeat(60));

  const variables = {
    stateHash: stateHash,
    accountInfos: [
      {
        publicKey: "B62qrLDt9eM5AVz84YnZWME3VMY4CQjiTH29WuBPRQQi54gD8Murrvn",
        token: "xFGpiVZhxrVsiuse2vxQKL7J3y1aqPcnVqm4kBTYNmzLR1XL5P",
      },
    ],
  };

  const startTime = Date.now();

  try {
    const response = await axios.post(
      endpoint,
      {
        query: accountQuery,
        variables,
      },
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✓ SUCCESS (${elapsed} seconds)`);
    console.log("Response:", JSON.stringify(response.data, null, 2));
  } catch (err) {
    const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);
    console.log(`✗ FAILED (${elapsed} seconds)`);
    console.log("Error:", err.message);
    if (err.response) {
      console.log("Status:", err.response.status);
      console.log("Response:", JSON.stringify(err.response.data, null, 2));
    }
  }
  console.log();
}

async function main() {
  // Step 1: Get latest state hash dynamically
  const latestStateHash = await getLatestStateHash();

  // Step 2: Test with dynamically fetched LATEST state hash (only if we got one)
  if (latestStateHash) {
    await testQuery(latestStateHash, "LATEST (Dynamically Fetched) StateHash");
  } else {
    console.log(`${"=".repeat(60)}`);
    console.log("Skipping LATEST StateHash test (failed to fetch)");
    console.log(`${"=".repeat(60)}\n`);
  }

  // Step 3: Test with NEW hardcoded state hash from issue (always run)
  await testQuery(newStateHash, "NEW (Hardcoded from Issue) StateHash");

  // Step 4: Test with OLD hardcoded state hash (always run)
  await testQuery(oldStateHash, "OLD (Original Hardcoded) StateHash");
}

main();
