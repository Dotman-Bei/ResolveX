import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { abi, createAccount, createClient } from "genlayer-js";
import { localnet, studionet, testnetAsimov } from "genlayer-js/chains";
import {
  createPublicClient,
  encodeFunctionData,
  http,
  parseEther,
  parseEventLogs,
  zeroAddress,
} from "viem";

const root = process.cwd();

function loadEnvFile(file) {
  if (!existsSync(file)) return;
  for (const line of readFileSync(file, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#") || !trimmed.includes("=")) continue;
    const [key, ...rest] = trimmed.split("=");
    if (!process.env[key]) process.env[key] = rest.join("=").replace(/^["']|["']$/g, "");
  }
}

loadEnvFile(path.join(root, ".env.local"));
loadEnvFile(path.join(root, ".env"));

const privateKey = process.env.GENLAYER_PRIVATE_KEY;
const factory = process.env.NEXT_PUBLIC_MARKET_FACTORY_ADDR;
if (!privateKey) throw new Error("Set GENLAYER_PRIVATE_KEY in .env.local.");
if (!factory || !/^0x[a-fA-F0-9]{40}$/.test(factory)) {
  throw new Error("Set NEXT_PUBLIC_MARKET_FACTORY_ADDR by running npm run genlayer:deploy first.");
}

const networkName = process.env.GENLAYER_NETWORK ?? process.env.NEXT_PUBLIC_GENLAYER_NETWORK ?? "testnetAsimov";
const rpc = process.env.GENLAYER_RPC ?? process.env.NEXT_PUBLIC_GENLAYER_RPC ?? "https://rpc-asimov.genlayer.com";
const configuredConsensusAddress =
  process.env.NEXT_PUBLIC_GENLAYER_CONSENSUS_ADDR ??
  process.env.GENLAYER_CONSENSUS_ADDR ??
  (networkName === "testnetAsimov"
    ? "0xe66B434bc83805f380509642429eC8e43AE9874a"
    : undefined);
const baseChain =
  networkName === "localnet" ? localnet : networkName === "studionet" ? studionet : testnetAsimov;
const chain = {
  ...baseChain,
  rpcUrls: {
    ...baseChain.rpcUrls,
    default: { http: [rpc || baseChain.rpcUrls.default.http[0].trim()] },
  },
  ...(configuredConsensusAddress
    ? {
        consensusMainContract: {
          ...baseChain.consensusMainContract,
          address: configuredConsensusAddress,
        },
      }
    : {}),
};

const account = createAccount(privateKey);
const client = createClient({ chain, account });
const publicClient = createPublicClient({
  chain,
  transport: http(chain.rpcUrls.default.http[0]),
});

async function rpcRequest(method, params) {
  const response = await fetch(chain.rpcUrls.default.http[0], {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: Date.now(),
      method,
      params,
    }),
  });
  const body = await response.json();
  if (body.error) {
    throw new Error(body.error.message ?? JSON.stringify(body.error));
  }
  return body.result;
}

function executionResultName(receipt) {
  if (receipt.txExecutionResultName) return receipt.txExecutionResultName;
  if (receipt.txExecutionResult === 0) return "NOT_VOTED";
  if (receipt.txExecutionResult === 1) return "FINISHED_WITH_RETURN";
  if (receipt.txExecutionResult === 2) return "FINISHED_WITH_ERROR";
  return undefined;
}

async function debugTraceSummary(hash) {
  try {
    const trace = await rpcRequest("gen_dbg_traceTransaction", [{ txID: hash, round: 0 }]);
    const returnData =
      typeof trace?.return_data === "string" && trace.return_data.startsWith("0x")
        ? Buffer.from(trace.return_data.slice(2), "hex").toString("utf8")
        : "";
    const logs = Array.isArray(trace?.genvm_log)
      ? trace.genvm_log.map((entry) => JSON.stringify(entry)).join("\n")
      : "";
    return [
      `result_code=${trace?.result_code ?? "unknown"}`,
      returnData ? `return_data=${returnData}` : "",
      trace?.stderr ? `stderr=${trace.stderr}` : "",
      logs ? `genvm_log=${logs}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  } catch (error) {
    return `debug trace unavailable: ${error instanceof Error ? error.message : String(error)}`;
  }
}

async function hasContractCode(address) {
  try {
    const code = await rpcRequest("gen_getContractCode", [{ address }]);
    return typeof code === "string" && code.length > 0;
  } catch (error) {
    const message = String(error?.message ?? error);
    if (message.includes("contract not found") || message.includes("contract code not found")) {
      return false;
    }
    throw error;
  }
}

async function assertContractExists(address, label) {
  if (await hasContractCode(address)) return;
  throw new Error(
    `${label} is not deployed on GenLayer at ${address}. Re-run npm run genlayer:deploy after the contract-format fix.`
  );
}

async function waitForContractCode(address, label) {
  // gl.deploy_contract from inside a contract triggers a separate consensus
  // round for the child deploy. Give it generous headroom on Testnet Asimov.
  for (let i = 0; i < 120; i += 1) {
    if (await hasContractCode(address)) return;
    if (i % 6 === 0) console.log(`${label} code not indexed yet at ${address}; retrying...`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error(`${label} code never indexed at ${address} after 10 minutes`);
}

async function resolveConsensusMainAddress() {
  if (networkName !== "testnetAsimov") return chain.consensusMainContract?.address;

  const asimovAddressManager = "0xe66B434bc83805f380509642429eC8e43AE9874a";
  if (
    configuredConsensusAddress &&
    configuredConsensusAddress.toLowerCase() !== asimovAddressManager.toLowerCase()
  ) {
    const code = await publicClient.getCode({ address: configuredConsensusAddress });
    if (!code || code === "0x") {
      throw new Error(`Configured ConsensusMain has no code: ${configuredConsensusAddress}`);
    }
    chain.consensusMainContract = {
      ...chain.consensusMainContract,
      address: configuredConsensusAddress,
    };
    return configuredConsensusAddress;
  }

  const addressManager =
    configuredConsensusAddress ?? asimovAddressManager;
  const addressManagerAbi = [
    {
      type: "function",
      name: "getAddress",
      stateMutability: "view",
      inputs: [{ name: "name", type: "string" }],
      outputs: [{ name: "", type: "address" }],
    },
  ];

  const consensusMain = await publicClient.readContract({
    address: addressManager,
    abi: addressManagerAbi,
    functionName: "getAddress",
    args: ["ConsensusMain"],
  });
  const code = await publicClient.getCode({ address: consensusMain });
  if (!code || code === "0x") {
    throw new Error(`Resolved ConsensusMain has no code: ${consensusMain}`);
  }
  chain.consensusMainContract = {
    ...chain.consensusMainContract,
    address: consensusMain,
  };
  return consensusMain;
}

async function wait(hash, label) {
  console.log(`${label} tx: ${hash}`);
  for (let i = 0; i < 180; i += 1) {
    let receipt;
    try {
      receipt = await rpcRequest("gen_getTransactionReceipt", [{ txId: hash }]);
    } catch (error) {
      const message = String(error?.message ?? error);
      if (message.includes("fetch failed")) {
        console.warn(`Receipt fetch failed for ${hash}; retrying...`);
      } else if (!message.includes("not found")) {
        throw new Error(`Receipt error: ${error instanceof Error ? error.message : String(error)}`);
      }
    }
    if (receipt) {
      // Empirical status mapping for testnet Asimov:
      //   5  = ACCEPTED (state committed, awaiting finalization)
      //   6  = UNDETERMINED / consensus failed
      //   7  = pending more validator rounds (NOT committed yet)
      //   13 = pending leader proposal
      //   14 = FINALIZED
      const statusName =
        receipt.statusName ??
        receipt.status_name ??
        (receipt.status === 5
          ? "ACCEPTED"
          : receipt.status === 14
            ? "FINALIZED"
            : receipt.status === 6
              ? "UNDETERMINED"
              : "");
      const execName = executionResultName(receipt);
      if (execName === "FINISHED_WITH_ERROR") {
        const trace = await debugTraceSummary(hash);
        throw new Error(`${label} GenVM execution failed\n${trace}`);
      }
      if (
        (statusName === "ACCEPTED" || statusName === "FINALIZED") &&
        execName === "FINISHED_WITH_RETURN"
      ) {
        console.log(`${label} ${statusName.toLowerCase()}`);
        return receipt;
      }
      if (statusName === "UNDETERMINED") {
        const trace = await debugTraceSummary(hash);
        throw new Error(`Consensus failed: ${JSON.stringify(receipt)}\n${trace}`);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error(`Timed out waiting for GenLayer transaction ${hash}`);
}

async function read(address, functionName, args = []) {
  return client.readContract({ address, functionName, args });
}

function calldataObject(method, args = [], kwargs) {
  const data = {};
  if (method) data.method = method;
  if (args.length > 0) data.args = args;
  if (kwargs && Object.keys(kwargs).length > 0) data.kwargs = kwargs;
  return data;
}

function serializedCallData(functionName, args = [], leaderOnly = false) {
  return abi.transactions.serialize([
    abi.calldata.encode(calldataObject(functionName, args)),
    leaderOnly,
  ]);
}

function addTransactionInputCount() {
  const addTransaction = chain.consensusMainContract?.abi?.find(
    (item) => item?.type === "function" && item?.name === "addTransaction"
  );
  return Array.isArray(addTransaction?.inputs) ? addTransaction.inputs.length : 0;
}

function addTransactionArgs(recipient, data) {
  const args = [
    account.address,
    recipient,
    chain.defaultNumberOfInitialValidators,
    chain.defaultConsensusMaxRotations,
    data,
  ];
  if (addTransactionInputCount() >= 6) {
    args.push(BigInt(Math.floor(Date.now() / 1000) + 3600));
  }
  return args;
}

async function sendConsensusTransaction({ recipient, data, value = 0n }) {
  const consensus = chain.consensusMainContract;
  if (!consensus?.address || !consensus?.abi) {
    throw new Error("ConsensusMain is not configured for this network.");
  }

  const encodedData = encodeFunctionData({
    abi: consensus.abi,
    functionName: "addTransaction",
    args: addTransactionArgs(recipient, data),
  });

  const nonce = await publicClient.getTransactionCount({
    address: account.address,
    blockTag: "pending",
  });
  const gasPrice = await publicClient.getGasPrice();
  let gas;
  try {
    gas = await publicClient.estimateGas({
      account: account.address,
      to: consensus.address,
      data: encodedData,
      value,
    });
  } catch {
    gas = 8_000_000n;
  }

  const signed = await account.signTransaction({
    chainId: chain.id,
    to: consensus.address,
    data: encodedData,
    value,
    nonce,
    gas: (gas * 13n) / 10n,
    gasPrice,
    type: "legacy",
  });

  const evmHash = await publicClient.sendRawTransaction({ serializedTransaction: signed });
  const receipt = await publicClient.waitForTransactionReceipt({ hash: evmHash });
  if (receipt.status === "reverted") {
    throw new Error(`Consensus transaction reverted: ${evmHash}`);
  }

  const events = parseEventLogs({
    abi: consensus.abi,
    eventName: "NewTransaction",
    logs: receipt.logs,
  });
  const createdEvents = parseEventLogs({
    abi: [
      {
        anonymous: false,
        inputs: [
          { indexed: true, internalType: "bytes32", name: "txId", type: "bytes32" },
          { indexed: false, internalType: "uint256", name: "txSlot", type: "uint256" },
        ],
        name: "CreatedTransaction",
        type: "event",
      },
    ],
    eventName: "CreatedTransaction",
    logs: receipt.logs,
  });
  const txId = events[0]?.args?.txId ?? createdEvents[0]?.args?.txId;
  if (!txId) {
    throw new Error(
      `Transaction was mined but no NewTransaction event was emitted. EVM tx: ${evmHash}`
    );
  }
  return txId;
}

async function write(address, functionName, args = [], value = 0n) {
  const hash = await sendConsensusTransaction({
    recipient: address,
    data: serializedCallData(functionName, args),
    value,
  });
  await wait(hash, functionName);
}

function serializedDeployData(code, constructorArgs = [], leaderOnly = false) {
  return abi.transactions.serialize([
    code,
    abi.calldata.encode(calldataObject(undefined, constructorArgs)),
    leaderOnly,
  ]);
}

function deployedAddress(receipt) {
  return (
    receipt?.txDataDecoded?.contractAddress ??
    receipt?.data?.contract_address ??
    receipt?.createdContractAddress ??
    receipt?.contractAddress ??
    receipt?.recipient ??
    receipt?.to_address
  );
}

async function deployContract(label, code, args, value = 0n) {
  console.log(`Deploying ${label}...`);
  const hash = await sendConsensusTransaction({
    recipient: zeroAddress,
    data: serializedDeployData(code, args),
    value,
  });
  const receipt = await wait(hash, label);
  const address = deployedAddress(receipt);
  if (!address) throw new Error(`No address in deploy receipt: ${JSON.stringify(receipt)}`);
  await waitForContractCode(address, label);
  console.log(`${label} address: ${address}`);
  return address;
}

function normalizeAddress(value) {
  if (typeof value === "string") return value;
  if (value?.bytes instanceof Uint8Array) {
    return `0x${Array.from(value.bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")}`;
  }
  return String(value);
}

const question =
  process.env.GENLAYER_TEST_QUESTION ?? "Is the GenLayer Testnet Asimov network live in 2026?";
const resolutionDate = process.env.GENLAYER_TEST_RESOLUTION_DATE ?? new Date().toISOString();
const stake = process.env.GENLAYER_TEST_STAKE ?? "0.01";
const category = process.env.GENLAYER_TEST_CATEGORY ?? "tech";

console.log(`Using ConsensusMain: ${await resolveConsensusMainAddress()}`);
await assertContractExists(factory, "MarketFactory");

const predictionMarketSource = readFileSync(
  path.join(root, "contracts", "prediction_market.py"),
  "utf8"
);

const market = await deployContract("PredictionMarket", predictionMarketSource, [
  question,
  resolutionDate,
  category,
]);

console.log("Registering with factory...");
await write(factory, "register_market", [market, category]);

await write(market, "place_bet", ["YES"], parseEther(stake));
await write(market, "resolve_market");

const info = await read(market, "get_market_info");
console.log("Resolved market info:");
console.log(JSON.stringify(info, null, 2));
