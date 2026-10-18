/**
 * POST /api/antrag
 * Reicht ein geführtes Formular ein. Die Daten werden serverseitig mit
 * denselben Regeln wie im Browser geprüft und verschlüsselt gespeichert.
 */
import { z } from "zod";
import { basisUrl, fehler, langAus, leseJson, tenantAus } from "@/lib/api";
import { offeneWahlen } from "@/lib/briefwahl/service";
import { BRIEFWAHL_ID } from "@/lib/briefwahl/wahlen";
import { validiereFormular } from "@/lib/flows/validate";
import { gatewayFuer } from "@/lib/integrations";
import { fuerText, handelndesKonto, protokolliereVertretung } from "@/lib/konto/vertretung";
import { profilVon } from "@/lib/konto/service";
import { aktiv } from "@/lib/funktionen";
import { zahlungsAnbieter } from "@/lib/zahlung/anbieter";
import { betragFuer, legeZahlungAn, zahlungZugang } from "@/lib/zahlung/service";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import { findeLeistung } from "@/lib/tenant";
import { tx } from "@/lib/i18n";
import type { DokumentMeta } from "@/lib/records";
import { dokumentarten } from "@/lib/uploads/dokumentarten";
import { fehlendeUnterlagen } from "@/lib/uploads/pruefung";
import { uebernehmeUploads, uploadsImEntwurf } from "@/lib/uploads/service";
import { uploadsZuDokumenten } from "@/lib/vorgaenge/service";

export const runtime = "nodejs";

const Schema = z.object({
  leistungId: z.string().max(80),
  werte: z.record(z.string(), z.string().max(2000)),
  einwilligungen: z.record(z.string(), z.literal(true)),
  lang: z.string().max(5).optional(),
  entwurf: z.string().regex(/^[A-Za-z0-9_-]{16,64}$/).optional(),
  dokumente: z.array(z.object({ id: z.string().max(64), art: z.string().max(60) })).max(30).optional(),
  /** Antrag für ein Kind aus „Mein Haushalt“ (Index) */
  fuerKind: z.number().int().min(0).max(11).optional(),
});

export async function POST(req: Request) {
  const rl = rateLimit(`antrag:${clientKey(req)}`, 5, 10 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);

  let body: z.infer<typeof Schema>;
  try {
    body = Schema.parse(await leseJson(req, 64_000));
  } catch {
    return fehler("ungueltige_anfrage");
  }

  const tenant = await tenantAus(req);
  const lang = langAus(req, tenant, body.lang);
  const leistung = findeLeistung(tenant, body.leistungId);
  if (!leistung?.online || !leistung.formular) return fehler("leistung_nicht_online", 404);

  // Alle Pflicht-Bestätigungen + Datenschutz müssen vorliegen.
  const noetig = ["datenschutz", ...(leistung.formular.bestaetigungen ?? []).map((b) => b.id)];
  if (!noetig.every((id) => body.einwilligungen[id])) return fehler("einwilligung_fehlt");

  const pruefung = validiereFormular(leistung.formular, body.werte, lang);
  if (!pruefung.ok) return fehler("validierung", 422, { felder: pruefung.fehler });

  const h = await handelndesKonto(tenant, "antraege");
  const konto = h?.konto;
  // Rechtlich nur mit sicherer Identifizierung (z. B. elektronische Wohnsitzanmeldung) – und nur persönlich
  if (leistung.erfordertOnlineAusweis && (konto?.vertrauensniveau !== "hoch" || h?.vollmacht)) return fehler("online_ausweis_noetig", 403);
  // Briefwahl: nur persönlich und nur bis zum Antragsschluss (§ 27 BWO)
  if (leistung.id === BRIEFWAHL_ID) {
    if (h?.vollmacht || body.fuerKind !== undefined) return fehler("persoenlich_noetig", 403);
    if (!(await offeneWahlen(tenant)).some((w) => w.id === pruefung.werte.wahl)) return fehler("antragsfrist_abgelaufen", 410);
  }
  let fuer = h ? fuerText(h) : undefined;
  if (body.fuerKind !== undefined && h) {
    const p = profilVon(h.selbst);
    const kind = p.kinder?.[body.fuerKind];
    if (!kind) return fehler("ungueltige_anfrage");
    fuer = `Für das Kind ${kind.vorname} (geb. ${new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(kind.geburtsdatum + "T12:00:00Z"))}), gesetzlich vertreten durch ${[p.vorname, p.nachname].filter(Boolean).join(" ")}`;
  }

  // Unterlagen: nur eigene, noch nicht abgesendete Uploads dieses Entwurfs
  let dokumente: DokumentMeta[] | undefined;
  let uploadIds: string[] = [];
  if (leistung.dokumente?.length) {
    const wahl = body.dokumente ?? [];
    const imEntwurf = body.entwurf ? await uploadsImEntwurf(tenant, body.entwurf) : [];
    const uploads = wahl.map((d) => imEntwurf.find((u) => u.id === d.id));
    if (uploads.some((u) => !u)) return fehler("dokument_unbekannt", 409);
    const erlaubt = new Set(dokumentarten(tenant).map((d) => d.id));
    const arten = Object.fromEntries(wahl.map((d) => [d.id, erlaubt.has(d.art) ? d.art : "sonstiges"]));
    if (fehlendeUnterlagen(tenant, leistung.id, Object.values(arten)).length) return fehler("unterlagen_fehlen", 422);
    dokumente = uploadsZuDokumenten(uploads.map((u) => u!), arten);
    uploadIds = uploads.map((u) => u!.id);
  }

  const ergebnis = await gatewayFuer(leistung).einreichen({ tenant, leistung, daten: pruefung.werte, basisUrl: basisUrl(req, tenant), kontoId: konto?.id, dokumente, fuer, vertreterKontoId: h?.vollmacht ? h.selbst.id : undefined });
  if (uploadIds.length) await uebernehmeUploads(uploadIds);
  const titel = tx(leistung.titel, lang);
  if (h) await protokolliereVertretung(h, "Antrag gestellt", `${tx(leistung.titel, "de")} (${ergebnis.vorgangsnummer})`);

  // Gebühr direkt online bezahlen (falls konfiguriert)
  let zahlung: { id: string; betragCent: number; url: string } | undefined;
  const betrag = betragFuer(leistung, pruefung.werte);
  if (betrag && aktiv(tenant, "zahlung") && zahlungsAnbieter()) {
    const z = await legeZahlungAn(tenant, { betragCent: betrag, zweck: `${titel} – ${ergebnis.vorgangsnummer}`, kontoId: konto?.id, vorgangId: ergebnis.vorgangsnummer });
    zahlung = { id: z.id, betragCent: z.betragCent, url: `/bezahlen/${z.id}?t=${encodeURIComponent(zahlungZugang(z))}` };
  }
  return Response.json({ ...ergebnis, titel, zahlung }, { status: 201 });
}
