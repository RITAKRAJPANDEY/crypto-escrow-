import "dotenv/config";

import { ethers } from "ethers";

const { RPC_URL, PRIVATE_KEY } = process.env;

if (!RPC_URL) {
  throw new Error("RPC_URL is not set in .env");
}

if (!PRIVATE_KEY) {
  throw new Error("PRIVATE_KEY is not set in .env");
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const wallet = new ethers.Wallet(PRIVATE_KEY, provider);

export { provider, wallet };
