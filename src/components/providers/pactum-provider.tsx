"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type {
  PactumState,
  SpendingPolicy,
  Transaction,
  VeloStatus,
} from "@/lib/types";

type ToastTone = "success" | "error" | "info" | "warning";

interface Toast {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
}

interface PolicyPayload {
  totalBudget: number;
  perTxCap: number;
  autoApprove: boolean;
  allowedServiceIds: string[];
  expiresAt: string | null;
}

interface BootstrapOutcome {
  ok: boolean;
  steps: string[];
  error?: string;
}

interface PactumContextValue {
  state: PactumState;
  velo: VeloStatus | null;
  ready: boolean;
  running: boolean;
  bootstrapping: boolean;
  savingPolicy: boolean;
  pendingTx: string | null;
  bootstrapOpen: boolean;
  setBootstrapOpen: (open: boolean) => void;
  toasts: Toast[];
  toast: (toast: Omit<Toast, "id">) => void;
  dismissToast: (id: string) => void;
  refresh: () => Promise<PactumState | null>;
  runPrompt: (prompt: string) => Promise<Transaction | null>;
  savePolicy: (payload: PolicyPayload) => Promise<boolean>;
  bootstrap: () => Promise<BootstrapOutcome>;
  resetDemo: () => Promise<void>;
  settleTransaction: (id: string) => Promise<void>;
  verifyTransaction: (id: string) => Promise<void>;
}

const PactumContext = createContext<PactumContextValue | null>(null);

async function readJson(response: Response): Promise<Record<string, unknown>> {
  const text = await response.text();
  if (!text) return {};
  try {
    return JSON.parse(text) as Record<string, unknown>;
  } catch {
    return { error: text.slice(0, 300) };
  }
}

