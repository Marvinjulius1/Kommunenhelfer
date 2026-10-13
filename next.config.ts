import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  // Metadaten (Titel, Beschreibung) immer direkt im <head> ausliefern – wichtig für
  // Suchmaschinen, Vorschauen und Screenreader, nicht erst nachgestreamt.
  htmlLimitedBots: /.*/,
  // Wissensbasis-Dateien werden zur Laufzeit gelesen und müssen mit ausgeliefert werden.
  outputFileTracingIncludes: {
    "/api/assistent": ["./tenants/**/wissen/**/*"],
  },
  // Für Container-Deployments (z. B. in einem EU-Rechenzentrum).
  output: "standalone",
};

export default nextConfig;
