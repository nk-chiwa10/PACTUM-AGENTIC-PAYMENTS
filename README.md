# PACTUM

**Autonomous AI Agent for Paying Digital Services**

> *Intelligence in Motion. Trust in Every Transaction.*

PACTUM is an autonomous payment agent for the software economy. An operator
gives it a goal in plain language. PACTUM discovers an approved digital
service, selects it against the operator's spending policy, and settles the
payment on **Stellar Testnet** through one of two first-class rails:

- **Noir escrow** — real `device_registry`, `agent_registry` and
  `payment_escrow` contracts enforce the agent's limits on-chain before any
  funds move.
- **Velo checkout** — the `@carts1024/velo-sdk` creates hosted checkout
  sessions and verifies signed webhooks.

The agent never holds the owner's funds. It only holds a scoped key that Noir
can refuse.

Built for the **Velo × Noir Agentic Payment Hackathon**.

---

## Why it matters

Software is increasingly bought by software. API credits, databases, domains,
GPU bursts and cloud hosting are recurring, low-value, high-frequency
purchases. Handing an autonomous agent a credit card is unsafe; giving it no
way to pay makes it useless.

PACTUM solves that with a **three-contract envelope**:

| Contract | Responsibility |
| --- | --- |
| `device_registry` | Binds a device hash to the owner wallet and the agent key. |
| `agent_registry` | Stores the per-payment cap, allowed asset and expiry. `check_payment` is the predicate. |
| `payment_escrow` | Holds the owner's funds. `authorize` + `claim` settle to the merchant. |

The AI decides *what* to buy. Noir decides *whether it is allowed*. Stellar
settles it.

---

## Live Testnet deployment

The exact deployment referenced by the hackathon brief:

| Contract | Address |
| --- | --- |
| `device_registry` | `CB4DPMGOA374JIB2ZVD4AHW5GJKQUYNOFGRYNOJ75EFH2KCJSMHOWIRA` |
| `agent_registry` | `CBTDMJVCFQDIVWZBKAKZ2FQ3UEJNAAUFYCTJ3E4ON2MYXPLPSIXQ25JZ` |
| `payment_escrow` | `CA5S4S7QGHJHJWVJBYL3CXZXZTNGKXMNZVDAEQNN7NUXFP4D7BYK7HIX` |

> The PDF renders two `0` characters where Stellar StrKey base32 requires the
> letter `O`. The addresses above are the checksum-valid on-chain IDs.

Read-only smoke test:

```bash
npm run verify:noir
```

It fetches each contract instance over Soroban RPC and calls the public read
methods with a random device hash. No keys required.

---

## Architecture

```
 Natural language goal
        │
        ▼
 ┌──────────────┐     ┌──────────────────┐     ┌───────────────────┐
 │  PACTUM AI   │────▶│  Policy preflight │────▶│  Settlement rail  │
 │  planner     │     │  local + on-chain │     │                   │
 └──────────────┘     └──────────────────┘     └─────────┬─────────┘
        │                       │                        │
        │                       │              ┌─────────┴─────────┐
        │                       │              ▼                   ▼
        │              Noir `check_payment`  Noir escrow       Velo checkout
        │                       │            authorize+claim   session + webhook
        │                       ▼                   │                   │
        └──────────────▶ Stellar Testnet ◀─────────┴───────────────────┘
```

### Decision loop

1. **Understand** — extract the category, target price and any explicit cap.
2. **Select** — score the approved catalog on fit, price and rail. If
   `OPENAI_API_KEY` is present, an LLM may choose from the same fixed catalog;
   otherwise a deterministic planner runs. Neither can invent a service.
3. **Constrain** — local checks, then `agent_registry.check_payment` on-chain
   when the vault is live.
4. **Settle** — Noir: `payment_escrow.authorize` then merchant `claim`.
   Velo: create a checkout session and wait for settlement.

Every step is persisted in the transaction trace with hashes and explorer
links.

---

## Two modes

### Sandbox (default, zero configuration)

- Seeded catalog, policy, transactions and audit events.
- Simulated Noir settlement hashes so the full UX can be demonstrated.
- Velo checkout returns a sandbox intent when no API key is configured.
- No secrets, no network, no funds.

### Live Testnet

Click **Go live** (or `POST /api/bootstrap`). PACTUM:

1. Generates and persists a disposable Testnet vault in `.data/wallet.json`.
2. Funds owner, agent, merchant and demo-USDC issuer via Friendbot.
3. Creates trustlines, issues test USDC, and **deploys the Stellar Asset
   Contract** for the asset so the escrow can transfer it.
4. Calls `device_registry.register`.
5. Calls `agent_registry.register_agent` with the cap, asset and expiry.
6. Calls `payment_escrow.fund_escrow` with 120 test USDC.
7. Persists real hashes and switches the app to live mode.

The demo USDC is a self-issued Testnet asset. It exists only to exercise the
same token flow as real USDC; no mainnet value is involved.

---

## Quickstart

Requirements: **Node.js 22+** (Node 24 recommended), npm.

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>.

The app starts in sandbox mode. Everything except a live Velo checkout works
without a key. Click **Go live** to create real Noir state.

### Verify the build

```bash
npm run typecheck
npm run build
npm run verify:noir
npm run verify:live
npm run proof:export
```

`verify:live` checks every stored Testnet hash; `proof:export` writes
`docs/pactum-proof.json` from a running instance.

### Deploy on Render

The repository includes a Render Blueprint with a persistent disk:

