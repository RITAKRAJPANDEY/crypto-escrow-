# AI Escrow Smart Contract - API Documentation v2.0

## Overview

The AI Escrow system is a blockchain-based escrow solution that automatically breaks down projects into milestones and verifies work completion before releasing payments. It uses two AI agents:

1. **Project Planner AI**: Converts rough project descriptions into structured milestones
2. **Proof Checker AI**: Verifies freelancer work and determines payment release percentages

## System Architecture

```
Client (Project Owner)
    ↓
    └─→ Deposits funds into Escrow Contract
    
Project Planner AI
    ↓
    └─→ Analyzes project description
    └─→ Creates milestone breakdown
    └─→ Assigns budget per milestone

Freelancer
    ↓
    └─→ Completes milestone work
    └─→ Submits proof (IPFS hash, GitHub link, etc.)

Proof Checker AI
    ↓
    └─→ Verifies proof quality
    └─→ Determines release percentage (0-100%)
    
Smart Contract
    ↓
    └─→ Auto-releases payment percentage
    └─→ Maintains remaining funds in escrow
```

## API Endpoints

### Health & Info

#### `GET /health`
Health check endpoint.

**Response:**
```json
{
  "status": "ok",
  "timestamp": "2026-03-14T12:00:00.000Z"
}
```

#### `GET /info`
Get system information and AI agent addresses.

**Response:**
```json
{
  "name": "AI Escrow Backend",
  "version": "2.0.0",
  "features": ["multi-milestone", "ai-planning", "proof-verification", "partial-payments"],
  "wallet": "0xabc...",
  "projectPlannerAddress": "0xabc...",
  "proofCheckerAddress": "0xabc..."
}
```

---

### Project & Escrow Creation

#### `POST /create-milestone-escrow`
Create a new multi-milestone escrow contract.

**Request:**
```json
{
  "freelancerAddress": "0x123...",
  "depositAmount": "10" // in ETH
}
```

**Response:**
```json
{
  "contractAddress": "0xabc...",
  "freelancer": "0x123...",
  "totalDeposit": "10",
  "projectPlanner": "0xabc...",
  "proofChecker": "0xabc..."
}
```

---

### Project Planning

#### `POST /plan-project`
Analyze project description and generate milestone breakdown (called by Project Planner AI).

**Request:**
```json
{
  "projectDescription": "Build a React web app with Node.js backend and MongoDB database",
  "totalBudget": 10
}
```

**Response:**
```json
{
  "success": true,
  "projectDescription": "Build a React web app...",
  "totalBudget": 10,
  "milestones": [
    {
      "id": 1,
      "title": "Design & Wireframing",
      "description": "Create UI/UX designs and wireframes",
      "targetAmount": 1.5,
      "priority": "HIGH"
    },
    {
      "id": 2,
      "title": "Frontend Development",
      "description": "Build responsive web interface",
      "targetAmount": 3.5,
      "priority": "HIGH"
    },
    // ... more milestones
  ],
  "analysis": {
    "complexity": "MEDIUM",
    "estimatedTimeline": "6 weeks (3 milestones × 2 weeks each)",
    "riskFactors": ["integration challenges", "scalability concerns"]
  }
}
```

#### `POST /create-project-breakdown`
Register the project breakdown on-chain.

**Request:**
```json
{
  "contractAddress": "0xabc...",
  "projectDescription": "Build a React web app...",
  "totalBudget": "10",
  "numberOfMilestones": 3
}
```

**Response:**
```json
{
  "contractAddress": "0xabc...",
  "txHash": "0x123...",
  "blockNumber": 12345,
  "success": true
}
```

#### `POST /confirm-project-breakdown`
Client confirms the project breakdown (locks the milestone structure).

**Request:**
```json
{
  "contractAddress": "0xabc..."
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x123...",
  "blockNumber": 12346
}
```

---

### Milestone Management

#### `POST /create-milestones`
Create all milestones on-chain.

**Request:**
```json
{
  "contractAddress": "0xabc...",
  "milestones": [
    {
      "id": 1,
      "description": "Design & Wireframing",
      "targetAmount": "1.5"
    },
    {
      "id": 2,
      "description": "Frontend Development",
      "targetAmount": "3.5"
    }
  ]
}
```

