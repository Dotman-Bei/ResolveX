import { readFileSync, existsSync, writeFileSync } from "node:fs";
import path from "node:path";
import { abi, createAccount, createClient } from "genlayer-js";
import { localnet, studionet, testnetAsimov } from "genlayer-js/chains";
import {
  createPublicClient,
  encodeFunctionData,
  http,
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

const networkName = process.env.GENLAYER_NETWORK ?? process.env.NEXT_PUBLIC_GENLAYER_NETWORK ?? "testnetAsimov";
const rpc = process.env.GENLAYER_RPC ?? process.env.NEXT_PUBLIC_GENLAYER_RPC ?? "https://rpc-asimov.genlayer.com";
const configuredConsensusAddress =
  process.env.NEXT_PUBLIC_GENLAYER_CONSENSUS_ADDR ??
  process.env.GENLAYER_CONSENSUS_ADDR ??
  (networkName === "testnetAsimov"
    ? "0xe66B434bc83805f380509642429eC8e43AE9874a"
    : undefined);
const privateKey = process.env.GENLAYER_PRIVATE_KEY;

if (!privateKey) {
  throw new Error("Set GENLAYER_PRIVATE_KEY in .env.local before deploying.");
}

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

const sourceText = (name) => readFileSync(path.join(root, "contracts", name), "utf8");
const sourceBytes = (name) => readFileSync(path.join(root, "contracts", name));
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

async function waitForContractCode(address, label) {
  for (let i = 0; i < 24; i += 1) {
    if (await hasContractCode(address)) return true;
    console.log(`${label} code not indexed yet at ${address}; retrying...`);
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  return false;
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

async function wait(hash) {
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
      const statusName =
        receipt.statusName ??
        receipt.status_name ??
        (receipt.status === 5 || receipt.status === 7 || receipt.status === 14
          ? "ACCEPTED"
          : "");
      const execName = executionResultName(receipt);
      if (execName === "FINISHED_WITH_ERROR") {
        const trace = await debugTraceSummary(hash);
        throw new Error(`GenVM execution failed for ${hash}\n${trace}`);
      }
      if (
        (statusName === "ACCEPTED" || statusName === "FINALIZED" || receipt.status === 14) &&
        execName === "FINISHED_WITH_RETURN"
      ) {
        return receipt;
      }
      if (receipt.status === 6 || statusName === "UNDETERMINED") {
        const trace = await debugTraceSummary(hash);
        throw new Error(`Consensus failed: ${JSON.stringify(receipt)}\n${trace}`);
      }
    }
    await new Promise((resolve) => setTimeout(resolve, 5000));
  }
  throw new Error(`Timed out waiting for GenLayer transaction ${hash}`);
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

function calldataObject(method, args = [], kwargs) {
  const data = {};
  if (method) data.method = method;
  if (args.length > 0) data.args = args;
  if (kwargs && Object.keys(kwargs).length > 0) data.kwargs = kwargs;
  return data;
}

function serializedDeployData(code, constructorArgs = [], leaderOnly = false) {
  return abi.transactions.serialize([
    code,
    abi.calldata.encode(calldataObject(undefined, constructorArgs)),
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

async function deployContract(label, code, args) {
  console.log(`Deploying ${label} to ${networkName} (${chain.rpcUrls.default.http[0]})`);
  const hash = await sendConsensusTransaction({
    recipient: zeroAddress,
    data: serializedDeployData(code, args),
  });
  console.log(`${label} tx: ${hash}`);
  const receipt = await wait(hash);
  const address = deployedAddress(receipt);
  if (!address) {
    throw new Error(`Could not extract ${label} address from receipt: ${JSON.stringify(receipt)}`);
  }
  if (!(await waitForContractCode(address, label))) {
    const trace = await debugTraceSummary(hash);
    throw new Error(`${label} did not deploy contract code at ${address}\n${trace}`);
  }
  console.log(`${label} address: ${address}`);
  return address;
}

const consensusAddress = await resolveConsensusMainAddress();
console.log(`Using ConsensusMain: ${consensusAddress}`);

const factoryAddress = await deployContract("MarketFactory", sourceText("market_factory.py"), []);
const reputationAddress = await deployContract("ReputationTracker", sourceText("reputation_tracker.py"), [
  factoryAddress,
]);

const envPath = path.join(root, ".env.local");
const currentEnv = existsSync(envPath) ? readFileSync(envPath, "utf8") : "";
const nextValues = {
  NEXT_PUBLIC_GENLAYER_MODE: "live",
  NEXT_PUBLIC_GENLAYER_NETWORK: networkName,
  NEXT_PUBLIC_GENLAYER_RPC: chain.rpcUrls.default.http[0],
  ...(consensusAddress ? { NEXT_PUBLIC_GENLAYER_CONSENSUS_ADDR: consensusAddress } : {}),
  NEXT_PUBLIC_MARKET_FACTORY_ADDR: factoryAddress,
  NEXT_PUBLIC_REPUTATION_ADDR: reputationAddress,
};

const lines = currentEnv
  .split(/\r?\n/)
  .filter((line) => line.trim() && !Object.keys(nextValues).some((key) => line.startsWith(`${key}=`)));
for (const [key, value] of Object.entries(nextValues)) {
  lines.push(`${key}=${value}`);
}
writeFileSync(envPath, `${lines.join("\n")}\n`);

console.log("Updated .env.local with live ResolveX addresses.");
console.log({
  NEXT_PUBLIC_MARKET_FACTORY_ADDR: factoryAddress,
  NEXT_PUBLIC_REPUTATION_ADDR: reputationAddress,
});
