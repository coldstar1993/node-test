const axios = require("axios");
const fs = require("fs");
const path = require("path");

const endpoint = "https://mina-node.devnet.nori.it.com/graphql";
const logFile = path.join(__dirname, "mina-monitor.jsonl");

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

// Membership query
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

const variables = {
  accountInfos: [
    {
      publicKey: "B62qqj6zf4j2wjz5Vuxztud4XnAFnHZat2JeKf1FwybkrkH491tR7ZR",
      token: "xKHyyiq2ddBz8dSQZV64WUPyLCgENXgeUAFop5whyGVCDMVNdp",
    },
  ],
};

function logResult(data) {
  const logEntry = JSON.stringify(data) + "\n";
  fs.appendFileSync(logFile, logEntry);

  // Also print to console
  const status = data.membershipSuccess ? "OK" : "FAIL";
  console.log(
    `[${data.timestamp}] ${status} Best Chain: ${
      data.bestChainStatus
    } | Membership: ${data.membershipStatus} | Block: ${
      data.blockHeight || "N/A"
    }`
  );
}

async function queryBestChain() {
  const startTime = Date.now();
  try {
    const response = await axios.post(
      endpoint,
      { query: bestChainQuery },
      { headers: { "Content-Type": "application/json" } }
    );

    const elapsed = Date.now() - startTime;
    const latestBlock = response.data?.data?.bestChain?.[0];

    if (latestBlock) {
      return {
        success: true,
        stateHash: latestBlock.stateHash,
        blockHeight: latestBlock.protocolState.consensusState.blockHeight,
        statusCode: response.status,
        elapsed,
        responseData: response.data,
      };
    } else {
      return {
        success: false,
        error: "No data in response",
        statusCode: response.status,
        elapsed,
        responseData: response.data,
      };
    }
  } catch (err) {
    const elapsed = Date.now() - startTime;
    return {
      success: false,
      error: err.message,
      statusCode: err.response?.status || null,
      elapsed,
      responseData: err.response?.data || null,
    };
  }
}

async function queryMembership(stateHash) {
  const startTime = Date.now();
  try {
    const response = await axios.post(
      endpoint,
      {
        query: accountQuery,
        variables: { ...variables, stateHash },
      },
      { headers: { "Content-Type": "application/json" } }
    );

    const elapsed = Date.now() - startTime;
    const hasData = response.data?.data?.encodedSnarkedLedgerAccountMembership;

    return {
      success: true,
      hasData: !!hasData,
      statusCode: response.status,
      elapsed,
      responseData: response.data,
    };
  } catch (err) {
    const elapsed = Date.now() - startTime;
    return {
      success: false,
      error: err.message,
      statusCode: err.response?.status || null,
      elapsed,
      responseData: err.response?.data || null,
    };
  }
}

async function runMonitoringCycle() {
  const timestamp = new Date().toISOString();

  // Query best chain
  const bestChainResult = await queryBestChain();

  // Query membership if we got a state hash
  let membershipResult = null;
  if (bestChainResult.success && bestChainResult.stateHash) {
    membershipResult = await queryMembership(bestChainResult.stateHash);
  }

  // Log the results
  const logData = {
    timestamp,
    bestChainSuccess: bestChainResult.success,
    bestChainStatus: bestChainResult.statusCode,
    bestChainElapsed: bestChainResult.elapsed,
    bestChainResponseData: bestChainResult.responseData,
    stateHash: bestChainResult.stateHash || null,
    blockHeight: bestChainResult.blockHeight || null,
    bestChainError: bestChainResult.error || null,
    membershipSuccess: membershipResult?.success || false,
    membershipStatus: membershipResult?.statusCode || null,
    membershipElapsed: membershipResult?.elapsed || null,
    membershipResponseData: membershipResult?.responseData || null,
    membershipHasData: membershipResult?.hasData || false,
    membershipError: membershipResult?.error || null,
  };

  logResult(logData);
}

async function main() {
  console.log("Starting Mina Blockchain Monitor");
  console.log(`Endpoint: ${endpoint}`);
  console.log(`Log file: ${logFile}`);
  console.log("Press Ctrl+C to stop\n");

  // Create/clear log file
  fs.writeFileSync(logFile, "");

  // Run forever
  while (true) {
    try {
      await runMonitoringCycle();
    } catch (err) {
      console.error("Unexpected error in monitoring cycle:", err.message);
    }

    // Wait 30 seconds between queries
    await new Promise((resolve) => setTimeout(resolve, 30000));
  }
}

// Handle graceful shutdown
process.on("SIGINT", () => {
  console.log("\n\nStopping monitor...");
  process.exit(0);
});

main();