export function PactumProvider({
  initialState,
  initialVelo,
  children,
}: {
  initialState: PactumState;
  initialVelo: VeloStatus | null;
  children: React.ReactNode;
}) {
  const [state, setState] = useState<PactumState>(initialState);
  const [velo, setVelo] = useState<VeloStatus | null>(initialVelo);
  const [running, setRunning] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [savingPolicy, setSavingPolicy] = useState(false);
  const [pendingTx, setPendingTx] = useState<string | null>(null);
  const [bootstrapOpen, setBootstrapOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [ready, setReady] = useState(false);
  const timers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map());

  useEffect(() => {
    setReady(true);
    return () => {
      for (const timer of timers.current.values()) clearTimeout(timer);
      timers.current.clear();
    };
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((current) => current.filter((toast) => toast.id !== id));
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
  }, []);

  const toast = useCallback(
    (next: Omit<Toast, "id">) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      setToasts((current) => [...current.slice(-3), { ...next, id }]);
      const timer = setTimeout(() => {
        setToasts((current) => current.filter((item) => item.id !== id));
        timers.current.delete(id);
      }, next.tone === "error" ? 9000 : 6000);
      timers.current.set(id, timer);
    },
    [],
  );

  const refresh = useCallback(async () => {
    try {
      const response = await fetch("/api/state", { cache: "no-store" });
      const payload = await readJson(response);
      if (!response.ok) throw new Error(String(payload.error ?? response.statusText));
      if (payload.state) {
        setState(payload.state as PactumState);
      }
      if (payload.velo) setVelo(payload.velo as VeloStatus);
      return (payload.state as PactumState) ?? null;
    } catch (error) {
      toast({
        tone: "error",
        title: "Could not refresh state",
        description: error instanceof Error ? error.message : String(error),
      });
      return null;
    }
  }, [toast]);

  const runPrompt = useCallback(
    async (prompt: string) => {
      if (running) return null;
      setRunning(true);
      try {
        const response = await fetch("/api/agent/run", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ prompt }),
        });
        const payload = await readJson(response);
        if (!response.ok) {
          throw new Error(String(payload.error ?? "The agent run failed."));
        }
        const transaction = payload.transaction as Transaction;
        if (payload.state) setState(payload.state as PactumState);

        if (transaction.status === "settled") {
          toast({
            tone: "success",
            title: "Payment settled autonomously",
            description: `${transaction.serviceName} · ${transaction.amount.toFixed(2)} ${transaction.asset} · ${transaction.rail === "noir" ? "Noir escrow" : "Velo checkout"}`,
          });
        } else if (transaction.status === "blocked") {
          toast({
            tone: "warning",
            title: "Policy blocked the payment",
            description: transaction.error ?? undefined,
          });
        } else if (transaction.status === "awaiting_payment") {
          toast({
            tone: "info",
            title: "Velo checkout ready",
            description: transaction.simulated
              ? "Sandbox checkout created. Complete it from the transaction panel."
              : "Open the hosted checkout to finish the payment.",
          });
        } else if (transaction.status === "failed") {
          toast({
            tone: "error",
            title: "Payment failed",
            description: transaction.error ?? undefined,
          });
        }
        return transaction;
      } catch (error) {
        toast({
          tone: "error",
          title: "Agent run failed",
          description: error instanceof Error ? error.message : String(error),
        });
        return null;
      } finally {
        setRunning(false);
      }
    },
    [running, toast],
  );

  const savePolicy = useCallback(
    async (payload: PolicyPayload) => {
      setSavingPolicy(true);
      try {
        const response = await fetch("/api/policies", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify(payload),
        });
        const result = await readJson(response);
        if (!response.ok) {
          throw new Error(String(result.error ?? "Could not save the policy."));
        }
        if (result.state) setState(result.state as PactumState);
        if (result.warning) {
          toast({
            tone: "warning",
            title: "Policy saved with a warning",
            description: String(result.warning),
          });
        } else if (state.mode === "live") {
          toast({
            tone: "success",
            title: "Policy published to Noir",
            description: "The agent's on-chain limits were updated on Stellar Testnet.",
          });
        } else {
          toast({
            tone: "success",
            title: "Policy updated",
            description:
              "Sandbox policy saved. Initialize the Testnet vault to publish it on-chain.",
          });
        }
        return true;
      } catch (error) {
        toast({
          tone: "error",
          title: "Policy update failed",
          description: error instanceof Error ? error.message : String(error),
        });
        return false;
      } finally {
        setSavingPolicy(false);
      }
    },
    [state.mode, toast],
  );

  const bootstrap = useCallback(async (): Promise<BootstrapOutcome> => {
    if (bootstrapping) return { ok: false, steps: [], error: "Already running" };
    setBootstrapping(true);
    setBootstrapOpen(true);
    try {
      const response = await fetch("/api/bootstrap", { method: "POST" });
      const payload = await readJson(response);
      if (!response.ok) {
        if (payload.state) setState(payload.state as PactumState);
        const error = String(payload.error ?? "Live initialization failed.");
        toast({ tone: "error", title: "Testnet setup failed", description: error });
        return {
          ok: false,
          steps: Array.isArray(payload.steps) ? (payload.steps as string[]) : [],
          error,
        };
      }
      if (payload.state) setState(payload.state as PactumState);
      void refresh();
      toast({
        tone: "success",
        title: "PACTUM is live on Stellar Testnet",
        description:
          "Noir device, agent policy and escrow are now real on-chain state.",
      });
      return {
        ok: true,
        steps: Array.isArray(payload.steps) ? (payload.steps as string[]) : [],
      };
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      toast({
        tone: "error",
        title: "Testnet setup failed",
        description: message,
      });
      return { ok: false, steps: [], error: message };
    } finally {
      setBootstrapping(false);
    }
  }, [bootstrapping, refresh, toast]);

  const resetDemo = useCallback(async () => {
    try {
      const response = await fetch("/api/demo/reset", { method: "POST" });
      const payload = await readJson(response);
      if (!response.ok) {
        throw new Error(String(payload.error ?? "Reset failed."));
      }
      if (payload.state) setState(payload.state as PactumState);
      toast({
        tone: "info",
        title: "Sandbox reset",
        description: "A fresh local demo state was generated.",
      });
    } catch (error) {
      toast({
        tone: "error",
        title: "Reset failed",
        description: error instanceof Error ? error.message : String(error),
      });
    }
  }, [toast]);

  const settleTransaction = useCallback(
    async (id: string) => {
      setPendingTx(id);
      try {
        const response = await fetch(`/api/transactions/${id}/settle`, {
          method: "POST",
        });
        const payload = await readJson(response);
        if (!response.ok) {
          throw new Error(String(payload.error ?? "Could not settle the payment."));
        }
        if (payload.state) setState(payload.state as PactumState);
        toast({
          tone: "success",
          title: "Checkout completed",
          description: "The Velo sandbox payment is marked settled.",
        });
      } catch (error) {
        toast({
          tone: "error",
          title: "Settlement failed",
          description: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setPendingTx(null);
      }
    },
    [toast],
  );

  const verifyTransaction = useCallback(
    async (id: string) => {
      setPendingTx(id);
      try {
        const response = await fetch(`/api/transactions/${id}/verify`, {
          method: "POST",
        });
        const payload = await readJson(response);
        if (!response.ok) {
          throw new Error(String(payload.error ?? "Could not verify the payment."));
        }
        if (payload.state) setState(payload.state as PactumState);
        const intent = payload.intent as { status?: string } | undefined;
        if (intent?.status === "paid") {
          toast({
            tone: "success",
            title: "Velo payment verified",
            description: "The Stellar ledger confirms this checkout was paid.",
          });
        } else {
          toast({
            tone: "info",
            title: "Payment not settled yet",
            description: payload.message
              ? String(payload.message)
              : `Velo reports the intent as ${intent?.status ?? "pending"}.`,
          });
        }
      } catch (error) {
        toast({
          tone: "error",
          title: "Verification failed",
          description: error instanceof Error ? error.message : String(error),
        });
      } finally {
        setPendingTx(null);
      }
    },
    [toast],
  );

  const value = useMemo<PactumContextValue>(
    () => ({
      state,
      velo,
      ready,
      running,
      bootstrapping,
      savingPolicy,
      pendingTx,
      bootstrapOpen,
      setBootstrapOpen,
      toasts,
      toast,
      dismissToast,
      refresh,
      runPrompt,
      savePolicy,
      bootstrap,
      resetDemo,
      settleTransaction,
      verifyTransaction,
    }),
    [
      state,
      velo,
      ready,
      running,
      bootstrapping,
      savingPolicy,
      pendingTx,
      bootstrapOpen,
      toasts,
      toast,
      dismissToast,
      refresh,
      runPrompt,
      savePolicy,
      bootstrap,
      resetDemo,
      settleTransaction,
      verifyTransaction,
    ],
  );

  return <PactumContext.Provider value={value}>{children}</PactumContext.Provider>;
}

export function usePactum() {
  const context = useContext(PactumContext);
  if (!context) {
    throw new Error("usePactum must be used inside PactumProvider");
  }
  return context;
}
