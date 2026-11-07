"use client";

import { AlertTriangle, CheckCircle2, Info, X, XCircle } from "lucide-react";
import { usePactum } from "@/components/providers/pactum-provider";
import { cn } from "@/lib/utils";

const toneStyles = {
  success: {
    icon: CheckCircle2,
    ring: "border-mint-500/25",
    iconClass: "text-mint-400",
    glow: "shadow-[0_20px_70px_-30px_rgba(52,211,153,0.45)]",
  },
  error: {
    icon: XCircle,
    ring: "border-rose-500/25",
    iconClass: "text-rose-400",
    glow: "shadow-[0_20px_70px_-30px_rgba(251,113,133,0.45)]",
  },
  warning: {
    icon: AlertTriangle,
    ring: "border-amber-400/25",
    iconClass: "text-amber-300",
    glow: "shadow-[0_20px_70px_-30px_rgba(251,191,36,0.4)]",
  },
  info: {
    icon: Info,
    ring: "border-violet-500/25",
    iconClass: "text-violet-300",
    glow: "shadow-[0_20px_70px_-30px_rgba(139,92,246,0.4)]",
  },
} as const;

export function ToastViewport() {
  const { toasts, dismissToast } = usePactum();

  return (
    <div className="pointer-events-none fixed bottom-5 right-5 z-[70] flex w-[min(92vw,380px)] flex-col gap-2.5">
      {toasts.map((toast) => {
        const tone = toneStyles[toast.tone];
        const Icon = tone.icon;
        return (
          <div
            key={toast.id}
            className={cn(
              "glass pointer-events-auto animate-fade-up rounded-xl border p-3.5",
              tone.ring,
              tone.glow,
            )}
            role="status"
          >
            <div className="flex items-start gap-3">
              <Icon className={cn("mt-0.5 size-4 shrink-0", tone.iconClass)} />
              <div className="min-w-0 flex-1">
                <div className="text-[13px] font-medium text-ink-50">
                  {toast.title}
                </div>
                {toast.description && (
                  <div className="mt-1 text-[11px] leading-relaxed text-ink-300">
                    {toast.description}
                  </div>
                )}
              </div>
              <button
                onClick={() => dismissToast(toast.id)}
                className="grid size-5 shrink-0 place-items-center rounded text-ink-400 transition hover:bg-white/5 hover:text-ink-100"
                aria-label="Dismiss notification"
              >
                <X className="size-3.5" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
