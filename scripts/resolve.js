import path from "path";
import fs from "fs";
import { ethers } from "ethers";
import { wallet } from "../config/blockchain.js";

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 2) {
    console.error(
      "Usage: node scripts/resolve.js <contractAddress> <freelancerPercent>"
    );
    process.exit(1);
  }

  const [contractAddress, freelancerPercentRaw] = args;

  if (!ethers.isAddress(contractAddress)) {
    throw new Error("Invalid contract address");
  }

  const freelancerPercent = parseInt(freelancerPercentRaw, 10);
  if (Number.isNaN(freelancerPercent) || freelancerPercent < 0 || freelancerPercent > 100) {
    throw new Error("freelancerPercent must be an integer between 0 and 100");
  }

  const artifactPath = path.resolve(
    __dirname,
    "..",
    "artifacts",
    "contracts",
    "AIEscrow.sol",
    "AIEscrow.json"
  );

  if (!fs.existsSync(artifactPath)) {
    throw new Error(
      "Contract artifact not found. Please run `npx hardhat compile` first."
    );
  }

  const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));
  const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);

  console.log("Calling resolve() with percent:", freelancerPercent);
  const tx = await contract.resolve(freelancerPercent);
  console.log("Tx submitted, hash:", tx.hash);
  const receipt = await tx.wait();
  console.log("Tx confirmed in block", receipt.blockNumber);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
