import "dotenv/config";

import express from "express";
import bodyParser from "body-parser";
import path from "path";
import fs from "fs";
import { ethers } from "ethers";
import { fileURLToPath } from "url";

import { wallet } from "../config/blockchain.js";
import { MilestoneService } from "../services/milestoneService.js";
import { ProjectPlannerAI } from "../services/projectPlannerAI.js";
import { ProofCheckerAI } from "../services/proofCheckerAI.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const { ARBITER_ADDRESS, PROJECT_PLANNER_ADDRESS, PROOF_CHECKER_ADDRESS } = process.env;

if (!ARBITER_ADDRESS) {
  throw new Error("ARBITER_ADDRESS is not set in .env");
}

const app = express();
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, '..', 'public')));

const artifactPath = path.resolve(
  __dirname,
  "..",
  "artifacts",
  "contracts",
  "AIEscrow.sol",
  "AIEscrow.json"
);

if (!fs.existsSync(artifactPath)) {
  throw new Error("Contract artifact not found. Run `npx hardhat compile` first.");
}

const artifact = JSON.parse(fs.readFileSync(artifactPath, "utf8"));

// Initialize AI agents
const projectPlannerAI = new ProjectPlannerAI(PROJECT_PLANNER_ADDRESS || wallet.address);
const proofCheckerAI = new ProofCheckerAI(PROOF_CHECKER_ADDRESS || wallet.address);

// ==================== HEALTH & INFO ====================

app.get("/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.get("/info", (req, res) => {
  res.json({
    name: "AI Escrow Backend",
    version: "2.0.0",
    features: ["multi-milestone", "ai-planning", "proof-verification", "partial-payments"],
    wallet: wallet.address,
    projectPlannerAddress: PROJECT_PLANNER_ADDRESS || wallet.address,
    proofCheckerAddress: PROOF_CHECKER_ADDRESS || wallet.address,
  });
});

// ==================== LEGACY ENDPOINTS ====================

