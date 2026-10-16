/**
 * GET  /api/maengel                                  – öffentliche Liste (ohne Beschreibung, Foto, Kontakt)
 * GET  /api/maengel?kategorie=licht&lat=..&lng=..    – Anzahl offener Meldungen in der Nähe
 * POST /api/maengel (multipart)                       – Mangel melden
 */
import { z } from "zod";
import { basisUrl, fehler, langAus, tenantAus } from "@/lib/api";
import { gleicheHerkunft } from "@/lib/backoffice/auth";
import { aktiv } from "@/lib/funktionen";
import { aktuellesKonto, profilVon } from "@/lib/konto/service";
import { maengelInDerNaehe, meldeMangel, oeffentlicheMaengel } from "@/lib/maengel/service";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import { bereinigeGelegentlich } from "@/lib/vorgaenge/service";

export const runtime = "nodejs";

const Koordinate = z.coerce.number().refine(Number.isFinite);

export async function GET(req: Request) {
  const tenant = await tenantAus(req);
  if (!aktiv(tenant, "maengelmelder") || !tenant.maengel) return fehler("nicht_verfuegbar", 404);
  const u = new URL(req.url).searchParams;
  if (u.has("lat")) {
    const p = z.object({ kategorie: z.string().max(40), lat: Koordinate.pipe(z.number().min(-90).max(90)), lng: Koordinate.pipe(z.number().min(-180).max(180)) }).safeParse(Object.fromEntries(u));
    if (!p.success) return fehler("ungueltige_anfrage");
    return Response.json({ anzahl: await maengelInDerNaehe(tenant, p.data.kategorie, p.data) });
  }
  return Response.json({ maengel: await oeffentlicheMaengel(tenant, langAus(req, tenant)) }, { headers: { "Cache-Control": "no-store" } });
}

const Meldung = z.object({
  kategorie: z.string().min(1).max(40),
  beschreibung: z.string().trim().min(5).max(1000),
  ort: z.string().trim().min(3).max(200),
  lat: Koordinate.pipe(z.number().min(-90).max(90)).optional(),
  lng: Koordinate.pipe(z.number().min(-180).max(180)).optional(),
  name: z.string().trim().max(120).optional(),
  email: z.union([z.literal(""), z.string().trim().email().max(200)]).optional(),
  einwilligung: z.literal("1"),
});

export async function POST(req: Request) {
  const tenant = await tenantAus(req);
  if (!aktiv(tenant, "maengelmelder") || !tenant.maengel) return fehler("nicht_verfuegbar", 404);
  if (!gleicheHerkunft(req)) return fehler("herkunft", 403);
  const rl = rateLimit(`mangel:${clientKey(req)}`, 10, 60 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  if (Number(req.headers.get("content-length") ?? 0) > (tenant.uploads.maxDateiMB + 1) * 1024 * 1024) return fehler("zu_gross", 413);

  let form: FormData;
  try {
    form = await req.formData();
  } catch {
    return fehler("ungueltige_anfrage");
  }
  const felder = Object.fromEntries([...form.entries()].filter(([, v]) => typeof v === "string" && v !== "")) as Record<string, string>;
  const b = Meldung.safeParse(felder);
  if (!b.success) return fehler("ungueltige_anfrage");
  const datei = form.get("foto");
  const foto = datei instanceof File && datei.size ? Buffer.from(await datei.arrayBuffer()) : undefined;

  const konto = await aktuellesKonto(tenant);
  const p = konto ? profilVon(konto) : undefined;
  const r = await meldeMangel(
    tenant,
    {
      ...b.data,
      lat: b.data.lat !== undefined && b.data.lng !== undefined ? b.data.lat : undefined,
      lng: b.data.lat !== undefined && b.data.lng !== undefined ? b.data.lng : undefined,
      name: p ? `${p.vorname} ${p.nachname}`.trim() : b.data.name,
      email: p?.email || b.data.email || undefined,
      foto,
    },
    { kontoId: konto?.id, basisUrl: basisUrl(req, tenant) },
  );
  bereinigeGelegentlich();
  if (!r.ok) return fehler(r.fehler, r.fehler === "scanner" ? 503 : 422);
  return Response.json(r, { status: 201 });
}
