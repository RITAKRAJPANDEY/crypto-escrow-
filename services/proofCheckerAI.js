/**
 * Proof Checker AI Agent
 * Verifies freelancer work and determines payment release percentage
 * In production, this would integrate with an LLM and specialized verification services
 */

export class ProofCheckerAI {
  constructor(walletAddress) {
    this.walletAddress = walletAddress;
  }

  /**
   * Analyze submitted proof and determine if work meets requirements
   * Returns: { approve: boolean, releasePercentage: 0-100, feedback: string, issues: [] }
   */
  async verifyProof(proof, milestone, projectContext) {
    try {
      const verification = {
        proofHash: proof.proofHash,
        milestoneId: milestone.id,
        timestamp: new Date().toISOString(),
        checks: [],
        issues: [],
        recommendations: [],
      };

      // Perform verification checks
      await this.checkProofCompleteness(proof, verification);
      await this.checkCodeQuality(proof, verification);
      await this.checkFunctionalityRequirements(proof, milestone, verification);
      await this.checkDocumentation(proof, verification);

      // Calculate release percentage based on findings
      const releasePercentage = this.calculateReleasePercentage(verification);

      return {
        proofHash: proof.proofHash,
        milestoneId: milestone.id,
        approved: releasePercentage > 0,
        releasePercentage,
        score: this.calculateScore(verification),
        summary: this.generateSummary(verification, releasePercentage),
        details: verification,
      };
    } catch (error) {
      throw new Error(`Proof verification failed: ${error.message}`);
    }
  }

  /**
   * Check if proof includes all required components
   */
  async checkProofCompleteness(proof, verification) {
    const requiredFields = ["description", "files", "deliverables"];
    const checks = [];

    requiredFields.forEach((field) => {
      if (proof[field]) {
        checks.push({
          type: "completeness",
          check: `${field} provided`,
          status: "PASS",
          weight: 10,
        });
      } else {
        checks.push({
          type: "completeness",
          check: `${field} missing`,
          status: "FAIL",
          weight: -10,
        });
        verification.issues.push(`Missing required field: ${field}`);
      }
    });

    verification.checks.push(...checks);
  }

  /**
   * Evaluate code quality if applicable
   */
  async checkCodeQuality(proof, verification) {
    const checks = [];

    if (proof.codeUrl || proof.repositoryUrl) {
      // In production, use tools like SonarQube, CodeFactor, etc.
      checks.push({
        type: "code_quality",
        check: "Code repository accessible",
        status: "PASS",
        weight: 15,
      });

      // Check for common quality issues
      const qualityIssues = this.assessCodeQualityFromDescription(proof.description);

      if (qualityIssues.length === 0) {
        checks.push({
          type: "code_quality",
          check: "No obvious quality issues detected",
          status: "PASS",
          weight: 15,
        });
      } else {
        qualityIssues.forEach((issue) => {
          checks.push({
            type: "code_quality",
            check: issue,
            status: "WARNING",
            weight: -5,
          });
          verification.issues.push(issue);
        });
      }
    }

    verification.checks.push(...checks);
  }

  /**
   * Check if milestone functionality requirements are met
   */
  async checkFunctionalityRequirements(proof, milestone, verification) {
    const checks = [];

    // Parse milestone requirements from description
    const requirements = this.extractRequirements(milestone.description);

    // Check if proof addresses these requirements
    const addressedRequirements = this.checkRequirementsCovered(proof.description, requirements);

    addressedRequirements.forEach((req) => {
      if (req.covered) {
        checks.push({
          type: "functionality",
          check: `Requirement met: ${req.text}`,
          status: "PASS",
          weight: 10,
        });
      } else {
        checks.push({
          type: "functionality",
          check: `Missing requirement: ${req.text}`,
          status: "FAIL",
          weight: -15,
        });
        verification.issues.push(`Missing requirement: ${req.text}`);
      }
    });

    if (addressedRequirements.length === 0) {
      checks.push({
        type: "functionality",
        check: "All requirements addressed",
        status: "PASS",
        weight: 20,
      });
    }

    verification.checks.push(...checks);
  }

  /**
   * Check for adequate documentation
   */
  async checkDocumentation(proof, verification) {
    const checks = [];
    const hasDocumentation = proof.documentation || proof.readme || proof.description;

    if (hasDocumentation) {
      checks.push({
        type: "documentation",
        check: "Documentation provided",
        status: "PASS",
        weight: 10,
      });
    } else {
      checks.push({
        type: "documentation",
        check: "No documentation found",
        status: "WARNING",
        weight: -5,
      });
      verification.recommendations.push("Please provide comprehensive documentation");
    }

    verification.checks.push(...checks);
  }

