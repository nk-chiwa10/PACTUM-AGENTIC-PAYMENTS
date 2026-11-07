# Deploy PACTUM on Render

PACTUM is a full-stack Next.js app with on-chain state persisted to a JSON
directory. The included `render.yaml` deploys it as a Render **Web Service**
with a **1 GB persistent disk**, so the Testnet vault survives restarts and
redeploys.

## One-click Blueprint

https://render.com/deploy?repo=https://github.com/nk-chiwa10/PACTUM-AGENTIC-PAYMENTS

1. Sign in to Render (GitHub login is fine).
2. Confirm the Blueprint for `nk-chiwa10/PACTUM-AGENTIC-PAYMENTS`.
3. Approve the resources. It creates:
   - Web service `pactum-agent`
   - Persistent disk `pactum-data` mounted at `/var/data`
   - `PACTUM_DATA_DIR=/var/data` so the wallet and state live on the disk
4. Wait for the first build and deploy (~5 minutes).
5. Open the service URL. It starts in **Sandbox** mode.
6. Click **Go live** and wait ~2 minutes. PACTUM creates a fresh Testnet
   vault on the disk: Friendbot funding, trustlines, demo-USDC SAC, device
   registration, on-chain policy and a 120 USDC escrow.
7. Run the demo prompts from `DEMO.md`.

## Cost and plan

The Blueprint uses the **Starter** plan because Render persistent disks are not
available on the free plan. At the time of writing that is roughly $7/month.

### Free alternative (ephemeral state)

If you do not want to pay:

1. In `render.yaml`, change `plan: starter` to `plan: free`.
2. Delete the `disk:` block.
3. Delete the `PACTUM_DATA_DIR` env var (or set it to a temp path).

The app still deploys and works, but Render's free filesystem is ephemeral and
the service spins down after inactivity. Every restart/redeploy loses the vault
and returns the app to sandbox. You must click **Go live** again to recreate a
vault. Do not use this mode for a judged live demo.

## Important notes

- **The hosted instance is a new vault.** It generates its own wallet and
  on-chain hashes. The hashes in `SUBMISSION.md` and `docs/pactum-proof.json`
  are from the original local vault and remain valid evidence, but the hosted
  instance will not match them until it bootstraps and pays.
- **No authentication.** Anyone with the Render URL can use the app, including
  triggering Testnet payments. This is acceptable for test USDC, but do not add
  mainnet keys or real funds.
- **Velo hosted checkout still needs `VELO_API_KEY`.** Add it in the Render
  dashboard under Environment if you have a Testnet key. Without it, the Velo
  rail is clearly labeled sandbox.
- **Node version.** `.node-version` pins Node 24. The Noir SDK prints an
  engine warning below 24.22.1, but the app runs correctly.
- **Build memory.** The Starter plan has enough memory for the Next.js build.
  If the build is OOM-killed, upgrade the instance or set
  `NODE_OPTIONS=--max-old-space-size=460`.

## Manual setup (without the Blueprint)

Create a **Web Service** from the GitHub repo with:

| Setting | Value |
| --- | --- |
| Runtime | Node |
| Build command | `npm ci && npm run build` |
| Start command | `npm start -- -H 0.0.0.0 -p $PORT` |
| Health check | `/api/state` |
| Disk mount | `/var/data` (1 GB) |
| `PACTUM_DATA_DIR` | `/var/data` |

Add the Noir contract IDs, `NOIR_RPC_URL`, `VELO_ENV=testnet` and
`VELO_BASE_URL=https://www.velo-build.dev` as environment variables. The
defaults in `src/lib/config.ts` already match the Testnet deployment, so only
`PACTUM_DATA_DIR` is strictly required.

## Verify a hosted deploy

```bash
curl https://<your-service>.onrender.com/api/state
curl -X POST https://<your-service>.onrender.com/api/noir/status
```

The first returns `mode: "live"` after bootstrap; the second returns
`3/3` reachable contracts after the vault is live.
