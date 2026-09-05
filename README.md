# CommerceOS

### Agentic Commerce Operating System

CommerceOS is an agentic commerce platform that connects merchant intelligence, AI reasoning, deterministic policy controls, human approval, autonomous buyers, and Razorpay payments into a closed-loop commerce system.

Instead of simply telling merchants what happened, CommerceOS identifies what should happen next — and enables governed execution.

---

## 🚀 What is CommerceOS?

Traditional ecommerce platforms provide dashboards, reports, inventory management, and payment processing.

CommerceOS goes one step further.

It continuously analyzes commerce data to identify revenue opportunities, uses AI to reason about possible actions, validates those actions against deterministic merchant policies, and keeps the merchant in control before execution.

At the same time, CommerceOS provides an autonomous buyer capable of interpreting natural-language purchasing requirements, evaluating products and inventory, and completing purchases through Razorpay.

### The Core Loop

```text
                    COMMERCEOS

              Merchant Commerce Data
                       │
                       ▼
              Revenue Intelligence
                       │
                       ▼
              AI Opportunity Engine
                       │
                       ▼
                AI Recommendation
                       │
                       ▼
                Policy Engine
                       │
                       ▼
             Merchant Approval
                       │
                       ▼
              Action Execution
                       │
                       ▼
                 AI Buyer
                       │
                       ▼
              Product Evaluation
                       │
                       ▼
              Razorpay Checkout
                       │
                       ▼
              Verified Payment
                       │
                       ▼
                Verified Order
```

---

# 🎯 Problem

Ecommerce merchants have access to large amounts of data:

- Sales
- Revenue
- Orders
- Inventory
- Product performance
- Customer activity

However, traditional dashboards mainly answer:

> "What happened?"

The merchant still has to manually determine:

> "What should I do next?"

At the same time, autonomous AI buyers need a reliable way to discover products, evaluate constraints, check inventory, and complete purchases safely.

CommerceOS addresses both sides.

---

# 💡 Solution

CommerceOS creates a governed agentic commerce layer between merchants, AI agents, and payments.

### Merchant Side

CommerceOS can:

1. Analyze revenue and inventory signals.
2. Detect opportunities.
3. Generate AI recommendations.
4. Evaluate recommendations against merchant policies.
5. Request human approval when required.
6. Execute approved actions.
7. Record the execution in an audit trail.

### Buyer Side

The autonomous buyer can:

1. Receive natural-language purchasing requirements.
2. Search the merchant catalog.
3. Check real inventory.
4. Evaluate products using AI.
5. Apply budget and purchasing constraints.
6. Select a valid basket.
7. Create an order.
8. Execute Razorpay checkout.
9. Verify the resulting payment.

---

# 🧠 AI Architecture

A core design principle of CommerceOS is:

```text
Deterministic Code → Facts
AI → Reasoning / Proposal
Policy Engine → Guardrails
Merchant → Approval
Executor → Action
```

The AI does **not** directly mutate the database.

Instead, the AI receives structured commerce information and produces a structured proposal.

The proposal then passes through deterministic validation before execution.

This prevents the LLM from becoming the source of truth for:

- Prices
- Inventory
- Orders
- Payments
- Merchant policies

---

# 🛡️ Policy & Governance

Agentic systems should not mean unrestricted autonomy.

CommerceOS introduces a deterministic Policy Engine between AI reasoning and execution.

Example policies include:

```text
Maximum Discount       ≤ 25%
Maximum Restock        ≤ 500 units
Minimum AI Confidence  ≥ 70%
```

The system evaluates the proposal against these rules before allowing execution.

```text
AI Proposal
     │
     ▼
Policy Evaluation
     │
 ┌───┴────┐
 │        │
FAIL     PASS
 │        │
 ▼        ▼
STOP   Merchant
       Approval
          │
          ▼
       Execute
```

The LLM cannot override merchant policies.

---

# 👤 Human-in-the-Loop

CommerceOS supports human approval for sensitive AI-driven actions.

The merchant can review:

- AI rationale
- Proposed action
- Expected impact
- AI confidence
- Execution parameters
- Policy evaluation

The merchant can then:

- Approve
- Reject
- Require approval

Only approved actions are executed by the deterministic action layer.

---

# 🤖 Autonomous Buyer

CommerceOS also demonstrates the other side of agentic commerce.

A buyer can provide a natural-language requirement such as:

> "Shoes under ₹4,000 and socks under ₹1,000."

The buyer agent evaluates available products and inventory.

Example:

