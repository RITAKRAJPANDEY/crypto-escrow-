import { ethers } from "ethers";

/**
 * Milestone Service Helper Functions
 * Coordinates milestone creation, proof submission, and payment release
 */

export class MilestoneService {
  constructor(contract, wallet) {
    this.contract = contract;
    this.wallet = wallet;
  }

  /**
   * Get project breakdown details
   */
  async getProjectBreakdown() {
    try {
      const project = await this.contract.project();
      return {
        description: project.projectDescription,
        totalBudget: ethers.formatEther(project.totalBudget),
        numberOfMilestones: project.numberOfMilestones.toString(),
        confirmed: project.confirmed,
      };
    } catch (error) {
      throw new Error(`Failed to get project breakdown: ${error.message}`);
    }
  }

  /**
   * Get milestone details
   */
  async getMilestone(milestoneId) {
    try {
      const milestone = await this.contract.getMilestone(milestoneId);
      return {
        id: milestone.id.toString(),
        description: milestone.description,
        targetAmount: ethers.formatEther(milestone.targetAmount),
        releasePercentage: milestone.releasePercentage.toString(),
        releasedAmount: ethers.formatEther(milestone.releasedAmount),
        status: this.getMilestoneStatusName(milestone.status),
        proofHash: milestone.proofHash,
        createdAt: new Date(milestone.createdAt * 1000).toISOString(),
        submittedAt: milestone.submittedAt > 0 ? new Date(milestone.submittedAt * 1000).toISOString() : null,
        verifiedAt: milestone.verifiedAt > 0 ? new Date(milestone.verifiedAt * 1000).toISOString() : null,
      };
    } catch (error) {
      throw new Error(`Failed to get milestone: ${error.message}`);
    }
  }

  /**
   * Get all milestones
   */
  async getAllMilestones(totalCount) {
    try {
      const milestones = [];
      for (let i = 1; i <= totalCount; i++) {
        const milestone = await this.getMilestone(i);
        milestones.push(milestone);
      }
      return milestones;
    } catch (error) {
      throw new Error(`Failed to get all milestones: ${error.message}`);
    }
  }

  /**
   * Get remaining balance for a milestone
   */
  async getMilestoneRemaining(milestoneId) {
    try {
      const remaining = await this.contract.getMilestoneRemaining(milestoneId);
      return ethers.formatEther(remaining);
    } catch (error) {
      throw new Error(`Failed to get milestone remaining: ${error.message}`);
    }
  }

  /**
   * Get total remaining balance in contract
   */
  async getTotalRemaining() {
    try {
      const remaining = await this.contract.getTotalRemaining();
      return ethers.formatEther(remaining);
    } catch (error) {
      throw new Error(`Failed to get total remaining: ${error.message}`);
    }
  }

  /**
   * Submit proof for a milestone (called by freelancer)
   */
  async submitProof(milestoneId, proofHash) {
    try {
      const tx = await this.contract.submitProof(milestoneId, proofHash);
      const receipt = await tx.wait();
      return {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        success: receipt.status === 1,
      };
    } catch (error) {
      throw new Error(`Failed to submit proof: ${error.message}`);
    }
  }

  /**
   * Approve milestone and release payment (called by proof checker AI)
   */
  async approveMilestone(milestoneId, releasePercentage) {
    try {
      if (releasePercentage < 0 || releasePercentage > 100) {
        throw new Error("Release percentage must be between 0 and 100");
      }

      const tx = await this.contract.approveMilestone(milestoneId, releasePercentage);
      const receipt = await tx.wait();

      return {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        success: receipt.status === 1,
        releasePercentage,
      };
    } catch (error) {
      throw new Error(`Failed to approve milestone: ${error.message}`);
    }
  }

  /**
   * Reject milestone (called by proof checker AI)
   */
  async rejectMilestone(milestoneId) {
    try {
      const tx = await this.contract.rejectMilestone(milestoneId);
      const receipt = await tx.wait();
      return {
        txHash: tx.hash,
        blockNumber: receipt.blockNumber,
        success: receipt.status === 1,
      };
    } catch (error) {
      throw new Error(`Failed to reject milestone: ${error.message}`);
    }
  }

  /**
   * Get milestone status name from status code
   */
  getMilestoneStatusName(status) {
    const statuses = ["PENDING", "SUBMITTED", "APPROVED", "REJECTED", "PAID", "REFUNDED"];
    return statuses[status] || "UNKNOWN";
  }

  /**
   * Calculate payment breakdown for freelancer
   */
  async getPaymentSummary() {
    try {
      const totalRemaining = await this.getTotalRemaining();
      const projectBreakdown = await this.getProjectBreakdown();

      // Get all milestones
      const totalMilestones = parseInt(projectBreakdown.numberOfMilestones);
      const milestones = await this.getAllMilestones(totalMilestones);

      const paidMilestones = milestones.filter((m) => m.status === "PAID");
      const totalPaid = paidMilestones.reduce((sum, m) => sum + parseFloat(m.releasedAmount), 0);

      return {
        projectBudget: projectBreakdown.totalBudget,
        totalPaid,
        remainingInEscrow: totalRemaining,
        milestonesPaid: paidMilestones.length,
        totalMilestones,
        pendingMilestones: milestones.filter((m) => m.status === "PENDING").length,
        submittedProofs: milestones.filter((m) => m.status === "SUBMITTED").length,
      };
    } catch (error) {
      throw new Error(`Failed to get payment summary: ${error.message}`);
    }
  }
}

export default MilestoneService;
