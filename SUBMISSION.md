# PACTUM — Hackathon Submission

**Autonomous AI Agent for Paying Digital Services**
*Intelligence in Motion. Trust in Every Transaction.*

| | |
| --- | --- |
| Hackathon | Velo x Noir Agentic Payment Hackathon |
| Category | Agentic Payments / Web3 / AI |
| Network | Stellar Testnet (Soroban + Horizon) |
| App | Next.js 16.4.5, React 19.3.1, Tailwind CSS 4, TypeScript 5.9 |
| SDKs | `@noirx402/agent-sdk` 0.3.0, `@carts1024/velo-sdk` 1.0.0, `@stellar/stellar-sdk` 16.4.1 |
| Source | this repository (`npm install && npm run dev`) |

---

## The problem

Software is increasingly bought by software: API credits, databases, domains,
GPU bursts, cloud hosting. These are recurring, low-value, high-frequency
purchases. Handing an autonomous agent a credit card is unsafe. Giving it no
way to pay makes it useless.

## The product

PACTUM lets an operator state a goal in plain language. The agent then:

1. **Understands** the request and extracts category, price sensitivity and any
   explicit cap.
2. **Selects** a service from a fixed, operator-approved catalog.
3. **Constrains** the purchase locally and on-chain through Noir's
   `agent_registry.check_payment`.
4. **Settles** on Stellar Testnet: Noir escrow (`authorize` + merchant
   `claim`) or a Velo hosted checkout session.

The AI decides *what* to buy. **Noir decides whether it is allowed.** Stellar
settles it. The agent never holds the owner's funds; it holds a scoped key that
the contracts can refuse.

---

## Live Testnet deployment

The exact Noir deployment referenced by the hackathon brief:

| Contract | Address |
| --- | --- |
| `device_registry` | `CB4DPMGOA374JIB2ZVD4AHW5GJKQUYNOFGRYNOJ75EFH2KCJSMHOWIRA` |
| `agent_registry` | `CBTDMJVCFQDIVWZBKAKZ2FQ3UEJNAAUFYCTJ3E4ON2MYXPLPSIXQ25JZ` |
| `payment_escrow` | `CA5S4S7QGHJHJWVJBYL3CXZXZTNGKXMNZVDAEQNN7NUXFP4D7BYK7HIX` |

> The brief's PDF renders two `0` characters where Stellar StrKey base32
> requires the letter `O`. The IDs above are the checksum-valid on-chain IDs.

Live vault created by `POST /api/bootstrap`:

| Role | Address |
| --- | --- |
| Owner / vault | `GB3SSV7PWTSIHVYICX2OGPNNHVLI26JCJBZXUFGPSDGMWJSWXXAP2RKW` |
| Agent key | `GD537TTWDOTBPPV6E7LSYYWU65QSPPXELMD6AR6CE72WQGII6M44OGOT` |
| Merchant | `GDCVTZG4T7HGJ373QHCSDJEMJVDY5THIPXK7N5B3ITU4ZJ5EBFANWTPO` |
| Demo USDC SAC | `CAENVXKI3D63QBG3SU4IQ227YLQ3RER2ULIVXNWHZRVROQAOF7NZKZMG` |

**Escrow:** 120 test USDC funded at bootstrap, debited by each Noir payment.
**On-chain per-payment cap:** 5.00 USDC (`max_amount = 50000000` stroops).

### Verified transaction hashes

All hashes below were confirmed `SUCCESS` on Stellar Testnet with
`npm run verify:live` (Soroban RPC, Horizon fallback for classic operations).
**Final result: 22/22 hashes confirmed.**