**Response:**
```json
{
  "contractAddress": "0xabc...",
  "created": 2,
  "total": 2,
  "results": [
    {
      "milestoneId": 1,
      "success": true,
      "txHash": "0x123..."
    }
  ]
}
```

#### `GET /milestone/:contractAddress/:milestoneId`
Get details of a specific milestone.

**Response:**
```json
{
  "id": "1",
  "description": "Design & Wireframing",
  "targetAmount": "1.5",
  "releasePercentage": "100",
  "releasedAmount": "1.5",
  "status": "PAID",
  "proofHash": "QmXx...",
  "createdAt": "2026-03-14T10:00:00.000Z",
  "submittedAt": "2026-03-14T11:00:00.000Z",
  "verifiedAt": "2026-03-14T11:30:00.000Z"
}
```

#### `GET /milestones/:contractAddress/:totalCount`
Get all milestones for a contract.

**Response:**
```json
{
  "contractAddress": "0xabc...",
  "totalMilestones": 3,
  "milestones": [
    { /* milestone 1 */ },
    { /* milestone 2 */ },
    { /* milestone 3 */ }
  ]
}
```

---

### Proof Submission & Verification

#### `POST /submit-proof`
Freelancer submits proof of work for a milestone.

**Request:**
```json
{
  "contractAddress": "0xabc...",
  "milestoneId": 1,
  "proofHash": "QmXxxx... or github.com/... or ipfs://..."
}
```

**Response:**
```json
{
  "contractAddress": "0xabc...",
  "milestoneId": 1,
  "proofHash": "QmXxxx...",
  "txHash": "0x123...",
  "blockNumber": 12347,
  "success": true
}
```

#### `POST /verify-proof`
AI Proof Checker verifies the submitted work.

**Request:**
```json
{
  "contractAddress": "0xabc...",
  "milestoneId": 1,
  "proof": {
    "proofHash": "QmXxxx...",
    "description": "Completed all designs with responsive layouts",
    "files": ["design.figma", "wireframes.pdf"],
    "deliverables": ["Homepage", "Dashboard", "Settings page"],
    "codeUrl": "https://github.com/example/repo"
  }
}
```

**Response:**
```json
{
  "contractAddress": "0xabc...",
  "milestoneId": 1,
  "approved": true,
  "releasePercentage": 85,
  "score": 85,
  "summary": "Minor issues found. 85% payment approved.",
  "details": {
    "proofHash": "QmXxxx...",
    "timestamp": "2026-03-14T12:00:00.000Z",
    "checks": [
      {
        "type": "completeness",
        "check": "description provided",
        "status": "PASS",
        "weight": 10
      }
    ],
    "issues": ["Missing responsive design for tablets"],
    "recommendations": ["Add tablet breakpoints to CSS"]
  }
}
```

#### `POST /approve-milestone`
AI releases payment based on verification results.

**Request:**
```json
{
  "contractAddress": "0xabc...",
  "milestoneId": 1,
  "releasePercentage": 85
}
```

**Response:**
```json
{
  "contractAddress": "0xabc...",
  "milestoneId": 1,
  "txHash": "0x123...",
  "blockNumber": 12348,
  "success": true,
  "releasePercentage": 85
}
```

#### `POST /reject-milestone`
Reject milestone proof (requires resubmission).

**Request:**
```json
{
  "contractAddress": "0xabc...",
  "milestoneId": 1
}
```

**Response:**
```json
{
  "contractAddress": "0xabc...",
  "milestoneId": 1,
  "txHash": "0x123...",
  "blockNumber": 12349,
  "success": true
}
```

---

### Status & Information

#### `GET /project/:contractAddress`
Get project details.

**Response:**
```json
{
  "contractAddress": "0xabc...",
  "project": {
    "description": "Build a React web app...",
    "totalBudget": "10",
    "numberOfMilestones": "3",
    "confirmed": true
  }
}
```

#### `GET /payment-summary/:contractAddress`
Get payment summary and statistics.

**Response:**
```json
{
  "contractAddress": "0xabc...",
  "projectBudget": "10",
  "totalPaid": "4.85",
  "remainingInEscrow": "5.15",
  "milestonesPaid": 1,
  "totalMilestones": 3,
  "pendingMilestones": 2,
  "submittedProofs": 1
}
```

