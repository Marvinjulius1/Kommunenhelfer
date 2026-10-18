/**
 * PUT { leistungen, texte } – Anpassungen der Gemeinde speichern (Rolle „admin“).
 * Gespeichert wird nur die Abweichung zur Konfigurationsdatei. Das Ergebnis wird
 * vor dem Speichern mit denselben Regeln geprüft wie die Konfiguration selbst.
 */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { anwenden, ladeAnpassungen, speichereAnpassungen, type AnpassungRecord } from "@/lib/admin/anpassungen";
import { protokolliere } from "@/lib/backoffice/audit";
import { hatRolle } from "@/lib/backoffice/auth";
import { boZugang } from "@/lib/backoffice/zugang";
import { pruefeGemeinde } from "@/config/schema";
import type { LText } from "@/config/types";
import { basisTenant } from "@/lib/tenant";

export const runtime = "nodejs";

const Gebuehr = z.object({ bezeichnung: z.string().trim().min(1).max(120), betrag: z.union([z.number().min(0).max(100000), z.null(), z.string().trim().min(1).max(60)]), hinweis: z.string().trim().max(160).optional() });

const Schema = z.object({
  leistungen: z.record(
    z.string().max(80),
    z.object({
      aktiv: z.boolean().optional(),
      kurz: z.string().trim().min(10).max(400).optional(),
      beschreibung: z.string().trim().max(2000).optional(),
      gebuehren: z.array(Gebuehr).max(10).optional(),
    }),
  ),
  texte: z
    .object({
      untertitel: z.string().trim().min(2).max(60).optional(),
      platzhalter: z.string().trim().min(2).max(80).optional(),
      begruessung: z.string().trim().min(2).max(400).optional(),
    })
    .optional(),
});

export async function PUT(req: Request) {
  const c = await boZugang(req);
  if ("antwort" in c) return c.antwort;
  if (!hatRolle(c.b, "admin")) return fehler("keine_berechtigung", 403);
  const d = Schema.safeParse(await leseJson(req, 128_000).catch(() => null));
  if (!d.success) return fehler("ungueltige_anfrage");
  const basis = await basisTenant((await tenantAus(req)).slug);
  if (Object.keys(d.data.leistungen).some((id) => !basis.leistungen.some((l) => l.id === id))) return fehler("leistung_unbekannt");
  // Geändert wird die deutsche Fassung; vorhandene Übersetzungen bleiben erhalten.
  const mitSprache = (alt: LText | undefined, neu: string | undefined): LText | undefined => (neu === undefined ? undefined : typeof alt === "object" ? { ...alt, de: neu } : neu);
  const leistungen: AnpassungRecord["leistungen"] = {};
  for (const [id, a] of Object.entries(d.data.leistungen)) {
    const l = basis.leistungen.find((x) => x.id === id)!;
    leistungen[id] = Object.fromEntries(
      Object.entries({
        aktiv: a.aktiv,
        kurz: mitSprache(l.kurz, a.kurz),
        beschreibung: mitSprache(l.beschreibung, a.beschreibung),
        gebuehren: a.gebuehren,
      }).filter(([, v]) => v !== undefined),
    );
  }
  const record: AnpassungRecord = {
    id: basis.slug,
    tenant: basis.slug,
    leistungen,
    texte: d.data.texte,
    // Formulare aus dem Baukasten bleiben unberührt
    eigeneLeistungen: (await ladeAnpassungen(basis.slug))?.eigeneLeistungen,
    geaendertVon: c.b.name,
    erstelltAm: new Date().toISOString(),
    loeschenAm: "9999-12-31T00:00:00.000Z",
  };
  const probleme = pruefeGemeinde(anwenden(basis, record));
  if (probleme.length) return fehler("validierung", 422, { probleme });
  await speichereAnpassungen(record);
  await protokolliere({ tenant: basis.slug, benutzer: c.b.name, aktion: "anpassung", details: `${Object.keys(d.data.leistungen).length} Leistungen angepasst` });
  return Response.json({ ok: true });
}
