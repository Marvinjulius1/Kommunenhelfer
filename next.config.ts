import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Wissensbasis-Dateien werden zur Laufzeit gelesen und müssen mit ausgeliefert werden.
  outputFileTracingIncludes: {
    "/api/assistent": ["./tenants/**/wissen/**/*"],
  },
  // Für Container-Deployments (z. B. in einem EU-Rechenzentrum).
  output: "standalone",
};

export default nextConfig;