#### `GET /balance/:contractAddress`
Get current contract balance.

**Response:**
```json
{
  "contractAddress": "0xabc...",
  "balance": "5.15",
  "raw": "5150000000000000000"
}
```

---

### Refunds & Dispute Resolution

#### `POST /request-refund`
Client requests refund of remaining funds (both parties must agree).

**Request:**
```json
{
  "contractAddress": "0xabc..."
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x123...",
  "contractAddress": "0xabc..."
}
```

#### `POST /refund-parties`
Distribute remaining funds between client and freelancer.

**Request:**
```json
{
  "contractAddress": "0xabc...",
  "clientRefundAmount": "3",
  "freelancerRefundAmount": "2.15"
}
```

**Response:**
```json
{
  "success": true,
  "txHash": "0x123...",
  "contractAddress": "0xabc...",
  "clientRefund": "3",
  "freelancerRefund": "2.15"
}
```

---

## Milestone Statuses

- `PENDING` - Created, waiting for freelancer to start work
- `SUBMITTED` - Freelancer submitted proof
- `APPROVED` - AI verified, payment authorized
- `REJECTED` - Proof didn't meet standards, resubmission required
- `PAID` - Payment released to freelancer
- `REFUNDED` - Funds returned to contract/client

## Release Percentage Calculation

The Proof Checker AI calculates release percentage based on:

- **100%**: All requirements met perfectly
- **80-99%**: Minor issues, mostly correct
- **50-79%**: Several issues, needs revision
- **1-49%**: Major issues, significant revision needed
- **0%**: Requirements not met, resubmit after fixes

## Integration Example

```javascript
// 1. Create escrow
const escrowRes = await fetch("http://localhost:3000/create-milestone-escrow", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    freelancerAddress: "0x123...",
    depositAmount: "10",
  }),
});
const { contractAddress } = await escrowRes.json();

// 2. Plan project
const planRes = await fetch("http://localhost:3000/plan-project", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    projectDescription: "Build a React web app with backend",
    totalBudget: 10,
  }),
});
const { milestones } = await planRes.json();

// 3. Create project breakdown
await fetch("http://localhost:3000/create-project-breakdown", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    contractAddress,
    projectDescription: "Build a React web app with backend",
    totalBudget: "10",
    numberOfMilestones: milestones.length,
  }),
});

// 4. Client confirms
await fetch("http://localhost:3000/confirm-project-breakdown", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ contractAddress }),
});

// 5. Create milestones
await fetch("http://localhost:3000/create-milestones", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    contractAddress,
    milestones: milestones.map((m) => ({
      id: m.id,
      description: m.description,
      targetAmount: m.targetAmount.toString(),
    })),
  }),
});

// 6. Freelancer submits proof
await fetch("http://localhost:3000/submit-proof", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    contractAddress,
    milestoneId: 1,
    proofHash: "QmXxxx...",
  }),
});

// 7. AI verifies proof
const verifyRes = await fetch("http://localhost:3000/verify-proof", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    contractAddress,
    milestoneId: 1,
    proof: {
      proofHash: "QmXxxx...",
      description: "Completed design work",
      files: ["design.figma"],
    },
  }),
});
const { releasePercentage } = await verifyRes.json();

// 8. Release payment
await fetch("http://localhost:3000/approve-milestone", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    contractAddress,
    milestoneId: 1,
    releasePercentage,
  }),
});
```

## Environment Variables

```env
RPC_URL=<Polygon Amoy RPC endpoint>
PRIVATE_KEY=<Wallet private key>
PROJECT_PLANNER_ADDRESS=<AI agent wallet address>
PROOF_CHECKER_ADDRESS=<AI agent wallet address>
PORT=3000
```

## Security Notes

1. **Private Key**: Never commit `.env` file to version control
2. **AI Addresses**: In production, these should be dedicated wallets with rate limiting
3. **Proof Storage**: Use IPFS or similar decentralized storage for proofs
4. **Verification**: Consider integrating with specialized code review services
5. **Disputes**: Implement multi-sig approval for disputed milestones

## Future Enhancements

- Integration with GPT-4 / Claude for better milestone planning
- Automated unit test verification
- GitHub webhook integration for automatic proof verification
- Multi-sig approval for high-value contracts
- Dispute arbitration system
- Reputation scores for freelancers