```text
CloudStrider Carbon Runner       ₹3,499
AeroDry Performance Socks          ₹499
--------------------------------------
Total                            ₹3,998
```

The buyer agent can determine that the basket satisfies the requested constraints and is available for purchase.

---

# 💳 Razorpay Integration

CommerceOS integrates with Razorpay Test Mode for payment execution.

The checkout flow is:

```text
AI Buyer Decision
       │
       ▼
Create Order
       │
       ▼
Razorpay Checkout
       │
       ▼
Payment
       │
       ▼
Signature Verification
       │
       ▼
Payment Verification
       │
       ▼
Order → PAID
       │
       ▼
Inventory Settlement
```

Payment verification is handled cryptographically rather than trusting a client-side success state.

Razorpay webhooks are also handled for payment lifecycle events.

---

# 📦 Inventory Model

CommerceOS distinguishes between physical stock and temporarily reserved stock.

```text
Available Stock = Quantity - Reserved
```

When an order is created:

```text
Physical Stock
      │
      └── Reserved for Order
```

When payment succeeds:

```text
Reserved Stock
      │
      └── Settled / Sold
```

When an unpaid order is cancelled:

```text
Reserved Stock
      │
      └── Released
```

This prevents unpaid orders from permanently consuming inventory.

---

# 📊 Revenue Intelligence

CommerceOS derives business intelligence from real commerce data.

The dashboard provides:

- Total Revenue
- Total Orders
- Average Order Value
- Units Sold
- Active Products
- Revenue Trajectory
- Top Products
- SKU Velocity
- Revenue Opportunities
- Recent Orders

Opportunity types include:

- High Velocity
- Cross-Sell
- Low Stock
- High Demand
- Conversion Opportunities

These opportunities provide structured context for the AI reasoning layer.

---

# 🧾 Auditability

Every important AI-driven action is designed to be traceable.

```text
Opportunity
     ↓
AI Proposal
     ↓
Policy Evaluation
     ↓
Merchant Approval
     ↓
Action Execution
     ↓
Audit Record
```

This provides visibility into:

- What the AI proposed
- Why it proposed it
- What policy evaluated it
- Whether approval was required
- Who approved it
- What was executed

---

# 🏗️ Architecture

```text
┌─────────────────────────────────────────────────────────┐
│                     CommerceOS                          │
├─────────────────────────────────────────────────────────┤
│                                                         │
│  Next.js Web Dashboard                                  │
│        │                                                │
│        ▼                                                │
│  Fastify API                                            │
│        │                                                │
│   ┌────┼──────────────┬───────────────┐                │
│   │    │              │               │                │
│   ▼    ▼              ▼               ▼                │
│ Prisma PostgreSQL   Redis        Razorpay              │
│   │                                                     │
│   │                                                     │
│   └──────────────► AI Layer                             │
│                       │                                 │
│                  LangGraph                              │
│                       │                                 │
│                     Groq                                │
│                       │                                 │
│                Structured Output                        │
│                       │                                 │
│                Policy Engine                            │
│                       │                                 │
│                Action Executor                          │
│                                                         │
│  Chrome Extension / Autonomous Buyer                    │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

---

# 🛠️ Tech Stack

## Frontend

- Next.js
- TypeScript
- Tailwind CSS
- shadcn/ui
- Chrome Extension

## Backend

- Fastify
- TypeScript
- Zod
- JWT
- Argon2

## Database & Infrastructure

- PostgreSQL
- Prisma
- Redis
- Docker Compose

## AI

- LangGraph
- Groq
- Structured AI outputs
- Deterministic tool layer

## Payments

- Razorpay Test Mode
- Payment signature verification
- Razorpay webhooks

## Testing

- Vitest
- Integration testing
- AI evaluation testing
- End-to-end testing

---

# 📁 Project Structure

```text
commerceos/
│
├── apps/
│   ├── web/
│   ├── api/
│   └── extension/
│
├── packages/
│   ├── database/
│   ├── domain/
│   ├── ai/
│   ├── tools/
│   ├── policy/
│   ├── payments/
│   ├── events/
│   ├── validation/
│   └── observability/
│
├── tests/
│   ├── integration/
│   ├── e2e/
│   └── ai-evals/
│
├── docs/
├── docker-compose.yml
├── package.json
├── pnpm-workspace.yaml
└── tsconfig.json
```

---

# ⚙️ Local Development

## Prerequisites

Make sure you have:

- Node.js
- pnpm
- Docker Desktop
- Git

## 1. Clone the repository

```bash
git clone <YOUR_GITHUB_REPOSITORY_URL>
cd commerceos
```

## 2. Install dependencies

```bash
pnpm install
```

## 3. Start infrastructure

```bash
docker compose up -d
```

This starts:

```text
PostgreSQL → localhost:5432
Redis      → localhost:6379
```

## 4. Configure environment variables

Create the required `.env` files using the provided environment examples.

The API requires values such as:

```env
DATABASE_URL=
JWT_SECRET=