app.post("/create-escrow", async (req, res) => {
  try {
    const { freelancerAddress, depositAmount } = req.body;

    if (!freelancerAddress || !depositAmount) {
      return res.status(400).json({ error: "freelancerAddress and depositAmount are required" });
    }

    if (!ethers.isAddress(freelancerAddress)) {
      return res.status(400).json({ error: "Invalid freelancerAddress" });
    }

    const value = ethers.parseEther(depositAmount.toString());

    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

    // Use wallet addresses as AI agents for legacy endpoint
    const contract = await factory.deploy(freelancerAddress, wallet.address, wallet.address, { value });
    await contract.waitForDeployment();

    res.json({
      contractAddress: contract.target,
      version: "multi-milestone",
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// ==================== NEW MULTI-MILESTONE ENDPOINTS ====================

app.post("/create-milestone-escrow", async (req, res) => {
  try {
    const { freelancerAddress, depositAmount } = req.body;

    if (!freelancerAddress || !depositAmount) {
      return res.status(400).json({
        error: "freelancerAddress and depositAmount are required",
      });
    }

    if (!ethers.isAddress(freelancerAddress)) {
      return res.status(400).json({ error: "Invalid freelancerAddress" });
    }

    const value = ethers.parseEther(depositAmount.toString());

    const factory = new ethers.ContractFactory(artifact.abi, artifact.bytecode, wallet);

    // Deploy with AI agent addresses
    const projectPlannerAddr = PROJECT_PLANNER_ADDRESS || wallet.address;
    const proofCheckerAddr = PROOF_CHECKER_ADDRESS || wallet.address;

    const contract = await factory.deploy(freelancerAddress, projectPlannerAddr, proofCheckerAddr, {
      value,
    });
    await contract.waitForDeployment();

    res.json({
      contractAddress: contract.target,
      freelancer: freelancerAddress,
      totalDeposit: depositAmount,
      projectPlanner: projectPlannerAddr,
      proofChecker: proofCheckerAddr,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Internal server error" });
  }
});

// ==================== PROJECT PLANNING ENDPOINTS ====================

app.post("/plan-project", async (req, res) => {
  try {
    const { projectDescription, totalBudget } = req.body;

    if (!projectDescription || !totalBudget) {
      return res.status(400).json({
        error: "projectDescription and totalBudget are required",
      });
    }

    const analysis = await projectPlannerAI.analyzeAndPlanMilestones(projectDescription, totalBudget);

    res.json(analysis);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Failed to plan project" });
  }
});

app.post("/create-project-breakdown", async (req, res) => {
  try {
    const { contractAddress, projectDescription, totalBudget, numberOfMilestones } = req.body;

    if (!contractAddress || !projectDescription || !totalBudget || numberOfMilestones === undefined) {
      return res.status(400).json({
        error: "contractAddress, projectDescription, totalBudget, and numberOfMilestones are required",
      });
    }

    if (!ethers.isAddress(contractAddress)) {
      return res.status(400).json({ error: "Invalid contractAddress" });
    }

    const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);

    // Only project planner AI can call this
    const tx = await contract.createProjectBreakdown(
      projectDescription,
      ethers.parseEther(totalBudget.toString()),
      numberOfMilestones
    );

    const receipt = await tx.wait();

    res.json({
      contractAddress,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
      success: receipt.status === 1,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Failed to create project breakdown" });
  }
});

app.post("/confirm-project-breakdown", async (req, res) => {
  try {
    const { contractAddress } = req.body;

    if (!contractAddress) {
      return res.status(400).json({ error: "contractAddress is required" });
    }

    if (!ethers.isAddress(contractAddress)) {
      return res.status(400).json({ error: "Invalid contractAddress" });
    }

    const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);

    const tx = await contract.confirmProjectBreakdown();
    const receipt = await tx.wait();

    res.json({
      success: receipt.status === 1,
      txHash: tx.hash,
      blockNumber: receipt.blockNumber,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Failed to confirm project breakdown" });
  }
});

// ==================== MILESTONE CREATION ENDPOINTS ====================

app.post("/create-milestones", async (req, res) => {
  try {
    const { contractAddress, milestones } = req.body;

    if (!contractAddress || !milestones || !Array.isArray(milestones)) {
      return res.status(400).json({
        error: "contractAddress and milestones array are required",
      });
    }

    if (!ethers.isAddress(contractAddress)) {
      return res.status(400).json({ error: "Invalid contractAddress" });
    }

    const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);
    const results = [];

    for (const milestone of milestones) {
      try {
        const tx = await contract.createMilestone(
          milestone.id,
          milestone.description,
          ethers.parseEther(milestone.targetAmount.toString())
        );

        const receipt = await tx.wait();

        results.push({
          milestoneId: milestone.id,
          success: receipt.status === 1,
          txHash: tx.hash,
        });
      } catch (error) {
        results.push({
          milestoneId: milestone.id,
          success: false,
          error: error.message,
        });
      }
    }

    res.json({
      contractAddress,
      created: results.filter((r) => r.success).length,
      total: results.length,
      results,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Failed to create milestones" });
  }
});

// ==================== PROOF SUBMISSION ENDPOINTS ====================

app.post("/submit-proof", async (req, res) => {
  try {
    const { contractAddress, milestoneId, proofHash } = req.body;

    if (!contractAddress || milestoneId === undefined || !proofHash) {
      return res.status(400).json({
        error: "contractAddress, milestoneId, and proofHash are required",
      });
    }

    if (!ethers.isAddress(contractAddress)) {
      return res.status(400).json({ error: "Invalid contractAddress" });
    }

    const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);
    const milestoneService = new MilestoneService(contract, wallet);

    const result = await milestoneService.submitProof(milestoneId, proofHash);

    res.json({
      contractAddress,
      milestoneId,
      proofHash,
      ...result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Failed to submit proof" });
  }
});

// ==================== PROOF VERIFICATION ENDPOINTS ====================

app.post("/verify-proof", async (req, res) => {
  try {
    const { contractAddress, milestoneId, proof } = req.body;

    if (!contractAddress || milestoneId === undefined || !proof) {
      return res.status(400).json({
        error: "contractAddress, milestoneId, and proof object are required",
      });
    }

    if (!ethers.isAddress(contractAddress)) {
      return res.status(400).json({ error: "Invalid contractAddress" });
    }

    const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);
    const milestoneService = new MilestoneService(contract, wallet);

    const milestone = await milestoneService.getMilestone(milestoneId);

    const verification = await proofCheckerAI.verifyProof(proof, milestone, {
      contractAddress,
    });

    res.json({
      contractAddress,
      milestoneId,
      ...verification,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Failed to verify proof" });
  }
});

app.post("/approve-milestone", async (req, res) => {
  try {
    const { contractAddress, milestoneId, releasePercentage } = req.body;

    if (!contractAddress || milestoneId === undefined || releasePercentage === undefined) {
      return res.status(400).json({
        error: "contractAddress, milestoneId, and releasePercentage are required",
      });
    }

    if (!ethers.isAddress(contractAddress)) {
      return res.status(400).json({ error: "Invalid contractAddress" });
    }

    if (releasePercentage < 0 || releasePercentage > 100) {
      return res.status(400).json({
        error: "releasePercentage must be between 0 and 100",
      });
    }

    const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);
    const milestoneService = new MilestoneService(contract, wallet);

    const result = await milestoneService.approveMilestone(milestoneId, releasePercentage);

    res.json({
      contractAddress,
      milestoneId,
      ...result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Failed to approve milestone" });
  }
});

app.post("/reject-milestone", async (req, res) => {
  try {
    const { contractAddress, milestoneId } = req.body;

    if (!contractAddress || milestoneId === undefined) {
      return res.status(400).json({
        error: "contractAddress and milestoneId are required",
      });
    }

    if (!ethers.isAddress(contractAddress)) {
      return res.status(400).json({ error: "Invalid contractAddress" });
    }

    const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);
    const milestoneService = new MilestoneService(contract, wallet);

    const result = await milestoneService.rejectMilestone(milestoneId);

    res.json({
      contractAddress,
      milestoneId,
      ...result,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Failed to reject milestone" });
  }
});

// ==================== INFO & STATUS ENDPOINTS ====================

app.get("/milestone/:contractAddress/:milestoneId", async (req, res) => {
  try {
    const { contractAddress, milestoneId } = req.params;

    if (!ethers.isAddress(contractAddress)) {
      return res.status(400).json({ error: "Invalid contractAddress" });
    }

    const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);
    const milestoneService = new MilestoneService(contract, wallet);

    const milestone = await milestoneService.getMilestone(milestoneId);

    res.json(milestone);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Failed to get milestone" });
  }
});

app.get("/milestones/:contractAddress/:totalCount", async (req, res) => {
  try {
    const { contractAddress, totalCount } = req.params;

    if (!ethers.isAddress(contractAddress)) {
      return res.status(400).json({ error: "Invalid contractAddress" });
    }

    const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);
    const milestoneService = new MilestoneService(contract, wallet);

    const milestones = await milestoneService.getAllMilestones(parseInt(totalCount));

    res.json({ contractAddress, totalMilestones: milestones.length, milestones });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Failed to get milestones" });
  }
});

app.get("/project/:contractAddress", async (req, res) => {
  try {
    const { contractAddress } = req.params;

    if (!ethers.isAddress(contractAddress)) {
      return res.status(400).json({ error: "Invalid contractAddress" });
    }

    const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);
    const milestoneService = new MilestoneService(contract, wallet);

    const project = await milestoneService.getProjectBreakdown();

    res.json({
      contractAddress,
      project,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Failed to get project" });
  }
});

app.get("/payment-summary/:contractAddress", async (req, res) => {
  try {
    const { contractAddress } = req.params;

    if (!ethers.isAddress(contractAddress)) {
      return res.status(400).json({ error: "Invalid contractAddress" });
    }

    const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);
    const milestoneService = new MilestoneService(contract, wallet);

    const summary = await milestoneService.getPaymentSummary();

    res.json({
      contractAddress,
      ...summary,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Failed to get payment summary" });
  }
});

app.get("/balance/:contractAddress", async (req, res) => {
  try {
    const { contractAddress } = req.params;

    if (!ethers.isAddress(contractAddress)) {
      return res.status(400).json({ error: "Invalid contractAddress" });
    }

    const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);
    const balance = await contract.contractBalance();

    res.json({
      contractAddress,
      balance: ethers.formatEther(balance),
      raw: balance.toString(),
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Failed to get balance" });
  }
});

// ==================== REFUND ENDPOINTS ====================

app.post("/request-refund", async (req, res) => {
  try {
    const { contractAddress } = req.body;

    if (!contractAddress) {
      return res.status(400).json({ error: "contractAddress is required" });
    }

    if (!ethers.isAddress(contractAddress)) {
      return res.status(400).json({ error: "Invalid contractAddress" });
    }

    const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);

    const tx = await contract.requestRefund();
    const receipt = await tx.wait();

    res.json({
      success: receipt.status === 1,
      txHash: tx.hash,
      contractAddress,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Failed to request refund" });
  }
});

app.post("/refund-parties", async (req, res) => {
  try {
    const { contractAddress, clientRefundAmount, freelancerRefundAmount } = req.body;

    if (!contractAddress || clientRefundAmount === undefined || freelancerRefundAmount === undefined) {
      return res.status(400).json({
        error: "contractAddress, clientRefundAmount, and freelancerRefundAmount are required",
      });
    }

    if (!ethers.isAddress(contractAddress)) {
      return res.status(400).json({ error: "Invalid contractAddress" });
    }

    const contract = new ethers.Contract(contractAddress, artifact.abi, wallet);

    const tx = await contract.refundParties(
      ethers.parseEther(clientRefundAmount.toString()),
      ethers.parseEther(freelancerRefundAmount.toString())
    );

    const receipt = await tx.wait();

    res.json({
      success: receipt.status === 1,
      txHash: tx.hash,
      contractAddress,
      clientRefund: clientRefundAmount,
      freelancerRefund: freelancerRefundAmount,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: error.message || "Failed to refund parties" });
  }
});

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`✅ AI Escrow Backend (v2.0) running on http://localhost:${port}`);
  console.log(`📋 API initialized with project planning and proof verification`);
  console.log(`🤖 Project Planner AI: ${PROJECT_PLANNER_ADDRESS || wallet.address}`);
  console.log(`🔍 Proof Checker AI: ${PROOF_CHECKER_ADDRESS || wallet.address}`);
});

export default app;

