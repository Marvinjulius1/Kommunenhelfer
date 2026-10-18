/**
 * GET /api/postfach/[id]          – Eintrag lesen (markiert als gelesen = Zugang)
 * GET /api/postfach/[id]?datei=1  – angehängtes Dokument (Bescheid) herunterladen
 * Zugriff: angemeldeter Kontoinhaber ODER Vorgangsnummer + Zugangscode (?v=…&c=…).
 */
import { tenantAus } from "@/lib/api";
import { decryptJson } from "@/lib/crypto";
import { kontoFuer } from "@/lib/konto/vertretung";
import { alsGelesen, postSicht } from "@/lib/postfach/service";
import type { PostfachRecord } from "@/lib/records";
import { blobs } from "@/lib/storage/blobs";
import { store } from "@/lib/storage/store";
import { ladeMitCode } from "@/lib/vorgaenge/service";

export const runtime = "nodejs";

const nein = () => Response.json({ fehler: "nicht_gefunden" }, { status: 404 });

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const tenant = await tenantAus(req);
  const url = new URL(req.url);
  const r = await store().get<PostfachRecord>("postfach", (await params).id);
  if (!r || r.tenant !== tenant.slug) return nein();

  const konto = await kontoFuer(tenant, "post");
  let berechtigt = !!konto && r.kontoId === konto.id;
  if (!berechtigt && r.vorgangId && url.searchParams.get("v") === r.vorgangId) {
    berechtigt = !!(await ladeMitCode(tenant, r.vorgangId, url.searchParams.get("c") ?? ""));
  }
  if (!berechtigt) return nein();
  await alsGelesen(r);

  if (url.searchParams.get("datei") && r.dokument) {
    const daten = await blobs.get(r.dokument.id);
    if (!daten) return nein();
    return new Response(new Uint8Array(daten), {
      headers: {
        "Content-Type": r.dokument.typ,
        "Content-Disposition": `${r.dokument.typ === "image/heic" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(decryptJson<string>(r.dokument.name))}`,
        "Cache-Control": "no-store, private",
        "X-Content-Type-Options": "nosniff",
      },
    });
  }
  return Response.json(postSicht(r), { headers: { "Cache-Control": "no-store" } });
}
