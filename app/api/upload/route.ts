/**
 * POST   /api/upload?entwurf=…   Datei hochladen (Rohdaten im Body, Name im Header x-dateiname)
 * DELETE /api/upload             { entwurf, id } – Datei vor dem Absenden entfernen
 *
 * Voraussetzung: Einwilligung (Header x-einwilligung: 1).
 */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { decryptJson } from "@/lib/crypto";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import { artLabel } from "@/lib/uploads/pruefung";
import { entferneUpload, nimmUploadAn } from "@/lib/uploads/service";
import { bereinigeGelegentlich } from "@/lib/vorgaenge/service";
import { zaehle } from "@/lib/statistik";

export const runtime = "nodejs";

const ENTWURF = /^[A-Za-z0-9_-]{16,64}$/;

/** Liest den Body mit Obergrenze – größere Uploads werden abgebrochen, ohne sie ganz zu laden. */
async function leseBody(req: Request, max: number): Promise<Buffer | "zu_gross"> {
  const laenge = Number(req.headers.get("content-length") ?? 0);
  if (laenge > max) return "zu_gross";
  const reader = req.body?.getReader();
  if (!reader) return Buffer.alloc(0);
  const teile: Uint8Array[] = [];
  let gesamt = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    gesamt += value.length;
    if (gesamt > max) {
      await reader.cancel();
      return "zu_gross";
    }
    teile.push(value);
  }
  return Buffer.concat(teile);
}

export async function POST(req: Request) {
  const rl = rateLimit(`upload:${clientKey(req)}`, 40, 10 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const tenant = await tenantAus(req);
  const entwurf = new URL(req.url).searchParams.get("entwurf") ?? "";
  if (!ENTWURF.test(entwurf)) return fehler("ungueltige_anfrage");
  if (req.headers.get("x-einwilligung") !== "1") return fehler("einwilligung_fehlt", 403);

  let dateiname = "Dokument";
  try {
    dateiname = decodeURIComponent(req.headers.get("x-dateiname") ?? "Dokument").slice(0, 200);
  } catch {}

  const daten = await leseBody(req, tenant.uploads.maxDateiMB * 1024 * 1024);
  if (daten === "zu_gross") return fehler("zu_gross", 413);

  bereinigeGelegentlich();
  const r = await nimmUploadAn(tenant, { entwurf, dateiname, daten });
  if (!r.ok) return fehler(r.fehler, r.fehler === "scanner" ? 503 : 422);

  const u = r.record;
  if (!r.duplikat) await zaehle(tenant.slug, "uploads");
  return Response.json(
    {
      id: u.id,
      name: decryptJson<string>(u.name),
      typ: u.typ,
      groesse: u.groesse,
      seiten: u.seiten,
      art: u.art,
      artLabel: artLabel(tenant, u.art, "de"),
      artSicher: u.artSicher,
      duplikat: r.duplikat,
    },
    { status: r.duplikat ? 200 : 201, headers: { "Cache-Control": "no-store" } },
  );
}

const Loeschen = z.object({ entwurf: z.string().regex(ENTWURF), id: z.string().max(64) });

export async function DELETE(req: Request) {
  const rl = rateLimit(`upload-del:${clientKey(req)}`, 60, 10 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  let body: z.infer<typeof Loeschen>;
  try {
    body = Loeschen.parse(await leseJson(req));
  } catch {
    return fehler("ungueltige_anfrage");
  }
  const ok = await entferneUpload(await tenantAus(req), body.entwurf, body.id);
  return ok ? Response.json({ ok: true }) : fehler("nicht_gefunden", 404);
}
