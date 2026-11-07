import type { Metadata } from "next";
import "./globals.css";
import { AppShell } from "@/components/shell/app-shell";
import { PactumProvider } from "@/components/providers/pactum-provider";
import { readState } from "@/lib/store";
import { getVeloStatus } from "@/lib/velo";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "PACTUM — Autonomous AI Payments on Stellar",
  description:
    "PACTUM is an autonomous AI payment agent secured by Noir smart contracts and powered by Velo on Stellar Testnet.",
  applicationName: "PACTUM",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const state = readState();
  const velo = getVeloStatus(state);

  return (
    <html lang="en">
      <body>
        <PactumProvider initialState={state} initialVelo={velo}>
          <AppShell>{children}</AppShell>
        </PactumProvider>
      </body>
    </html>
  );
}