| Artifact | Hash |
| --- | --- |
| Friendbot owner | `0e9e1b3b0abb8a2a9c12b7fbf725a7fce6b931d6f57e912d6c35dd916a9fcc7b` |
| Friendbot agent | `6cc07d96868805c4bf8cc4968cfde8db434983ff922fb68a29158dc21833bff8` |
| Friendbot merchant | `f82a876e498809e54e471629e3dd5cef2df343e550743e124adce7d994202317` |
| Friendbot issuer | `e1e631cf4879a2cf120e5d768e2defc9cd88fa5e4ad28466c15fa2dc97fe3c34` |
| Trustlines + issuance | `89dc9629259ac290b88e95bb47c00d4ef92d31eab6f67853cb5e3d91c77c0a32` |
| Deploy demo-USDC SAC | `eec8e7e32c185d94f869c33dc6ae74ccf65757a4face2fd7b7fcef26fda8895f` |
| `device_registry.register` | `0e12ff236ae594658eb903c9ecd9c6b54a787f2e9c6ba102b60672fb6a0c69ab` |
| `agent_registry.register_agent` | `24b83d8e940bf706b728b7e47194d70126fa6dd33df83dcab74f8f6992007d7f` |
| `payment_escrow.fund_escrow` | `27680a907f4769cb0a0475b4ab6a4ca03cceab91bb415b712b03bb1f9f33e1e6` |
| Policy revoke (cap 10 → 5) | `526e482cdf33d9169aa870be7c45132c4b6dc40183d7e9939c664996950cb787` |
| Policy re-register (cap 5) | `ef5cd4a50ca775911788b26a2a1d4c6a4a5671b282d012c1f251545102ce4752` |
| Payment 1 authorize | `be64ab2a5eb0422f5c630edfe76e3df35e67669a4bed380ef0edd5df90c3dd46` |
| Payment 1 claim | `524acecc1651bc335d405f59905cecb423810d7a19fce37dcfe01e8743a0d360` |
| Payment 2 authorize | `282b40223059c53996713887a3d1235aa6327b9ef57a9d0d9082173c2e4aab33` |
| Payment 2 claim | `edcbce60d1fb11d7bd2045688ef59cf2ca919073625bd34036b2f5127b630677` |
| Payment 3 authorize | `0ce822c0cd04ba01cb45d3a22da58bba183d6b796adf32203a004d369a8b02f9` |
| Payment 3 claim | `d9925ffad8f18302cedbe39d1051fdb22b2c6940026d9653d2a21e6e69900b23` |
| Payment 4 authorize | `b8f3d029b1ec78dcd46657af20c5e7e180e9c1002323fd2b5a793c81c306c3b4` |
| Payment 4 claim | `cf963d2b61751362ecce929c8f312d1604a845b49f7eb28fb0b82962d4422018` |
| Payment 5 authorize | `4a09082caba38a509e214052cb9131fc4ec444abebcb21569728d9edfd409931` |
| Payment 5 claim | `f64086d90141d31b17a39c78e93c267bd92a9990029926fd33445f7d681b2198` |
| Payment 6 authorize | `f237bbfb24f94591b6486767db7d66d840743f5b3ce4d3b0678d83d509b35f21` |
| Payment 6 claim | `bad01b129c8cbea7bdceb0592c3277a4c96c0d5d74f62df150379ccc653ae445` |

Payment 6 is the final LedgerDB run; the blocked GPU run produces no hash by
design. Both are recorded in `docs/pactum-proof.json` and in the app's
**On-chain Proof** page. Re-verify everything with:

```bash
npm run verify:live
```

Every row links to `https://stellar.expert/explorer/testnet/tx/<hash>`.

### Submission artifacts

| Artifact | Location |
| --- | --- |
| Machine-readable proof bundle (22 hashes, 3/3 contracts, 7 transactions) | `docs/pactum-proof.json` |
| Screenshots of all five pages | `docs/screenshots/` |
| Demo and pitch script | `DEMO.md` |
| Read-only contract smoke test | `npm run verify:noir` |
| Full hash verification | `npm run verify:live` |

The proof bundle is generated from a running instance with
`npm run proof:export` and includes the app state, Velo configuration, Noir
contract health and every on-chain artifact. Screenshots are regenerated with
`scripts/capture-screenshots.ps1`.

---

## Requirement checklist

