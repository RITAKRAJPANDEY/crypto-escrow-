/**
 * Project Planner AI Agent
 * Converts a rough project description into structured milestones
 * In production, this would integrate with an LLM like GPT-4 or Claude
 */

export class ProjectPlannerAI {
  constructor(walletAddress) {
    this.walletAddress = walletAddress;
  }

  /**
   * Analyze project description and break it into milestones
   * This is a simplified version - in production use LLM API
   */
  async analyzeAndPlanMilestones(projectDescription, totalBudget) {
    try {
      // In production, call LLM API here
      // For now, return a structured analysis
      const milestones = this.generateMilestoneBreakdown(projectDescription, totalBudget);

      return {
        success: true,
        projectDescription,
        totalBudget,
        milestones,
        analysis: {
          complexity: this.assessComplexity(projectDescription),
          estimatedTimeline: this.estimateTimeline(milestones.length),
          riskFactors: this.identifyRisks(projectDescription),
        },
      };
    } catch (error) {
      throw new Error(`Failed to analyze project: ${error.message}`);
    }
  }

  /**
   * Generate milestone breakdown from project description
   * This uses simple heuristics - replace with LLM calls in production
   */
  generateMilestoneBreakdown(projectDescription, totalBudget) {
    // Simple keyword-based breakdown
    const keywords = {
      design: ["design", "ui", "ux", "mockup", "wireframe", "prototype"],
      frontend: ["frontend", "react", "vue", "angular", "web", "ui", "interface"],
      backend: ["backend", "api", "server", "database", "nodejs", "python"],
      testing: ["test", "qa", "quality", "assurance", "testing"],
      deployment: ["deploy", "launch", "production", "release", "devops"],
    };

    const lowerDesc = projectDescription.toLowerCase();
    const milestones = [];
    const budgetParts = {};

    // Identify components
    Object.keys(keywords).forEach((key) => {
      if (keywords[key].some((keyword) => lowerDesc.includes(keyword))) {
        budgetParts[key] = true;
      }
    });

    // Assign budget to components
    const componentCount = Object.keys(budgetParts).length || 1;
    const budgetPerComponent = totalBudget / Math.max(componentCount, 1);

    let milestoneId = 1;
    if (budgetParts.design) {
      milestones.push({
        id: milestoneId++,
        title: "Design & Wireframing",
        description: "Create UI/UX designs and wireframes",
        targetAmount: budgetPerComponent * 0.15,
        priority: "HIGH",
      });
    }

    if (budgetParts.frontend) {
      milestones.push({
        id: milestoneId++,
        title: "Frontend Development",
        description: "Build responsive web interface",
        targetAmount: budgetPerComponent * 0.35,
        priority: "HIGH",
      });
    }

    if (budgetParts.backend) {
      milestones.push({
        id: milestoneId++,
        title: "Backend Development",
        description: "Develop APIs and database",
        targetAmount: budgetPerComponent * 0.35,
        priority: "HIGH",
      });
    }

    if (budgetParts.testing) {
      milestones.push({
        id: milestoneId++,
        title: "Testing & QA",
        description: "Test and verify all functionality",
        targetAmount: budgetPerComponent * 0.1,
        priority: "MEDIUM",
      });
    }

    if (budgetParts.deployment) {
      milestones.push({
        id: milestoneId++,
        title: "Deployment & Launch",
        description: "Deploy to production and monitor",
        targetAmount: budgetPerComponent * 0.05,
        priority: "MEDIUM",
      });
    }

    // If no components detected, create generic phases
    if (milestones.length === 0) {
      milestones.push(
        {
          id: 1,
          title: "Phase 1: Initial Development",
          description: "Core development phase",
          targetAmount: totalBudget * 0.5,
          priority: "HIGH",
        },
        {
          id: 2,
          title: "Phase 2: Testing & Refinement",
          description: "Testing and bug fixes",
          targetAmount: totalBudget * 0.3,
          priority: "HIGH",
        },
        {
          id: 3,
          title: "Phase 3: Launch & Support",
          description: "Deployment and initial support",
          targetAmount: totalBudget * 0.2,
          priority: "MEDIUM",
        }
      );
    }

    return milestones;
  }

  /**
   * Assess project complexity
   */
  assessComplexity(projectDescription) {
    const complexityKeywords = {
      HIGH: ["machine learning", "ai", "blockchain", "real-time", "distributed", "integration"],
      MEDIUM: ["api", "database", "authentication", "payment", "third-party"],
      LOW: ["simple", "basic", "static", "landing page", "blog"],
    };

    const lowerDesc = projectDescription.toLowerCase();

    for (const [level, keywords] of Object.entries(complexityKeywords)) {
      if (keywords.some((keyword) => lowerDesc.includes(keyword))) {
        return level;
      }
    }

    return "MEDIUM";
  }

  /**
   * Estimate timeline based on number of milestones
   */
  estimateTimeline(milestoneCount) {
    const weeksPerMilestone = 2;
    const totalWeeks = milestoneCount * weeksPerMilestone;
    return `${totalWeeks} weeks (${milestoneCount} milestones × ${weeksPerMilestone} weeks each)`;
  }

  /**
   * Identify potential risks
   */
  identifyRisks(projectDescription) {
    const risksMap = {
      "unclear requirements": ["unclear", "vague", "undefined", "tbd"],
      "timeline pressure": ["urgent", "asap", "rush", "immediate"],
      "technical complexity": ["complex", "advanced", "challenging"],
      "integration challenges": ["integrate", "third-party", "external", "api"],
      "scalability concerns": ["scale", "performance", "millions", "high traffic"],
    };

    const lowerDesc = projectDescription.toLowerCase();
    const identifiedRisks = [];

    for (const [risk, keywords] of Object.entries(risksMap)) {
      if (keywords.some((keyword) => lowerDesc.includes(keyword))) {
        identifiedRisks.push(risk);
      }
    }

    return identifiedRisks.length > 0 ? identifiedRisks : ["standard delivery risks"];
  }

  /**
   * Validate milestone structure
   */
  validateMilestones(milestones, totalBudget) {
    let totalAmount = 0;
    const errors = [];

    milestones.forEach((milestone, index) => {
      if (!milestone.title || !milestone.description) {
        errors.push(`Milestone ${index + 1} missing title or description`);
      }
      if (milestone.targetAmount <= 0) {
        errors.push(`Milestone ${index + 1} has invalid amount`);
      }
      totalAmount += milestone.targetAmount;
    });

    if (Math.abs(totalAmount - totalBudget) > 0.0001) {
      errors.push(`Milestone amounts (${totalAmount}) don't match total budget (${totalBudget})`);
    }

    return {
      valid: errors.length === 0,
      errors,
      totalAmount,
    };
  }
}

export default ProjectPlannerAI;
