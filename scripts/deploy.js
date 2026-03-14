import path from "path";
import fs from "fs";
import { ethers } from "ethers";
import { wallet } from "../config/blockchain.js";

async function main() {
  const args = process.argv.slice(2);
  if (args.length < 3) {
    console.error(
      "Usage: node scripts/deploy.js <freelancerAddress> <arbiterAddress> <depositEther>"
    );
    process.exit(1);
  }

  const [freelancerAddress, arbiterAddress, depositEther] = args;

  if (!ethers.isAddress(freelancerAddress)) {
    throw new Error("Invalid freelancer address");
  }
  if (!ethers.isAddress(arbiterAddress)) {
    throw new Error("Invalid arbiter address");
  }

  const deposit = ethers.parseEther(depositEther);

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
  const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

  console.log("Deploying AIEscrow contract...");
  const contract = await factory.deploy(freelancerAddress, arbiterAddress, { value: deposit });
  await contract.waitForDeployment();

  console.log("✅ AIEscrow deployed at:", contract.target);
  console.log("Deposited:", depositEther, "ETH");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
