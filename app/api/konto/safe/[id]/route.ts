/**
 * GET    /api/konto/safe/[id]                 – Datei ansehen
 * POST   /api/konto/safe/[id]  { entwurf }    – in einen Upload-Entwurf übernehmen (Wiederverwendung)
 * DELETE /api/konto/safe/[id]                 – löschen
 */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { decryptJson } from "@/lib/crypto";
import { mitKonto } from "@/lib/konto/api";
import { artLabel } from "@/lib/uploads/pruefung";
import { ladeSafe, loescheAusSafe, safeInEntwurf } from "@/lib/safe/service";
import { blobs } from "@/lib/storage/blobs";

export const runtime = "nodejs";

async function laden(req: Request, id: string) {
  const tenant = await tenantAus(req);
  const ctx = await mitKonto(req, tenant);
  if ("antwort" in ctx) return ctx;
  const s = await ladeSafe(ctx.konto, id);
  return s ? { tenant, s } : { antwort: fehler("nicht_gefunden", 404) };
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await laden(req, (await params).id);
  if ("antwort" in c) return c.antwort;
  const daten = await blobs.get(c.s.id);
  if (!daten) return fehler("nicht_gefunden", 404);
  return new Response(new Uint8Array(daten), {
    headers: {
      "Content-Type": c.s.typ,
      "Content-Disposition": `${c.s.typ === "image/heic" ? "attachment" : "inline"}; filename*=UTF-8''${encodeURIComponent(decryptJson<string>(c.s.name))}`,
      "Cache-Control": "no-store, private",
      "X-Content-Type-Options": "nosniff",
    },
  });
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await laden(req, (await params).id);
  if ("antwort" in c) return c.antwort;
  const b = z.object({ entwurf: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/) }).safeParse(await leseJson(req).catch(() => null));
  if (!b.success) return fehler("ungueltige_anfrage");
  const u = await safeInEntwurf(c.tenant, c.s, b.data.entwurf);
  if (!u) return fehler("nicht_gefunden", 404);
  return Response.json({ id: u.id, name: decryptJson<string>(u.name), typ: u.typ, groesse: u.groesse, seiten: u.seiten, art: u.art, artLabel: artLabel(c.tenant, u.art, "de"), artSicher: true });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const c = await laden(req, (await params).id);
  if ("antwort" in c) return c.antwort;
  await loescheAusSafe(c.s);
  return Response.json({ ok: true });
}