| Requirement | Status | Evidence |
| --- | --- | --- |
| Agentic payment project | **Done** | Natural-language goal → catalog selection → policy check → settlement. |
| Latest Noir Testnet contracts | **Done** | Real calls to `device_registry`, `agent_registry`, `payment_escrow` at the brief's addresses. |
| Built with Velo (`@carts1024/velo-sdk`) | **Done** | SDK installed; server-side client, checkout creation, webhook HMAC verification, sandbox flow exercised. |
| Wallet connection | **Done (server-custodied)** | The app generates and persists a disposable Testnet vault in `.data/wallet.json`; no Freighter dependency. See limitations. |
| Agent registration via Noir | **Done** | `device_registry.register` + `agent_registry.register_agent` hashes above. |
| Escrow funding and checks | **Done** | `fund_escrow` 120 USDC; `check_payment` before every Noir payment; balance read live. |
| AI decisions | **Done** | Deterministic policy planner by default; optional OpenAI selection from the same fixed catalog. |
| Successful Testnet payment | **Done** | Six Noir authorize/claim pairs confirmed on-chain; Velo sandbox checkout settles in-app. |
| Transaction history | **Done** | `/transactions` ledger with per-run trace, policy checks, hashes and explorer links. |
| Analytics | **Done** | Dashboard metrics, budget usage, rail split and activity chart. |
| NFC | Not implemented | Explicitly optional in the brief. |

---

## How the decision loop works

```
Goal ──▶ parse intent ──▶ filter catalog ──▶ score fit/price ──▶ policy preflight
                                                                     │
                                          ┌──────────────────────────┴──────────────────────┐
                                          ▼                                                 ▼
                                 Noir check_payment                              Velo checkout session
                                          │                                                 │
                                 authorize + claim                                 hosted payment + webhook
                                          └──────────────────▶ Stellar Testnet ◀───────────┘
```

- **Intent filtering** keeps the agent honest: if the request names a service
  category (GPU, database, domain), only those candidates are considered. It
  will not silently substitute an unrelated cheap service.
- **Price exactness**: the planner never invents a service or a price. Every
  purchase comes from the fixed catalog.
- **Double guardrail**: the app checks amount, budget, merchant, category and
  expiry; then Noir re-checks the same limits inside `check_payment` and
  `authorize`.
- **Blocked example**: `"Try to buy a 50 USDC GPU cluster for one hour."`
  selects Horizon GPU at 8.00 USDC and is blocked with
  `8.00 USDC exceeds the 5.00 USDC per-payment cap.` No funds move, no hash is
  produced.
- **Allowed example**: `"Buy an affordable AI API subscription under 5 USDC."`
  selects Nebula AI at 2.00 USDC and settles through the Noir escrow.

---

## Two payment rails

### Noir escrow

1. The owner funds `payment_escrow` with test USDC.
2. The agent calls `check_payment` and receives an allow/deny decision.
3. `authorize` debits the device escrow and credits the merchant's pending
   balance.
4. The merchant calls `claim` to sweep the pending balance.

The agent key can only spend within the on-chain cap, asset allowlist and
expiry. Revoking the agent sweeps the remaining escrow back to the owner.

### Velo

- `createVeloClient()` builds `new Velo({ apiKey, environment: "testnet" })`.
- Checkout sessions use `velo.checkout.sessions.create(...)` with an
  idempotency key.
- `POST /api/velo/webhook` verifies `Velo.webhooks.verify` signatures before
  updating a transaction.
- Without `VELO_API_KEY`, the app **explicitly** returns a sandbox session
  (`pi_sandbox_*`) and labels it as sandbox. It never pretends a sandbox
  checkout is a live payment, and it never silently switches rails.

---

## Pages

| Page | What it shows |
| --- | --- |
| `/` Overview | Vault, budget, policy envelope, rail status, analytics, recent activity. |
| `/agent` Agent Console | Chat, suggested prompts, live decision trace, guardrail outcomes. |
| `/policies` Spending Policies | Budget, per-payment cap, expiry, service allowlist; publishes to Noir. |
| `/transactions` Transactions | Searchable ledger, per-transaction steps, policy checks, hashes. |
| `/proof` On-chain Proof | Contract health, live identity, Velo status, artifact list, JSON proof bundle. |

