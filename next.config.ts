import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: [
    "@stellar/stellar-sdk",
    "@noirx402/agent-sdk",
    "@carts1024/velo-sdk",
  ],
  experimental: {
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
