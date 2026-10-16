/** PUT: Passwort ändern (angemeldet) · POST: neues Passwort per Token (vergessen) */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { gleicheHerkunft } from "@/lib/backoffice/auth";
import { mitKonto } from "@/lib/konto/api";
import { ladeKonto, pruefeKontoToken, speichereKonto } from "@/lib/konto/service";
import { hashPasswort, passwortGenuegend, pruefePasswort } from "@/lib/passwort";

export const runtime = "nodejs";

export async function PUT(req: Request) {
  const tenant = await tenantAus(req);
  const ctx = await mitKonto(req, tenant);
  if ("antwort" in ctx) return ctx.antwort;
  const b = z.object({ alt: z.string().max(200).optional(), neu: z.string().max(200) }).safeParse(await leseJson(req).catch(() => null));
  if (!b.success) return fehler("ungueltige_anfrage");
  if (ctx.konto.passwortHash && !pruefePasswort(b.data.alt ?? "", ctx.konto.passwortHash)) return fehler("altes_passwort", 403);
  if (!passwortGenuegend(b.data.neu)) return fehler("passwort_zu_kurz");
  await speichereKonto({ ...ctx.konto, passwortHash: hashPasswort(b.data.neu) });
  return Response.json({ ok: true });
}

export async function POST(req: Request) {
  const tenant = await tenantAus(req);
  if (!gleicheHerkunft(req)) return fehler("herkunft", 403);
  const b = z.object({ token: z.string().max(2000), neu: z.string().max(200) }).safeParse(await leseJson(req).catch(() => null));
  if (!b.success) return fehler("ungueltige_anfrage");
  const id = pruefeKontoToken("passwort", b.data.token);
  const k = id ? await ladeKonto(tenant, id) : undefined;
  if (!k) return fehler("link_ungueltig", 400);
  if (!passwortGenuegend(b.data.neu)) return fehler("passwort_zu_kurz");
  await speichereKonto({ ...k, passwortHash: hashPasswort(b.data.neu) });
  return Response.json({ ok: true });
}
