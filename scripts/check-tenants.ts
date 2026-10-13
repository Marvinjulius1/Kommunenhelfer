/**
 * Prüft alle Gemeinde-Konfigurationen (Schema, Verweise, Kontraste).
 *   npm run tenant:check
 * Dieselbe Prüfung läuft automatisch bei Build und Serverstart (tenants/index.ts).
 */
import("../tenants")
  .then(({ tenants }) => {
    for (const t of Object.values(tenants)) console.log(`✓ ${t.art} ${t.name} (${t.slug})`);
    console.log("\nAlle Konfigurationen sind gültig.");
  })
  .catch((e: Error) => {
    console.error(`✗ ${e.message}`);
    process.exit(1);
  });
