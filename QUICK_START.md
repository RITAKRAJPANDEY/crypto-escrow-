# Quick Start Guide - AI Escrow v2.0

## 5-Minute Setup

### 1. Start the Server
```bash
npm start
```

Expected output:
```
✅ AI Escrow Backend (v2.0) running on http://localhost:3000
📋 API initialized with project planning and proof verification
🤖 Project Planner AI: 0xa945B...
🔍 Proof Checker AI: 0xa945B...
```

### 2. Create an Escrow Contract
```bash
curl -X POST http://localhost:3000/create-milestone-escrow \
  -H "Content-Type: application/json" \
  -d '{
    "freelancerAddress": "0x1234567890123456789012345678901234567890",
    "depositAmount": "5"
  }'
```

Save the returned `contractAddress`.

### 3. Plan the Project
```bash
curl -X POST http://localhost:3000/plan-project \
  -H "Content-Type: application/json" \
  -d '{
    "projectDescription": "Build a React web app with Node.js backend and database",
    "totalBudget": 5
  }'
```

Review the generated milestones.

### 4. Create Project Breakdown (On-Chain)
```bash
curl -X POST http://localhost:3000/create-project-breakdown \
  -H "Content-Type: application/json" \
  -d '{
    "contractAddress": "0xabc123...",
    "projectDescription": "Build a React web app with Node.js backend and database",
    "totalBudget": "5",
    "numberOfMilestones": 4
  }'
```

### 5. Client Confirms Project
```bash
curl -X POST http://localhost:3000/confirm-project-breakdown \
  -H "Content-Type: application/json" \
  -d '{"contractAddress": "0xabc123..."}'
```

### 6. Create All Milestones
```bash
curl -X POST http://localhost:3000/create-milestones \
  -H "Content-Type: application/json" \
  -d '{
    "contractAddress": "0xabc123...",
    "milestones": [
      {"id": 1, "description": "Design & Wireframing", "targetAmount": "0.75"},
      {"id": 2, "description": "Frontend Development", "targetAmount": "1.75"},
      {"id": 3, "description": "Backend Development", "targetAmount": "1.75"},
      {"id": 4, "description": "Testing & Deployment", "targetAmount": "0.75"}
    ]
  }'
```

### 7. Freelancer Submits Proof
```bash
curl -X POST http://localhost:3000/submit-proof \
  -H "Content-Type: application/json" \
  -d '{
    "contractAddress": "0xabc123...",
    "milestoneId": 1,
    "proofHash": "QmXxxx-or-any-identifier-for-proof"
  }'
```

### 8. AI Verifies & Releases Payment
```bash
curl -X POST http://localhost:3000/verify-proof \
  -H "Content-Type: application/json" \
  -d '{
    "contractAddress": "0xabc123...",
    "milestoneId": 1,
    "proof": {
      "proofHash": "QmXxxx-or-any-identifier",
      "description": "Completed UI design and wireframes for all pages",
      "files": ["designs.figma", "wireframes.pdf"],
      "deliverables": ["Homepage", "Dashboard", "Settings"],
      "codeUrl": "https://github.com/example/repo/designs"
    }
  }'
```

Expected response:
```json
{
  "approved": true,
  "releasePercentage": 95,
  "score": 95,
  "summary": "Minor issues found. 95% payment approved."
}
```

### 9. Release Payment
```bash
curl -X POST http://localhost:3000/approve-milestone \
  -H "Content-Type: application/json" \
  -d '{
    "contractAddress": "0xabc123...",
    "milestoneId": 1,
    "releasePercentage": 95
  }'
```

### 10. Check Project Status
```bash
curl http://localhost:3000/payment-summary/0xabc123...
```

---

## Common Commands

### View Milestone Details
```bash
curl http://localhost:3000/milestone/0xabc123.../1
```

### View All Milestones
```bash
curl http://localhost:3000/milestones/0xabc123.../4
```

### Check Contract Balance
```bash
curl http://localhost:3000/balance/0xabc123...
```

### Reject Milestone (Needs Rework)
```bash
curl -X POST http://localhost:3000/reject-milestone \
  -H "Content-Type: application/json" \
  -d '{
    "contractAddress": "0xabc123...",
    "milestoneId": 1
  }'
```

### Request Refund
```bash
curl -X POST http://localhost:3000/request-refund \
  -H "Content-Type: application/json" \
  -d '{"contractAddress": "0xabc123..."}'
```

### Distribute Remaining Funds
```bash
curl -X POST http://localhost:3000/refund-parties \
  -H "Content-Type: application/json" \
  -d '{
    "contractAddress": "0xabc123...",
    "clientRefundAmount": "0.5",
    "freelancerRefundAmount": "0.25"
  }'
```