[Deploy to Render](https://render.com/deploy?repo=https://github.com/nk-chiwa10/PACTUM-AGENTIC-PAYMENTS)

See [`RENDER.md`](./RENDER.md) for the one-click steps, the Starter-plan disk
requirement, the free ephemeral alternative and post-deploy checks. A hosted
instance starts in sandbox and creates its own Testnet vault when you click
**Go live**.

---

## Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `NOIR_RPC_URL` | No | Soroban RPC endpoint (defaults to Testnet). |
| `NOIR_DEVICE_REGISTRY` | No | Override the device registry contract ID. |
| `NOIR_AGENT_REGISTRY` | No | Override the agent registry contract ID. |
| `NOIR_PAYMENT_ESCROW` | No | Override the payment escrow contract ID. |
| `VELO_API_KEY` | For live Velo | Server-side Velo Testnet key. |
| `VELO_ENV` | No | `testnet` (default), `development` or `production`. |
| `VELO_WEBHOOK_SECRET` | For webhooks | HMAC secret used by `Velo.webhooks.verify`. |
| `NEXT_PUBLIC_APP_URL` | No | Public URL used for Velo redirects. |
| `OPENAI_API_KEY` | No | Enables LLM service selection. |
| `PACTUM_LLM_MODEL` | No | Model name (default `gpt-4o-mini`). |
| `PACTUM_*_SECRET` | No | Bring your own Testnet keypairs instead of generated ones. |

Secrets live in `.env.local` and `.data/`; both are gitignored.

---

## API surface

| Route | Method | Description |
| --- | --- | --- |
| `/api/state` | `GET` | Full app state plus Velo configuration. |
| `/api/bootstrap` | `POST` | Create/refresh the live Testnet vault (idempotent). |
| `/api/agent/run` | `POST` | Run the agent for a natural-language prompt. |
| `/api/policies` | `GET` / `POST` | Read or publish the spending policy. |
| `/api/transactions/:id/settle` | `POST` | Complete a Velo sandbox checkout. |
| `/api/transactions/:id/verify` | `POST` | Poll Velo for a live payment intent. |
| `/api/noir/status` | `GET` / `POST` | Read on-chain state / verify contract reachability. |
| `/api/velo/checkout` | `POST` | Create a checkout session for the proof page. |
| `/api/velo/status` | `GET` | Velo client configuration. |
| `/api/velo/webhook` | `POST` | Signature-verified Velo webhook receiver. |
| `/api/wallet` | `GET` | Horizon balances for owner, agent and merchant. |
| `/api/demo/reset` | `POST` | Reset local demo state. |

---

## Demo walkthrough

1. **Overview** — vault, budget, policy envelope and both rails at a glance.
2. **Go live** — watch the five-step Testnet bootstrap and capture the hashes.
3. **Agent Console** — send *“Buy an affordable AI API subscription under
   5 USDC.”* PACTUM selects a Noir service, checks the on-chain policy, then
   authorizes and claims the escrow.
4. **Transactions** — open the run to see the execution trace, policy checks,
   authorize hash and merchant claim hash.
5. **Policies** — change the per-payment cap and publish a new on-chain policy.
6. **On-chain Proof** — re-run contract verification, inspect every artifact,
   create a Velo checkout and download a JSON proof bundle.

To show a guardrail, ask for *“a 50 USDC GPU cluster”*. The policy blocks it
before any funds move.

---

## Screens

- **Overview** — vault, metrics, activity chart, policy envelope.
- **Agent Console** — chat, live decision trace, budget guardrails.
- **Spending Policies** — budget, per-payment cap, expiry, service allowlist.
- **Transactions** — searchable ledger, per-transaction audit trail.
- **On-chain Proof** — contract health, identity, Velo status, artifact list.

Captured screenshots live in `docs/screenshots/` (regenerate with
`scripts/capture-screenshots.ps1`). A downloadable proof bundle is in
`docs/pactum-proof.json`.

---

## Tech stack

| Layer | Technology |
| --- | --- |
| App | Next.js 16.4.5 (App Router), React 19.3.1 |
| Styling | Tailwind CSS 4 |
| Language | TypeScript 5.9 |
| Noir | `@noirx402/agent-sdk` 0.3.0 |
| Velo | `@carts1024/velo-sdk` 1.0.0 |
| Stellar | `@stellar/stellar-sdk` 16.4.1 |
| Network | Stellar Testnet (Soroban + Horizon) |

---

## Safety notes

- Testnet only. No mainnet assets, keys or endpoints are used.
- The owner key never leaves the server; the agent key is scoped by Noir.
- The agent cannot exceed the on-chain cap, asset allowlist or expiry, even if
  the UI or planner is compromised.
- `check_payment` is called before every live Noir payment; `authorize`
  re-checks it inside the contract.
- Revoking the agent sweeps the remaining escrow back to the owner.
- `.data/` contains disposable Testnet secrets and is gitignored.

---

## Repository layout

```
src/
  app/                 Pages and API routes
  components/          UI primitives, shell, provider, toasts
  lib/
    agent.ts           Planner, policy checks, execution loop
    noir.ts            Noir SDK adapter and contract reads
    velo.ts            Velo client, checkout and webhook verification
    bootstrap.ts       Live Testnet vault creation + SAC deployment
    store.ts           JSON persistence, sandbox seed, wallet secrets
    catalog.ts         Fixed approved service catalog
    config.ts          Contract IDs, asset helpers, explorer URLs
scripts/
  verify-noir-reads.mjs  Read-only on-chain smoke test
```

---

## License

MIT — hackathon submission, provided as-is.
