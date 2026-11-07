import type { Service } from "./types";

interface ServiceSeed extends Omit<Service, "merchant"> {
  merchantKey: string;
}

const SEEDS: ServiceSeed[] = [
  {
    id: "nebula-ai",
    name: "Nebula AI",
    category: "AI Inference API",
    description:
      "Low-latency inference for chat, summarization and extraction. 1M tokens included.",
    price: 2,
    asset: "USDC",
    merchantName: "Nebula Labs",
    merchantKey: "merchant",
    rail: "noir",
    tags: ["ai", "api", "inference", "llm", "chat", "subscription", "openai"],
    latency: "42 ms",
    accent: "gold",
  },
  {
    id: "vectorly",
    name: "Vectorly",
    category: "Embeddings API",
    description:
      "Hosted vector embeddings with a 10M-vector store and sub-50ms retrieval.",
    price: 1.2,
    asset: "USDC",
    merchantName: "Vectorly Systems",
    merchantKey: "merchant",
    rail: "noir",
    tags: ["ai", "api", "embedding", "vector", "search", "rag", "cheap"],
    latency: "38 ms",
    accent: "cyan",
  },
  {
    id: "axiom-cloud",
    name: "Axiom Cloud",
    category: "Cloud Hosting",
    description:
      "Managed container hosting with autoscaling, TLS and edge deploys. Monthly.",
    price: 4.5,
    asset: "USDC",
    merchantName: "Axiom Infrastructure",
    merchantKey: "merchant",
    rail: "velo",
    tags: ["cloud", "hosting", "deploy", "server", "infrastructure", "vercel"],
    latency: "61 ms",
    accent: "violet",
  },
  {
    id: "ledgerdb",
    name: "LedgerDB",
    category: "Managed Database",
    description:
      "Postgres-compatible managed database with point-in-time recovery and 99.99% SLA.",
    price: 3.25,
    asset: "USDC",
    merchantName: "Ledger Data Co.",
    merchantKey: "merchant",
    rail: "noir",
    tags: ["database", "db", "postgres", "storage", "sql", "managed"],
    latency: "54 ms",
    accent: "mint",
  },
  {
    id: "nameforge",
    name: "NameForge",
    category: "Domain Registration",
    description:
      "Register and manage a production domain with DNS, WHOIS privacy and TLS.",
    price: 1.75,
    asset: "USDC",
    merchantName: "NameForge Registrar",
    merchantKey: "merchant",
    rail: "velo",
    tags: ["domain", "dns", "website", "name", "registration"],
    latency: "76 ms",
    accent: "violet",
  },
  {
    id: "horizon-gpu",
    name: "Horizon GPU",
    category: "GPU Compute",
    description:
      "On-demand H100 burst capacity for training and batch inference. Per hour.",
    price: 8,
    asset: "USDC",
    merchantName: "Horizon Compute",
    merchantKey: "merchant",
    rail: "velo",
    tags: ["gpu", "compute", "training", "h100", "ml", "heavy"],
    latency: "88 ms",
    accent: "gold",
  },
];

export function getCatalog(merchantAddress: string): Service[] {
  return SEEDS.map(({ merchantKey: _merchantKey, ...seed }) => ({
    ...seed,
    merchant: merchantAddress,
  }));
}

export function findService(
  services: Service[],
  id: string,
): Service | undefined {
  return services.find((service) => service.id === id);
}

export const CATALOG_CATEGORIES = Array.from(
  new Set(SEEDS.map((service) => service.category)),
);
