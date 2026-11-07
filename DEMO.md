# PACTUM — Demo & Pitch Script

**Tagline:** *Intelligence in Motion. Trust in Every Transaction.*

This is a three-minute live demo for the Velo x Noir Agentic Payment Hackathon.
It assumes the app is already running with the live Testnet vault. Every number
below is real Testnet state; no slides are required.

---

## Pre-flight checklist (do this 10 minutes before)

```bash
npm run build
npm start
```

1. Open <http://localhost:3000>.
2. Confirm the header shows **Live** (not Sandbox).
3. Open `/proof` and confirm **3/3 Noir contracts reachable**.
4. Confirm the escrow balance is > 0 and the per-payment cap is **5.00 USDC**.
5. Keep `/transactions` and `/proof` open in background tabs.
6. Have the Stellar Expert explorer ready:
   `https://stellar.expert/explorer/testnet/account/GB3SSV7PWTSIHVYICX2OGPNNHVLI26JCJBZXUFGPSDGMWJSWXXAP2RKW`
7. Close notifications and zoom the browser to ~110% for the recording.

If the network is slow, the fallback is the sandbox mode (`npm run dev` with no
`.data` state). It demonstrates the same UX with simulated hashes; say so
explicitly rather than passing it off as live.

---

## The three-minute script

### 0:00–0:20 — The thesis (Overview)

> "Software is starting to buy software. API credits, databases, domains, GPU
> bursts — small, frequent purchases. You can't give an autonomous agent your
> credit card, but if it can't pay, it can't work.
>
> PACTUM is an autonomous payment agent with a three-contract safety envelope.
> The AI decides **what** to buy. Noir decides **whether it's allowed**.
> Stellar settles it."

Point at the overview: live vault, budget, 5.00 USDC cap, Noir and Velo rails.

### 0:20–1:05 — A successful payment (Agent Console)

Open **Agent Console**. Click the first suggestion:

> **"Buy an affordable AI API subscription under 5 USDC."**

While it runs, narrate the trace:

> "It parses the intent, filters the approved catalog, scores fit against price,
> and picks Nebula AI at 2.00 USDC. Before any money moves, it asks the deployed
> Noir `agent_registry.check_payment`. The contract says yes. Then
> `payment_escrow.authorize` debits the escrow, and the merchant `claim`
> settles it on Stellar Testnet."

When it settles, open the transaction and point at the two hashes:

- `authorize` hash
- `claim` hash

> "Both are real Testnet transactions. The agent never held the owner's funds;
> it held a scoped key that the contract could refuse."

### 1:05–1:40 — The guardrail beat (Agent Console)

Click the GPU suggestion, or type:

> **"Try to buy a 50 USDC GPU cluster for one hour."**

Wait for the **Blocked** result.

> "Same agent, same key. It finds Horizon GPU at 8.00 USDC. The policy cap is
> 5.00. The local preflight blocks it, and the deployed Noir predicate confirms:
> over the on-chain per-payment limit. No funds move. There is no transaction
> hash because nothing was submitted.
>
> This is the difference between an agent with a wallet and an agent with a
> mandate."

### 1:40–2:10 — The audit trail (Transactions)

Open **Transactions**.

> "Every run is persisted with its full decision trace: the intent, the
> alternatives rejected, every policy check, the on-chain confirmation, and the
> settlement hashes. This is the audit trail a finance team needs before it lets
> software spend money."

Open the settled run. Scroll the steps. Point at "Policy preflight" and
"Noir escrow settled".

### 2:10–2:40 — Don't trust, verify (On-chain Proof)

Open **On-chain Proof**.

> "The proof page reads the three contracts referenced by the brief directly
> from Soroban RPC — no Noir server, no API key. It shows the live vault, the
> demo-USDC SAC, the policy, the Velo SDK configuration, and every artifact the
> agent produced."

Click **Re-run verification** (3/3). Point at **Velo integration**:

> "Velo is a first-class rail: the server-side SDK creates hosted checkout
> sessions with idempotency keys, and the webhook route verifies HMAC
> signatures. Our hosted redirect needs a Velo Testnet key, so the recorded
> session is explicitly labeled sandbox. The integration is real; the key is the
> only missing piece."

Click **Proof bundle** if there is time. It downloads the JSON evidence.

### 2:40–3:00 — Close

> "PACTUM is live on Stellar Testnet today: real device registration, a real
> on-chain policy, a funded escrow, and repeated authorize/claim settlements.
> The same architecture ports to mainnet by swapping the asset and the Velo
> environment.
>
> Intelligence in Motion. Trust in Every Transaction."

---

## If something goes wrong

| Symptom | Recovery |
| --- | --- |
| Agent run times out | The route has `maxDuration = 300`; wait. If it still fails, refresh and retry once. |
| "PACTUM is already executing" | A previous run is still in flight. Wait for it to finish; do not double-click. |
| Noir verification shows 2/3 | Click **Re-run verification**. RPC can rate-limit; retry once. |
| Escrow is low | Re-run `POST /api/bootstrap`; it tops up idempotently. |
| Network is down | Switch to sandbox: stop the server, back up `.data`, restart with an empty `.data`. The UI is identical but hashes are simulated; disclose that. |
| Velo checkout errors | It is sandbox without `VELO_API_KEY`; that is expected. Show the SDK call and webhook code instead. |

---

## Q&A cheat sheet

**Is the AI actually making the decision?**
Yes. The app ships a deterministic policy planner so the demo is reproducible,
and an optional OpenAI selector that ranks the same fixed catalog. Neither can
invent a merchant, price or asset. The model chooses among approved options; the
contracts enforce the limits.

**Why Noir instead of just checking a database?**
A database check is advisory. Noir's `check_payment` and `authorize` are the
source of truth: even if the app, the UI or the planner is compromised, the
contract refuses an over-cap, wrong-asset or expired payment. The agent key is
scoped; the owner's key never leaves the server.

**What is actually on-chain?**
Device registration, the agent policy (cap, asset, expiry), the funded escrow,
and every authorize/claim pair. Contract reads are live in the proof page. The
demo USDC is self-issued on Testnet and has no real value.

**Why is the wallet server-custodied?**
To make the demo work without a browser extension. The brief allows a wallet
connection, not a specific custody model. Production would use Freighter or
passkeys; the `PACTUM_*_SECRET` variables already allow bringing your own keys.

**What about Velo?**
The SDK is installed and used server-side. We create checkout sessions with
idempotency keys and verify webhook signatures. Hosted checkout requires a Velo
Testnet API key; without it, the app returns a clearly labeled sandbox session.
It never silently falls back or pretends the sandbox is live.

**How fast is a payment?**
The planner is instant. A live Noir payment takes roughly 20–35 seconds end to
end on Testnet, dominated by Soroban RPC confirmation for `authorize` and
`claim`. The UI streams each step.

**What would you build next?**
Per-merchant budgets, time-windowed velocity limits, multi-agent delegation,
and a Velo-hosted checkout with a real anchor. The contract envelope already
supports the first two.

---

## Reset for a clean recording

The live ledger is real and should not be fabricated. If you need a fresh
sandbox for a UI recording:

```bash
# stop the server, move the live state aside, restart
Move-Item .data .data.live-backup
npm run dev
```

The app reseeds sandbox data. Move `.data.live-backup` back to restore the live
vault and its verified hashes.
