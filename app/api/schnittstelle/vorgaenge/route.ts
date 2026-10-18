/**
 * GET /api/schnittstelle/vorgaenge?seit=<ISO>&status=<status>&limit=<n>
 * Abholschnittstelle für Fachverfahren (Authorization: Bearer <Schlüssel>).
 * Liefert Vorgänge der freigegebenen Ämter mit Formulardaten und kurzlebigen
 * Dokument-Links (15 Minuten). Jeder Abruf wird protokolliert.
 */
import { basisUrl, fehler, tenantAus } from "@/lib/api";
import { protokolliere } from "@/lib/backoffice/audit";
import { decryptJson } from "@/lib/crypto";
import type { VorgangDaten, VorgangRecord } from "@/lib/records";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import { darfAmt, pruefeSchluessel } from "@/lib/schnittstelle";
import { store } from "@/lib/storage/store";
import { nachrichten, VORGANG_STATUS_LISTE } from "@/lib/vorgaenge/service";
import { dokumentLink, EXTERN_LINK_SEKUNDEN } from "@/lib/vorgaenge/weiterleitung";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const rl = rateLimit(`schnittstelle:${clientKey(req)}`, 120, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const tenant = await tenantAus(req);
  const s = pruefeSchluessel(req, tenant);
  if (!s) return fehler("nicht_berechtigt", 401);
  const u = new URL(req.url);
  const seit = u.searchParams.get("seit") ?? "1970-01-01T00:00:00Z";
  const status = u.searchParams.get("status");
  const limit = Math.min(500, Math.max(1, Number(u.searchParams.get("limit")) || 100));
  if (Number.isNaN(Date.parse(seit)) || (status && !VORGANG_STATUS_LISTE.includes(status))) return fehler("ungueltige_anfrage");
  const basis = basisUrl(req, tenant);
  const liste = (await store().list<VorgangRecord>("vorgaenge", (v) => v.tenant === tenant.slug && darfAmt(s, v.amtId) && v.erstelltAm > seit && (!status || v.status === status)))
    .sort((a, b) => a.erstelltAm.localeCompare(b.erstelltAm))
    .slice(0, limit);
  const vorgaenge = liste.map((v) => {
    const d = decryptJson<VorgangDaten>(v.daten);
    return {
      id: v.id,
      quelle: v.quelle,
      leistung: v.leistungId ?? null,
      leistungsschluessel: v.leistungsschluessel ?? null,
      amt: v.amtId,
      status: v.status,
      eingegangenAm: v.erstelltAm,
      kontakt: d.kontakt,
      fuer: d.fuer ?? null,
      werte: d.werte ?? null,
      nachricht: d.nachricht ?? null,
      nachrichten: nachrichten(v).map(({ von, text, am }) => ({ von, text, am })),
      dokumente: v.dokumente.map((dok) => ({ id: dok.id, art: dok.art, typ: dok.typ, groesse: dok.groesse, name: decryptJson<string>(dok.name), url: dokumentLink(basis, v, dok.id, "extern", EXTERN_LINK_SEKUNDEN) })),
    };
  });
  await protokolliere({ tenant: tenant.slug, benutzer: `schnittstelle:${s.name}`, aktion: "dokument_extern_abgerufen", details: `Abruf: ${vorgaenge.length} Vorgänge` });
  return Response.json({ vorgaenge, weiter: vorgaenge.at(-1)?.eingegangenAm ?? null }, { headers: { "Cache-Control": "no-store" } });
}
