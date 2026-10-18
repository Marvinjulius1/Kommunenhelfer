/**
 * POST /api/schnittstelle/vorgaenge/<id> – Rückmeldung aus dem Fachverfahren
 * (Authorization: Bearer <Schlüssel>). Alles optional, in dieser Reihenfolge:
 *   { status?, rueckfrage?, bescheid?: { titel, text?, pdf? (Base64) }, gebuehr?: { betrag, zweck } }
 * Der Bürger wird wie bei einer Bearbeitung im Backoffice benachrichtigt.
 */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { protokolliere } from "@/lib/backoffice/audit";
import { aktiv } from "@/lib/funktionen";
import { stelleZu } from "@/lib/postfach/service";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import { darfAmt, pruefeSchluessel } from "@/lib/schnittstelle";
import { zaehle } from "@/lib/statistik";
import { fuegeNachrichtHinzu, ladeVorgang, setzeStatus, VORGANG_STATUS_LISTE } from "@/lib/vorgaenge/service";
import { legeZahlungAn } from "@/lib/zahlung/service";
import { tx } from "@/lib/i18n";
import type { VorgangStatus } from "@/lib/records";

export const runtime = "nodejs";

const Schema = z.object({
  status: z.enum(VORGANG_STATUS_LISTE as [string, ...string[]]).optional(),
  rueckfrage: z.string().trim().min(3).max(2000).optional(),
  bescheid: z.object({ titel: z.string().trim().min(3).max(140), text: z.string().max(5000).optional(), pdf: z.string().max(14_000_000).optional() }).optional(),
  gebuehr: z.object({ betrag: z.number().positive().max(100000), zweck: z.string().trim().min(3).max(120) }).optional(),
});

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const rl = rateLimit(`schnittstelle:${clientKey(req)}`, 120, 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const tenant = await tenantAus(req);
  const s = pruefeSchluessel(req, tenant);
  if (!s) return fehler("nicht_berechtigt", 401);
  let v = await ladeVorgang(tenant, (await params).id);
  if (!v || !darfAmt(s, v.amtId)) return fehler("nicht_gefunden", 404);
  const p = Schema.safeParse(await leseJson(req, 15_000_000).catch(() => null));
  if (!p.success) return fehler("ungueltige_anfrage");
  const wer = `schnittstelle:${s.name}`;
  const amt = tenant.aemter.find((a) => a.id === v!.amtId);
  const ergebnis: Record<string, unknown> = {};

  if (p.data.rueckfrage) {
    v = await fuegeNachrichtHinzu(tenant, v, { von: "amt", text: p.data.rueckfrage, benutzer: s.name });
    ergebnis.rueckfrage = true;
  }
  if (p.data.bescheid) {
    const pdf = p.data.bescheid.pdf ? Buffer.from(p.data.bescheid.pdf, "base64") : undefined;
    if (pdf && pdf.subarray(0, 5).toString() !== "%PDF-") return fehler("kein_pdf", 422);
    await stelleZu({ tenant, art: "bescheid", titel: p.data.bescheid.titel, text: p.data.bescheid.text || "Ihr Bescheid liegt als Dokument bei.", vorgang: v, datei: pdf ? { daten: pdf, name: `${p.data.bescheid.titel}.pdf`, typ: "application/pdf" } : undefined, absender: amt ? tx(amt.name, "de") : tenant.name, tage: 365 * 3 });
    await zaehle(tenant.slug, "bescheide_digital");
    ergebnis.bescheid = true;
  }
  if (p.data.gebuehr && aktiv(tenant, "zahlung")) {
    const z = await legeZahlungAn(tenant, { betragCent: Math.round(p.data.gebuehr.betrag * 100), zweck: `${p.data.gebuehr.zweck} – ${v.id}`, kontoId: v.kontoId, vorgangId: v.id });
    await stelleZu({ tenant, art: "zahlung", titel: `Gebühr: ${p.data.gebuehr.zweck}`, text: "Bitte bezahlen Sie die Gebühr online unter „Meine Anliegen“.", vorgang: v, absender: amt ? tx(amt.name, "de") : tenant.name });
    ergebnis.zahlung = z.id;
  }
  if (p.data.status) {
    v = await setzeStatus(v, p.data.status as VorgangStatus, wer, tenant);
    ergebnis.status = v.status;
  }
  await protokolliere({ tenant: tenant.slug, benutzer: wer, aktion: "status_geaendert", vorgangId: v.id, details: Object.keys(ergebnis).join(", ") || "keine Änderung" });
  return Response.json({ ok: true, ...ergebnis });
}
