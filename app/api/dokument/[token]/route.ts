/**
 * GET /api/dokument/<signiertes Token>
 *
 * Dokumente sind nur über kurzlebige, signierte Links abrufbar:
 *  - Backoffice: Link gilt 5 Minuten UND nur mit gültiger Sitzung des Benutzers,
 *    dem der Link ausgestellt wurde (und nur für "seine" Ämter).
 *  - Webhook/Fachverfahren ("extern"): Link gilt 15 Minuten.
 * Jeder Abruf wird im Audit-Log protokolliert.
 */
import { decryptJson } from "@/lib/crypto";
import { protokolliere } from "@/lib/backoffice/audit";
import { aktuellerBenutzer, darfAmt } from "@/lib/backoffice/auth";
import { pruefeSignatur } from "@/lib/signatur";
import { blobs } from "@/lib/storage/blobs";
import { basisTenant } from "@/lib/tenant";
import { ladeVorgang } from "@/lib/vorgaenge/service";

export const runtime = "nodejs";

const nichtGefunden = () => new Response("Nicht gefunden oder Link abgelaufen.", { status: 404, headers: { "Cache-Control": "no-store" } });

export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const t = pruefeSignatur<{ d: string; v: string; t: string; u: string }>((await params).token, "dokument");
  if (!t) return nichtGefunden();
  const tenant = await basisTenant(t.t);
  if (tenant.slug !== t.t) return nichtGefunden();
  const v = await ladeVorgang(tenant, t.v);
  const dok = v?.dokumente.find((d) => d.id === t.d);
  if (!v || !dok) return nichtGefunden();

  if (t.u !== "extern") {
    const b = await aktuellerBenutzer(tenant);
    if (!b || b.name !== t.u || !darfAmt(b, v.amtId)) return nichtGefunden();
  }
  const daten = await blobs.get(dok.id);
  if (!daten) return nichtGefunden();

  await protokolliere({
    tenant: tenant.slug,
    benutzer: t.u,
    aktion: t.u === "extern" ? "dokument_extern_abgerufen" : "dokument_geoeffnet",
    vorgangId: v.id,
    dokumentId: dok.id,
  });

  const name = decryptJson<string>(dok.name);
  const inline = dok.typ !== "image/heic";
  return new Response(new Uint8Array(daten), {
    headers: {
      "Content-Type": dok.typ,
      "Content-Length": String(daten.length),
      "Content-Disposition": `${inline ? "inline" : "attachment"}; filename*=UTF-8''${encodeURIComponent(name)}`,
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
      "Referrer-Policy": "no-referrer",
      "Content-Security-Policy": "default-src 'none'; img-src 'self' data:; style-src 'unsafe-inline'; frame-ancestors 'self'",
      "X-Robots-Tag": "noindex",
    },
  });
}
