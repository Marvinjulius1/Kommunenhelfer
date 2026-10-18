/**
 * POST – Krisenmodus (Rolle „redaktion“, wird protokolliert):
 *   { aktion: "setzen", lage, push } · { aktion: "melden", text, push } · { aktion: "beenden" }
 */
import { z } from "zod";
import { fehler, leseJson } from "@/lib/api";
import { protokolliere } from "@/lib/backoffice/audit";
import { hatRolle } from "@/lib/backoffice/auth";
import { boZugang } from "@/lib/backoffice/zugang";
import { aktiv } from "@/lib/funktionen";
import { beendeLage, meldeLage, setzeLage } from "@/lib/krise/service";
import { KRISEN_ARTEN } from "@/lib/krise/vorlagen";
import { benachrichtige } from "@/lib/push/service";

export const runtime = "nodejs";

const kurz = (n: number) => z.string().trim().max(n);
const Lage = z.object({
  art: z.enum(KRISEN_ARTEN as [string, ...string[]]),
  stufe: z.enum(["warnung", "gefahr"]),
  titel: kurz(100).min(3),
  text: kurz(3000).min(3),
  tipps: z.array(kurz(300).min(1)).max(15),
  hotline: kurz(40).optional(),
  notrufe: z.array(z.object({ label: kurz(80).min(1), nummer: z.string().trim().regex(/^[+\d][\d\s/-]{1,24}$/) })).max(10),
  anlaufstellen: z.array(z.object({ name: kurz(120).min(1), adresse: kurz(160).optional(), info: kurz(300).optional() })).max(30),
});
const Schema = z.discriminatedUnion("aktion", [
  z.object({ aktion: z.literal("setzen"), lage: Lage, push: z.boolean().default(false) }),
  z.object({ aktion: z.literal("melden"), text: kurz(1000).min(3), push: z.boolean().default(false) }),
  z.object({ aktion: z.literal("beenden") }),
]);

export async function POST(req: Request) {
  const c = await boZugang(req);
  if ("antwort" in c) return c.antwort;
  if (!aktiv(c.tenant, "krisenmodus")) return fehler("nicht_im_paket", 404);
  if (!hatRolle(c.b, "redaktion")) return fehler("keine_berechtigung", 403);
  const p = Schema.safeParse(await leseJson(req, 64_000).catch(() => null));
  if (!p.success) return fehler("ungueltige_anfrage");
  const d = p.data;
  let gesendet = 0;
  if (d.aktion === "setzen") {
    const r = await setzeLage(c.tenant, { ...d.lage, art: d.lage.art as never, hotline: d.lage.hotline || undefined }, c.b.name);
    if (d.push) gesendet = await benachrichtige(c.tenant, { titel: r.titel, text: r.text.slice(0, 180), url: "/lage", thema: "meldungen" });
    await protokolliere({ tenant: c.tenant.slug, benutzer: c.b.name, aktion: "krisenmodus", details: `Lage gesetzt: ${r.titel}${gesendet ? ` · Push an ${gesendet}` : ""}` });
  } else if (d.aktion === "melden") {
    const r = await meldeLage(c.tenant, d.text, c.b.name);
    if (!r) return fehler("keine_lage", 409);
    if (d.push) gesendet = await benachrichtige(c.tenant, { titel: `Lage: ${r.titel}`, text: d.text.slice(0, 180), url: "/lage", thema: "meldungen" });
    await protokolliere({ tenant: c.tenant.slug, benutzer: c.b.name, aktion: "krisenmodus", details: `Lagemeldung${gesendet ? ` · Push an ${gesendet}` : ""}` });
  } else {
    if (!(await beendeLage(c.tenant, c.b.name))) return fehler("keine_lage", 409);
    await protokolliere({ tenant: c.tenant.slug, benutzer: c.b.name, aktion: "krisenmodus", details: "Krisenmodus beendet" });
  }
  return Response.json({ ok: true, gesendet });
}
