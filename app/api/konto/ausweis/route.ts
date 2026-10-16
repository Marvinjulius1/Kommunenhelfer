/**
 * POST /api/konto/ausweis – Anmeldung mit dem Online-Ausweis.
 *
 * Testmodus (DEMO_MODUS bzw. Entwicklung): simuliert die Rückmeldung des
 * eID-Servers mit einer Testidentität. Für den Echtbetrieb wird hier die
 * BundID (SAML 2.0) angebunden – siehe lib/integrations/index.ts und README.
 */
import { cookies } from "next/headers";
import { randomBytes } from "node:crypto";
import { fehler, tenantAus } from "@/lib/api";
import { gleicheHerkunft } from "@/lib/backoffice/auth";
import { demoModus } from "@/lib/demo";
import { aktiv } from "@/lib/funktionen";
import { aktualisiereProfil, aktuellesKonto, anmelden, erstelleKonto, index, speichereKonto } from "@/lib/konto/service";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import { store } from "@/lib/storage/store";
import type { KontoRecord } from "@/lib/records";
import { zaehle } from "@/lib/statistik";

export const runtime = "nodejs";

export async function POST(req: Request) {
  const tenant = await tenantAus(req);
  if (!aktiv(tenant, "konto") || !aktiv(tenant, "onlineAusweis")) return fehler("nicht_verfuegbar", 404);
  if (!gleicheHerkunft(req)) return fehler("herkunft", 403);
  if (!demoModus()) return fehler("bundid_nicht_konfiguriert", 501);
  const rl = rateLimit(`konto-eid:${clientKey(req)}`, 10, 15 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  // Testidentität. Das Pseudonym bleibt pro Gerät gleich (wie das echte BundID-Pseudonym pro Person).
  const c = await cookies();
  let pseudonym = c.get("eid_test")?.value;
  if (!pseudonym || !/^[\w-]{20,}$/.test(pseudonym)) {
    pseudonym = randomBytes(16).toString("base64url");
    c.set("eid_test", pseudonym, { httpOnly: true, sameSite: "lax", secure: process.env.NODE_ENV === "production", path: "/", maxAge: 365 * 86400 });
  }
  const identitaet = {
    vorname: "Erika",
    nachname: "Mustermann",
    geburtsdatum: "1964-08-12",
    strasse: "Lindenallee 4",
    plz: tenant.kontakt.plz,
    ort: tenant.kontakt.ort,
    ausweisGueltigBis: new Date(Date.now() + 70 * 86400_000).toISOString().slice(0, 10),
  };

  const eidIndex = index("eid", pseudonym, tenant.slug);
  let k: KontoRecord | undefined = (await store().list<KontoRecord>("konten", (x) => x.tenant === tenant.slug && x.eidIndex === eidIndex))[0];
  const angemeldet = await aktuellesKonto(tenant);

  if (!k && angemeldet) {
    // Bestehendes Konto auf Vertrauensniveau "hoch" heben
    k = await aktualisiereProfil(angemeldet, identitaet, tenant);
    k = { ...k, eidIndex, vertrauensniveau: "hoch" };
    await speichereKonto(k);
  } else if (!k) {
    k = await erstelleKonto(tenant, {
      profil: { ...identitaet, email: "" },
      eid: pseudonym,
      vertrauensniveau: "hoch",
      emailBestaetigt: false,
    });
    await zaehle(tenant.slug, "konten_neu");
  } else {
    k = await aktualisiereProfil(k, identitaet, tenant);
  }
  await anmelden(k);
  return Response.json({ ok: true, emailFehlt: !k.emailIndex });
}