RAZORPAY_KEY_ID=
RAZORPAY_KEY_SECRET=
RAZORPAY_WEBHOOK_SECRET=

GROQ_API_KEY=
```

Do not commit secrets to GitHub.

## 5. Generate Prisma client

```bash
pnpm --filter @commerceos/database prisma generate
```

Run migrations:

```bash
pnpm --filter @commerceos/database prisma migrate dev
```

## 6. Seed demo data

Run the project's seed command to populate the demo merchant, products, variants, inventory, and transaction history.

## 7. Start the applications

```bash
pnpm dev
```

The web application runs on:

```text
http://localhost:3000
```

The API runs on:

```text
http://localhost:4000
```

---

# 🧪 Testing

Run the full test suite:

```bash
pnpm test
```

Type checking:

```bash
pnpm typecheck
```

Build:

```bash
pnpm build
```

Lint:

```bash
pnpm lint
```

---

# 🔐 Security Principles

CommerceOS follows several important security principles:

### Tenant Isolation

Commerce resources are scoped to the authenticated merchant.

### Authentication

JWT-based authentication protects merchant APIs.

### Password Security

Passwords are hashed using Argon2.

### Input Validation

Zod validates API inputs and structured AI outputs.

### Payment Verification

Razorpay payment signatures are cryptographically verified.

### AI Safety

The AI does not directly mutate the database or bypass merchant policies.

### Secrets

API keys and payment secrets are stored in environment variables and are not committed to source control.

---

# 🎬 Demo Scenario

The primary demonstration follows this scenario:

### Merchant

**Apex Athletics**

### Buyer Request

> "Shoes under ₹4,000 and socks under ₹1,000."

### AI Buyer Selection

```text
CloudStrider Carbon Runner       ₹3,499
AeroDry Performance Socks          ₹499
--------------------------------------
Total                            ₹3,998
```

### Decision

```text
BUY APPROVED
Confidence: 96%
```

### Execution

```text
AI Decision
     ↓
CommerceOS Order
     ↓
Razorpay Test Checkout
     ↓
Payment Verification
     ↓
Paid & Settled Order
```

The merchant-side flow is:

```text
Revenue Signal
     ↓
Opportunity
     ↓
AI Proposal
     ↓
Policy Engine
     ↓
Merchant Approval
     ↓
Execution
     ↓
Audit Trail
```


---

# 🧩 Key Engineering Decisions

## AI is not the source of truth

Prices, inventory, orders, and payment states are determined by backend systems.

## AI produces proposals

The AI reasons about structured facts and proposes actions.

## Policy is deterministic

Merchant guardrails are evaluated using deterministic application logic.

## Execution is deterministic

Approved actions are executed through controlled backend handlers.

## Payments are verified

A client-side success message is not treated as proof of payment.

## Inventory is transactional

Reservations and settlements are handled using transactional database operations.

---

# 🌐 Product Vision

CommerceOS is designed around a future where commerce consists of multiple intelligent participants:

```text
                ┌───────────────┐
                │   Merchant    │
                └───────┬───────┘
                        │
                        ▼
                ┌───────────────┐
                │  CommerceOS   │
                └───────┬───────┘
                        │
             ┌──────────┴──────────┐
             ▼                     ▼
      Merchant Agents        Buyer Agents
             │                     │
             └──────────┬──────────┘
                        ▼
                    Payments
                        │
                        ▼
                    Commerce
```

The long-term vision is an ecosystem where merchants and buyers can delegate increasingly complex commerce decisions to AI while maintaining strong controls, transparency, and payment integrity.

---

# 🏆 Hackathon Focus

CommerceOS was built around a simple principle:

> **AI should not just generate recommendations. It should participate in commerce — safely, transparently, and with measurable outcomes.**

The system demonstrates the complete journey:

```text
INTELLIGENCE
     ↓
REASONING
     ↓
GOVERNANCE
     ↓
ACTION
     ↓
PAYMENT
     ↓
VERIFICATION
```


---

# 👨‍💻 Built With

**Next.js · TypeScript · Fastify · PostgreSQL · Prisma · Redis · LangGraph · Groq · Razorpay · Zod · Docker · Vitest**

---

## CommerceOS

### **From commerce intelligence to governed action.**
