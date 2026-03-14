# AI Escrow Backend

An AI-controlled escrow backend that deploys a Solidity escrow contract on **Polygon Amoy testnet** and resolves payments based on an external AI arbitration verdict.

## ✅ What it does

- Deploys an `AIEscrow` contract that holds ETH from a client
- Uses an **arbiter wallet** (backend) to resolve the escrow
- Splits funds between client and freelancer based on a **percentage verdict**
- Exposes an Express API to create and resolve escrows

---

## 🧰 Tech Stack

- Solidity `0.8.20`
- Hardhat
- Node.js
- ethers.js
- dotenv
- Express
- Polygon Amoy Testnet

---

## 🚀 Setup

### 1) Install dependencies

```bash
npm install
```

### 2) Create `.env`

Copy the example and fill in your values:

```bash
cp .env.example .env
```

Fill in:

- `RPC_URL` → Polygon Amoy RPC endpoint
- `PRIVATE_KEY` → private key for deployment / resolution (arbiter wallet)
- `ARBITER_ADDRESS` → the public address matching `PRIVATE_KEY`

---

## 🛠 Compile contracts

```bash
npx hardhat compile
```

---

## ▶️ Start the backend server

```bash
node server/server.js
```

By default it listens on port `3000`.

---

## 📦 Deploying an Escrow Contract (CLI)

### Usage

```bash
node scripts/deploy.js <freelancerAddress> <arbiterAddress> <depositAmountInEth>
```

Example:

```bash
node scripts/deploy.js 0xFreelancerAddr 0xArbiterAddr 0.01
```

This will deploy a new escrow contract funded with `0.01 ETH`.

---

## ✅ Resolving an Escrow (CLI)

### Usage

```bash
node scripts/resolve.js <contractAddress> <freelancerPercent>
```

Example:

```bash
node scripts/resolve.js 0xEscrowContractAddr 70
```

This sends 70% of the escrow balance to the freelancer and 30% back to the client.

---

## 🧩 Backend API

### Create Escrow

- Endpoint: `POST /create-escrow`
- Payload:
  - `freelancerAddress` (string)
  - `depositAmount` (string; value in ETH)

Example request:

```bash
curl -X POST http://localhost:3000/create-escrow \
  -H "Content-Type: application/json" \
  -d '{"freelancerAddress":"0x...","depositAmount":"0.01"}'
```

Response:

```json
{ "contractAddress": "0x..." }
```

### Resolve Escrow

- Endpoint: `POST /resolve-escrow`
- Payload:
  - `contractAddress` (string)
  - `freelancerPercent` (number 0-100)

Example request:

```bash
curl -X POST http://localhost:3000/resolve-escrow \
  -H "Content-Type: application/json" \
  -d '{"contractAddress":"0x...","freelancerPercent":70}'
```

Response:

```json
{ "txHash": "0x...", "blockNumber": 1234567 }
```

---

## 🧠 How It Works (High-level)

1. The client calls `/create-escrow` and sends ETH into the deployed contract.
2. An external AI service decides a verdict (e.g., 70% to freelancer).
3. The backend calls `/resolve-escrow` with the AI verdict.
4. The contract transfers funds to the freelancer and returns the remainder to the client.

---

## ✅ Notes

- Ensure `PRIVATE_KEY` has enough testnet ETH on Polygon Amoy.
- The backend uses `ARBITER_ADDRESS` as the only address authorized to resolve an escrow.

---

## 🧯 Troubleshooting

- If you see `Artifact not found`, run:

```bash
npx hardhat compile
```

- If transactions fail, check your wallet balance and the configured `RPC_URL`.

---

Enjoy building! 🚀
