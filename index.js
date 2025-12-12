const axios = require("axios");

//const endpoint = "https://api.minascan.io/node/devnet/v1/graphql"; // This is buggy as hell nothing works
const endpoint = "https://mina-node.devnet.nori.it.com/graphql"; // This endpoint works more reliably, currently for me works (**edit** as of 12 Dec it does not!) for the newStateHash (but this might change after some time ¯\_(ツ)_/¯ - **edit** it did!) but not the oldStateHash

const latestStateHash = "3NLeA2QvCnLLU2GoMTAmStGd2FYXLrFc8DHR7PgyyDegAs1h1Jxz"; // Current (has issue)
const newerIssueStateHash = "3NKsQEhABM4toSqfjb1QjrCk2SzpWbfDHJ2BMMc5Sk7KxnS3xoTf"; // Fairly recent (one with issue)
const newIssueStateHash = "3NKgkDjJrtT1UevsfgTzVewJL6sWEZe9tQbJn2irYFXNyRFRreTU"; // From github issue (has issue)
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
        publicKey: "B62qqj6zf4j2wjz5Vuxztud4XnAFnHZat2JeKf1FwybkrkH491tR7ZR",
        token: "xKHyyiq2ddBz8dSQZV64WUPyLCgENXgeUAFop5whyGVCDMVNdp",
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
  const dynamicLatestStateHash = await getLatestStateHash();

  // Step 2: Test with dynamically fetched LATEST state hash (only if we got one)
  if (dynamicLatestStateHash) {
    await testQuery(dynamicLatestStateHash, "DYNAMIC LATEST (Dynamically Fetched) StateHash");
  } else {
    console.log(`${"=".repeat(60)}`);
    console.log("Skipping LATEST StateHash test (failed to fetch)");
    console.log(`${"=".repeat(60)}\n`);
  }

  // Step 3: Test with latest hardcoded state hash
  await testQuery(latestStateHash, "LATEST (Hardcoded) StateHash");

  // Step 4: Test with newer issue hardcoded state hash
  await testQuery(newerIssueStateHash, "NEWER ISSUE (Hardcoded) StateHash");

  // Step 5: Test with new issue hardcoded state hash
  await testQuery(newIssueStateHash, "NEW ISSUE (Hardcoded from Issue) StateHash");

  // Step 6: Test with old hardcoded state hash
  await testQuery(oldStateHash, "OLD (Hardcoded) StateHash");
}

main();