---

## Three-minute demo script

See [`DEMO.md`](./DEMO.md) for the full walkthrough, fallback plans and Q&A
notes.

| Time | Action | Expected result |
| --- | --- | --- |
| 0:00 | Open `/` | Live vault, 5.00 USDC cap, escrow balance, both rails visible. |
| 0:20 | Open `/agent`, send *"Buy an affordable AI API subscription under 5 USDC."* | Nebula AI selected, policy passed, authorize + claim hashes. |
| 1:10 | Send *"Try to buy a 50 USDC GPU cluster for one hour."* | Horizon GPU selected, **blocked** by the 5.00 USDC cap. No hash. |
| 1:40 | Open `/transactions` | Both runs visible; open the settled one to show the trace. |
| 2:10 | Open `/proof` | 3/3 contracts reachable, artifacts, Velo SDK status, proof bundle. |
| 2:40 | Close on the thesis | AI decides what; Noir decides whether; Stellar settles. |

---

## Run locally

```bash
npm install
cp .env.example .env.local
npm run dev
```

Open <http://localhost:3000>. The app starts in sandbox mode with seeded data.
Click **Go live** (`POST /api/bootstrap`) to create a real Testnet vault. The
bootstrap is idempotent and takes ~2 minutes on a cold run.

Verification commands:

```bash
npm run typecheck       # TypeScript
npm run build           # production build
npm run verify:noir     # read-only contract smoke test, no keys
npm run verify:live     # verify every stored Testnet hash
node scripts/export-proof.mjs   # write docs/pactum-proof.json from a running app
```

Required: Node.js 22+ (Node 24 recommended). Optional keys: `VELO_API_KEY`
(live hosted checkout), `OPENAI_API_KEY` (LLM selection), `VELO_WEBHOOK_SECRET`
(webhook verification).

---

## Repository map

```
src/
  app/                     Pages + API routes
  components/              Design system, shell, provider, toasts
  lib/
    agent.ts               Planner, policy preflight, execution loop
    noir.ts                Noir SDK adapter and on-chain reads
    velo.ts                Velo client, checkout, webhook verification
    bootstrap.ts           Live Testnet vault creation + SAC deployment
    store.ts               Persistence, sandbox seed, wallet secrets
    catalog.ts             Fixed approved service catalog
    config.ts              Contract IDs, assets, explorer URLs
scripts/
  verify-noir-reads.mjs    Read-only on-chain smoke test
  verify-live-run.mjs      Verify every stored Testnet hash
  export-proof.mjs         Export a proof bundle from a running instance
docs/                      Proof bundle and screenshots
```

---

## Honest limitations

These are deliberate, documented boundaries — not hidden behavior.

1. **Test USDC is self-issued.** The demo asset is a Stellar Testnet asset
   issued by the bootstrap, with its SAC deployed so the escrow can transfer
   it. It exercises the same token flow as USDC but has no real value.
2. **The wallet is server-custodied.** The brief allows a wallet connection;
   PACTUM instead generates and persists a disposable Testnet vault so the
   demo works without a browser extension. `PACTUM_*_SECRET` variables allow
   bringing your own keys. A production build would use Freighter or
   passkey-based signing.
3. **Velo hosted checkout needs a key.** Without `VELO_API_KEY`, the Velo rail
   runs an explicitly labeled sandbox session. The SDK integration, idempotency
   key usage and webhook verification are real; only the hosted redirect needs
   a Testnet key.
4. **The catalog is fixed.** The agent cannot invent merchants, prices or
   assets. This is a safety property, not a missing feature; the LLM only
   ranks approved options.
5. **Testnet only.** No mainnet assets, keys or endpoints are used.
6. **NFC is not implemented** (optional in the brief).

---

## License

MIT — hackathon submission, provided as-is.