  /**
   * Calculate code quality issues from text description
   */
  assessCodeQualityFromDescription(description) {
    const issues = [];
    const lowerDesc = description.toLowerCase();

    const problemKeywords = {
      "poor naming": ["xxx", "temp", "var1", "fix", "hack"],
      "missing comments": ["uncommented", "no comments", "unclear"],
      "no tests": ["no test", "untested", "no unit test"],
      "security issues": ["hardcoded", "sql injection", "xss", "vulnerability"],
      "performance issues": ["slow", "inefficient", "n+1", "memory leak"],
    };

    Object.entries(problemKeywords).forEach(([issue, keywords]) => {
      if (keywords.some((keyword) => lowerDesc.includes(keyword))) {
        issues.push(issue);
      }
    });

    return issues;
  }

  /**
   * Extract requirements from milestone description
   */
  extractRequirements(description) {
    const requirements = [];

    // Simple extraction - in production use NLP
    const lines = description.split("\n");
    lines.forEach((line) => {
      if (line.includes("must") || line.includes("should") || line.includes("require")) {
        requirements.push({
          text: line.trim(),
          covered: false,
        });
      }
    });

    // If no requirements found, use generic ones
    if (requirements.length === 0) {
      requirements.push({
        text: "Functional and working",
        covered: true,
      });
    }

    return requirements;
  }

  /**
   * Check which requirements are covered in proof
   */
  checkRequirementsCovered(proofDescription, requirements) {
    const lowerProof = proofDescription.toLowerCase();

    return requirements.map((req) => {
      const lowerReq = req.text.toLowerCase();
      const covered = lowerProof.includes(lowerReq) || this.semanticMatchFound(lowerProof, lowerReq);

      return {
        ...req,
        covered,
      };
    });
  }

  /**
   * Simple semantic matching for requirement checking
   */
  semanticMatchFound(proofText, requirement) {
    const keywordGroups = {
      functionality: ["works", "functional", "operational", "running"],
      tested: ["tested", "verified", "confirmed", "validated"],
      documented: ["documented", "readme", "guide", "instructions"],
    };

    for (const keywords of Object.values(keywordGroups)) {
      if (keywords.some((keyword) => proofText.includes(keyword)) && keywords.some((keyword) => requirement.includes(keyword))) {
        return true;
      }
    }

    return false;
  }

  /**
   * Calculate release percentage based on verification checks
   */
  calculateReleasePercentage(verification) {
    let score = 0;
    let maxScore = 0;

    verification.checks.forEach((check) => {
      const weight = Math.abs(check.weight);
      maxScore += weight;

      if (check.status === "PASS") {
        score += weight;
      } else if (check.status === "WARNING") {
        score += weight * 0.5;
      }
      // FAIL: add 0
    });

    if (maxScore === 0) return 100;

    const percentage = (score / maxScore) * 100;

    // Round to nearest 5%
    return Math.round(percentage / 5) * 5;
  }

  /**
   * Calculate overall score (0-100)
   */
  calculateScore(verification) {
    let passCount = 0;
    let warningCount = 0;
    let failCount = 0;

    verification.checks.forEach((check) => {
      if (check.status === "PASS") passCount++;
      else if (check.status === "WARNING") warningCount++;
      else if (check.status === "FAIL") failCount++;
    });

    const totalChecks = verification.checks.length || 1;
    const score = (passCount * 100 + warningCount * 50 - failCount * 100) / (totalChecks * 100);

    return Math.max(0, Math.min(100, Math.round(score * 100)));
  }

  /**
   * Generate human-readable summary
   */
  generateSummary(verification, releasePercentage) {
    const passCount = verification.checks.filter((c) => c.status === "PASS").length;
    const totalChecks = verification.checks.length;

    let summary = `Verification Report: ${passCount}/${totalChecks} checks passed. `;

    if (releasePercentage === 100) {
      summary += "All requirements met. Full payment approved.";
    } else if (releasePercentage >= 80) {
      summary += `Minor issues found. ${releasePercentage}% payment approved.`;
    } else if (releasePercentage >= 50) {
      summary += `Several issues found. ${releasePercentage}% payment approved. Requires revision.`;
    } else if (releasePercentage > 0) {
      summary += `Significant issues found. ${releasePercentage}% payment approved. Major revision required.`;
    } else {
      summary += "Requirements not met. No payment approved. Resubmit after addressing all issues.";
    }

    if (verification.issues.length > 0) {
      summary += ` Issues: ${verification.issues.slice(0, 2).join(", ")}${verification.issues.length > 2 ? ", and more" : ""}`;
    }

    return summary;
  }

  /**
   * Generate recommendations for improvement
   */
  getRecommendations(verification) {
    const recommendations = [];

    const failedChecks = verification.checks.filter((c) => c.status === "FAIL" || c.status === "WARNING");

    failedChecks.forEach((check) => {
      if (check.type === "code_quality") {
        recommendations.push(`Improve: ${check.check}`);
      } else if (check.type === "documentation") {
        recommendations.push("Add comprehensive documentation and README");
      }
    });

    if (verification.issues.length > 0) {
      recommendations.push(...verification.recommendations);
    }

    return recommendations.length > 0 ? recommendations : ["Great work! No improvements needed."];
  }
}

export default ProofCheckerAI;
