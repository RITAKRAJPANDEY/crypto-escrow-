import path from "path";
import fs from "fs";
import { ethers } from "ethers";
import { fileURLToPath } from "url";
import { wallet } from "../config/blockchain.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const args = process.argv.slice(2);
  
  // Use environment variables or command line args, default to wallet address
  const freelancerAddress = (args[0] && args[0].trim()) || process.env.FREELANCER_ADDRESS || wallet.address;
  const projectPlannerAddress = (args[1] && args[1].trim()) || process.env.PROJECT_PLANNER_ADDRESS || wallet.address;
  const proofCheckerAddress = (args[2] && args[2].trim()) || process.env.PROOF_CHECKER_ADDRESS || wallet.address;
  const depositEther = (args[3] && args[3].trim()) || "0.01";

  if (!ethers.isAddress(freelancerAddress)) {
    throw new Error("Invalid freelancer address");
  }
  if (!ethers.isAddress(projectPlannerAddress)) {
    throw new Error("Invalid project planner address");
  }
  if (!ethers.isAddress(proofCheckerAddress)) {
    throw new Error("Invalid proof checker address");
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

  console.log("🚀 Deploying AI Escrow Contract...");
  console.log("Freelancer:", freelancerAddress);
  console.log("Project Planner AI:", projectPlannerAddress);
  console.log("Proof Checker AI:", proofCheckerAddress);
  console.log("Deposit Amount:", depositEther, "ETH");
  console.log("");

  try {
    const contract = await factory.deploy(
      freelancerAddress,
      projectPlannerAddress,
      proofCheckerAddress,
      { value: deposit }
    );
    
    console.log("⏳ Waiting for deployment...");
    await contract.waitForDeployment();

    console.log("✅ AI Escrow Contract deployed successfully!");
    console.log("📝 Contract Address:", contract.target);
    console.log("💰 Deposited:", depositEther, "ETH");
    console.log("");
    console.log("Next steps:");
    console.log("1. Verify on block explorer");
    console.log("2. Use the contract address in your API calls");
    console.log("3. Start creating milestones!");
  } catch (error) {
    console.error("❌ Deployment failed:", error.message);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
