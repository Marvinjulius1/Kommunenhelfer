/**
 * POST – Leistungsbeschreibungen aus XZuFi übernehmen (Rolle „admin“, wird protokolliert):
 *   { aktion: "vorschau", xml } · { aktion: "uebernehmen", xml, auswahl, amtId } · { aktion: "entfernen", id }
 * Übernommene Leistungen sind Info-Seiten; Leistungen der Konfigurationsdatei bleiben unberührt.
 */
import { z } from "zod";
import { pruefeGemeinde } from "@/config/schema";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { anwenden, ladeAnpassungen, speichereAnpassungen, type AnpassungRecord } from "@/lib/admin/anpassungen";
import { protokolliere } from "@/lib/backoffice/audit";
import { hatRolle } from "@/lib/backoffice/auth";
import { boZugang } from "@/lib/backoffice/zugang";
import { tx } from "@/lib/i18n";
import { XmlFehler } from "@/lib/import/xml";
import { alsLeistung, leseXzufi } from "@/lib/import/xzufi";
import { basisTenant } from "@/lib/tenant";

export const runtime = "nodejs";

const Schema = z.discriminatedUnion("aktion", [
  z.object({ aktion: z.literal("vorschau"), xml: z.string().max(5_000_000) }),
  z.object({ aktion: z.literal("uebernehmen"), xml: z.string().max(5_000_000), auswahl: z.array(z.string().max(200)).min(1).max(500), amtId: z.string().max(60) }),
  z.object({ aktion: z.literal("entfernen"), id: z.string().max(60) }),
]);

export async function POST(req: Request) {
  const c = await boZugang(req);
  if ("antwort" in c) return c.antwort;
  if (!hatRolle(c.b, "admin")) return fehler("keine_berechtigung", 403);
  const p = Schema.safeParse(await leseJson(req, 5_500_000).catch(() => null));
  if (!p.success) return fehler("ungueltige_anfrage");
  const d = p.data;
  const basis = await basisTenant((await tenantAus(req)).slug);
  const alt = await ladeAnpassungen(basis.slug);
  const record: AnpassungRecord = alt ?? { id: basis.slug, tenant: basis.slug, leistungen: {}, erstelltAm: new Date().toISOString(), loeschenAm: "9999-12-31T00:00:00.000Z" };
  const eigene = record.eigeneLeistungen ?? [];

  if (d.aktion === "entfernen") {
    if (!eigene.some((l) => l.id === d.id)) return fehler("nicht_gefunden", 404);
    await speichereAnpassungen({ ...record, eigeneLeistungen: eigene.filter((l) => l.id !== d.id), geaendertVon: c.b.name });
    await protokolliere({ tenant: basis.slug, benutzer: c.b.name, aktion: "leistungen_importiert", details: `entfernt: ${d.id}` });
    return Response.json({ ok: true });
  }

  let liste;
  try {
    liste = leseXzufi(d.xml);
  } catch (e) {
    return fehler("xml_ungueltig", 422, { probleme: [e instanceof XmlFehler ? e.message : "Die Datei konnte nicht gelesen werden."] });
  }
  const vorhanden = [...basis.leistungen, ...eigene];
  const schonDa = (x: (typeof liste)[number]) =>
    vorhanden.find((l) => (x.leistungsschluessel && l.leistungsschluessel === x.leistungsschluessel) || tx(l.titel, "de").toLowerCase() === x.titel.toLowerCase());

  if (d.aktion === "vorschau") {
    return Response.json({
      leistungen: liste.map((x) => ({ ...x, vorhanden: schonDa(x) ? tx(schonDa(x)!.titel, "de") : undefined })),
    });
  }

  if (!basis.aemter.some((a) => a.id === d.amtId)) return fehler("ungueltige_anfrage");
  const belegt = new Set(vorhanden.map((l) => l.id));
  const neu = liste.filter((x) => d.auswahl.includes(x.quelleId) && !schonDa(x)).map((x) => alsLeistung(x, d.amtId, belegt));
  if (!neu.length) return fehler("nichts_neu", 409);
  const ergebnis: AnpassungRecord = { ...record, eigeneLeistungen: [...eigene, ...neu], geaendertVon: c.b.name };
  const probleme = pruefeGemeinde(anwenden(basis, ergebnis));
  if (probleme.length) return fehler("validierung", 422, { probleme: probleme.slice(0, 8) });
  await speichereAnpassungen(ergebnis);
  await protokolliere({ tenant: basis.slug, benutzer: c.b.name, aktion: "leistungen_importiert", details: `${neu.length} übernommen: ${neu.map((l) => l.id).join(", ").slice(0, 300)}` });
  return Response.json({ ok: true, ids: neu.map((l) => l.id) });
}