---

## Key Concepts

### Release Percentage
The AI decides what percentage of each milestone to pay:
- **100%** = Perfect work
- **80-99%** = Minor fixes needed
- **50-79%** = Significant rework needed  
- **0%** = Resubmit after major fixes

### Smart Flow
```
Idea → Breakdown → Milestones → Submit → Verify → Pay (%)
                                          ↓
                                    Issues? → Refund/Rework
```

### Leftover Funds
Remaining funds after all milestones can be:
- Kept in escrow
- Refunded to client
- Split between client and freelancer
- Used for new milestones

---

## Testing Scenarios

### Scenario 1: Perfect Work
```
1. Submit proof → AI verifies 100% → Release full payment
2. Freelancer gets full milestone amount
3. Escrow updated with 0 remaining for that milestone
```

### Scenario 2: Partial Approval
```
1. Submit proof → AI finds minor issues → Approve 85%
2. Freelancer gets 85% of milestone amount
3. 15% stays in escrow
4. Freelancer can resubmit to claim remaining 15%
```

### Scenario 3: Rejection
```
1. Submit proof → AI finds major issues → Reject (0%)
2. Freelancer gets 0 payment
3. Freelancer must rework and resubmit
4. Full milestone amount still available
```

### Scenario 4: Dispute Resolution
```
1. Multiple milestones completed
2. Some disagreement on final payment
3. Both parties agree to split remaining funds
4. Execute refund-parties endpoint
5. Funds distributed and contract closed
```

---

## Troubleshooting

### Port 3000 Already in Use
```bash
# Kill the process using port 3000
# Windows: taskkill /PID <PID> /F
# Mac/Linux: kill -9 <PID>
```

### Invalid Contract Address
- Ensure the contract address is valid (0x...)
- Use the address returned from create-escrow

### Milestone Not Found
- Verify milestone ID exists
- Check you created milestones first

### Transaction Failed
- Check balance with `/balance` endpoint
- Ensure freelancer address is valid
- Verify network connection

### AI Verification Issues
- Proof description should be detailed
- Include all deliverables info
- Provide file references if available

---

## Understanding the Response Format

### Success Response
```json
{
  "success": true,
  "txHash": "0x123abc...",
  "blockNumber": 12345,
  "data": {
    // Specific endpoint data
  }
}
```

### Error Response
```json
{
  "error": "Description of what went wrong",
  "contractAddress": "0xabc123..." // if applicable
}
```

---

## Environment Setup

### .env File
```env
RPC_URL=https://polygon-amoy-rpc.xyz
PRIVATE_KEY=0x...
PROJECT_PLANNER_ADDRESS=0x...
PROOF_CHECKER_ADDRESS=0x...
PORT=3000
```

### Update AI Addresses
To use different wallet addresses for AI agents:
```
PROJECT_PLANNER_ADDRESS=0x<your-planner-address>
PROOF_CHECKER_ADDRESS=0x<your-checker-address>
```

---

## Next Steps

1. **Review Full Documentation**: See [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
2. **Explore Smart Contract**: Check [contracts/AIEscrow.sol](./contracts/AIEscrow.sol)
3. **Understand AI Agents**: Review [services/projectPlannerAI.js](./services/projectPlannerAI.js)
4. **Deploy to Testnet**: Run `npm run deploy`
5. **Integrate with Frontend**: Build UI using the REST API

---

## API Testing Tools

### Using Postman
1. Import collection from endpoints
2. Set `{{contractAddress}}` variables
3. Execute requests in order

### Using cURL
All commands in this guide are ready to use with cURL

### Using Node.js
```javascript
const response = await fetch('http://localhost:3000/health');
const data = await response.json();
console.log(data);
```

---

## System Status

✅ **Server**: Running on http://localhost:3000
✅ **Smart Contract**: Compiled and ready to deploy
✅ **Project Planner AI**: Operational
✅ **Proof Checker AI**: Operational
✅ **Database**: On-chain (smart contract state)

---

## Support

- **API Issues**: Check [API_DOCUMENTATION.md](./API_DOCUMENTATION.md)
- **Contract Issues**: Review [contracts/AIEscrow.sol](./contracts/AIEscrow.sol)
- **AI Questions**: See [SYSTEM_OVERVIEW.md](./SYSTEM_OVERVIEW.md)
- **Server Logs**: Check console output from `npm start`

---

**Ready to go!** 🚀

Start with the 5-minute setup and explore the system.
