/** GET ?t=…: eigene Position · DELETE ?t=…: Nummer zurückgeben */
import { fehler, tenantAus } from "@/lib/api";
import { aktuellesKonto } from "@/lib/konto/service";
import { ladeNummer, position, storniere } from "@/lib/wartezeit/service";

export const runtime = "nodejs";

async function laden(req: Request, id: string) {
  const tenant = await tenantAus(req);
  const konto = await aktuellesKonto(tenant);
  const w = await ladeNummer(tenant, id, new URL(req.url).searchParams.get("t"), konto?.id);
  return w ? { tenant, w } : undefined;
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const x = await laden(req, (await params).id);
  if (!x) return fehler("nicht_gefunden", 404);
  return Response.json(await position(x.tenant, x.w), { headers: { "Cache-Control": "no-store" } });
}

export async function DELETE(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const x = await laden(req, (await params).id);
  if (!x) return fehler("nicht_gefunden", 404);
  await storniere(x.w);
  return Response.json({ ok: true });
}
