export type PactumMode = "live" | "sandbox";
export type PaymentRail = "noir" | "velo";
export type TransactionStatus =
  | "planning"
  | "policy_passed"
  | "awaiting_payment"
  | "settling"
  | "settled"
  | "blocked"
  | "failed";

export type StepStatus = "pending" | "running" | "complete" | "blocked" | "failed";

export interface Service {
  id: string;
  name: string;
  category: string;
  description: string;
  price: number;
  asset: string;
  merchant: string;
  merchantName: string;
  rail: PaymentRail;
  tags: string[];
  latency: string;
  accent: "gold" | "violet" | "cyan" | "mint";
}

export interface SpendingPolicy {
  totalBudget: number;
  perTxCap: number;
  asset: string;
  allowedMerchants: string[];
  allowedServiceIds: string[];
  autoApprove: boolean;
  expiresAt: string | null;
  updatedAt: string;
  onchainTxHash?: string | null;
}

export interface AgentIdentity {
  mode: PactumMode;
  network: "testnet";
  ownerAddress: string;
  agentAddress: string;
  merchantAddress: string;
  deviceHash: string;
  deviceLabel: string;
  assetCode: string;
  assetIssuer: string | null;
  assetSac: string;
  escrowBalance: number;
  escrowToken: string | null;
  policyOnchain: boolean;
  createdAt: string;
  bootstrapTxHashes: Record<string, string | null>;
}

export interface TransactionStep {
  id: string;
  label: string;
  detail: string;
  status: StepStatus;
  at?: string;
  txHash?: string;
  explorerUrl?: string;
  durationMs?: number;
}

export interface Transaction {
  id: string;
  createdAt: string;
  updatedAt: string;
  serviceId: string;
  serviceName: string;
  category: string;
  merchant: string;
  merchantName: string;
  amount: number;
  asset: string;
  rail: PaymentRail;
  status: TransactionStatus;
  prompt: string;
  rationale: string;
  steps: TransactionStep[];
  policyChecks: string[];
  noirTxHash?: string | null;
  noirClaimTxHash?: string | null;
  veloPaymentIntentId?: string | null;
  veloCheckoutUrl?: string | null;
  stellarTxHash?: string | null;
  explorerUrl?: string | null;
  error?: string | null;
  simulated?: boolean;
}

export interface AuditEvent {
  id: string;
  at: string;
  kind: "system" | "policy" | "noir" | "velo" | "stellar" | "agent";
  title: string;
  detail: string;
  txHash?: string | null;
  explorerUrl?: string | null;
  level?: "info" | "success" | "warn" | "error";
}

export interface PactumState {
  version: 1;
  mode: PactumMode;
  identity: AgentIdentity;
  policy: SpendingPolicy;
  transactions: Transaction[];
  audit: AuditEvent[];
  lastSync: string;
  bootstrap: {
    status: "idle" | "running" | "complete" | "failed";
    completedSteps: string[];
    error?: string | null;
  };
  velo: {
    configured: boolean;
    environment: string;
    lastPaymentIntentId?: string | null;
    lastCheckoutUrl?: string | null;
    lastSessionAt?: string | null;
    webhookPath: string;
  };
  llm: {
    configured: boolean;
    model: string;
  };
}

export interface NoirStatus {
  mode: PactumMode;
  configured: boolean;
  rpcUrl: string;
  contracts: {
    deviceRegistry: string;
    agentRegistry: string;
    paymentEscrow: string;
  };
  device: {
    hash: string;
    owner: string | null;
    agent: string | null;
    active: boolean;
    policy: {
      agent: string;
      maxAmount: string;
      asset: string;
      expiresAt: string | null;
    } | null;
  };
  escrow: {
    balance: string;
    token: string | null;
  };
  merchantPending: string;
  latencyMs: number;
  checkedAt: string;
  errors: string[];
}

export interface VeloStatus {
  configured: boolean;
  environment: string;
  baseUrl: string;
  webhookConfigured: boolean;
  webhookPath: string;
  lastPaymentIntentId?: string | null;
  lastCheckoutUrl?: string | null;
  lastSessionAt?: string | null;
}

export interface AgentRunResult {
  transaction: Transaction;
  state: PactumState;
}
