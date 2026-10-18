/**
 * POST /api/assistent
 * Nimmt den Gesprächsverlauf entgegen und liefert eine strukturierte Antwort.
 * Der Verlauf wird NICHT gespeichert (Datensparsamkeit).
 */
import { z } from "zod";
import { beantworte } from "@/lib/assistant/engine";
import { fehler, langAus, leseJson, tenantAus } from "@/lib/api";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import { zaehle } from "@/lib/statistik";
import { kreisLeistung, kreisLink, kreisVon, punkteFuer } from "@/lib/landkreis";
import { tx } from "@/lib/i18n";

export const runtime = "nodejs";

const Schema = z.object({
  nachrichten: z
    .array(z.object({ rolle: z.enum(["buerger", "assistent"]), text: z.string().max(2000) }))
    .max(30),
  leistungId: z.string().max(80).regex(/^[a-z0-9-]+$/).optional(),
  kontextLeistungId: z.string().max(80).regex(/^[a-z0-9-]+$/).optional(),
  lang: z.string().max(5).optional(),
  entwurf: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/).optional(),
  dokumente: z.array(z.string().max(64)).max(30).optional(),
});

export async function POST(req: Request) {
  const rl = rateLimit(`assistent:${clientKey(req)}`, 30, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await leseJson(req));
  } catch {
    return fehler("ungueltige_anfrage");
  }
  if (!body.leistungId && !body.dokumente?.length && !body.nachrichten.some((m) => m.rolle === "buerger" && m.text.trim())) {
    return fehler("leere_anfrage");
  }

  const tenant = await tenantAus(req);
  let antwort = await beantworte(tenant, { ...body, lang: langAus(req, tenant, body.lang) });
  // Landkreis zuständig (Kfz, Führerschein, Bauantrag …)? Greift, wenn die Gemeinde nichts weiß
  // oder die Kreisleistung deutlich besser passt („Auto anmelden“ ist kein Wohnsitz).
  if (tenant.landkreis && !body.dokumente?.length) {
    const frage = [...body.nachrichten].reverse().find((m) => m.rolle === "buerger")?.text ?? "";
    const kreis = await kreisVon(tenant);
    const treffer = kreis ? kreisLeistung(kreis, frage) : undefined;
    const lokal = antwort.leistungId ? tenant.leistungen.find((x) => x.id === antwort.leistungId) : undefined;
    const besser = treffer && (!antwort.sicher || (treffer.punkte >= 3 && treffer.punkte > (lokal ? punkteFuer(lokal, frage) : 0)));
    if (treffer && besser) {
      const l = treffer.l;
      antwort = {
        text: `Dafür ist der **${tenant.landkreis.name}** zuständig: **${tx(l.titel, "de")}**.\n\n${tx(l.kurz, "de")}`,
        aktionen: [{ typ: "link", url: kreisLink(tenant, l), label: l.online && l.formular ? "Beim Landkreis beantragen" : l.termin ? "Termin beim Landkreis" : "Zum Kreisportal" }],
        quellen: [`${tenant.landkreis.name}: ${tx(l.titel, "de")}`],
        sicher: true,
      };
    }
  }
  await zaehle(tenant.slug, "assistent_anfragen", 1, antwort.leistungId);
  await zaehle(tenant.slug, antwort.sicher ? "assistent_beantwortet" : "assistent_weissnicht");
  return Response.json(antwort, { headers: { "Cache-Control": "no-store" } });
}
