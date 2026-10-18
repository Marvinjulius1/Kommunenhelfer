/**
 * Vollmachten und Unternehmenskonten.
 * GET  – erteilte und erhaltene Vollmachten, Unternehmen, aktive Vertretung
 * POST { aktion: "erteilen" | "annehmen" | "widerrufen" | "wechseln" | "organisation" | "einladen", … }
 */
import { z } from "zod";
import { basisUrl, fehler, leseJson, tenantAus } from "@/lib/api";
import { gleicheHerkunft } from "@/lib/backoffice/auth";
import { aktiv } from "@/lib/funktionen";
import { aktuellesKonto, ladeKonto } from "@/lib/konto/service";
import {
  ALLE,
  anzeigeName,
  erhalten,
  erstelleOrganisation,
  erteile,
  erteilt,
  handelndesKonto,
  inhaltVon,
  istInhaber,
  ladeVollmacht,
  nimmAn,
  protokoll,
  wechsle,
  widerrufe,
} from "@/lib/konto/vertretung";
import { sendMail } from "@/lib/mail";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import type { VollmachtRecord } from "@/lib/records";

export const runtime = "nodejs";

const umfang = z.array(z.enum(["antraege", "termine", "post", "zahlungen"])).min(1);
const Schema = z.discriminatedUnion("aktion", [
  z.object({ aktion: z.literal("erteilen"), name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(200), umfang, bis: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional() }),
  z.object({ aktion: z.literal("annehmen"), token: z.string().max(120) }),
  z.object({ aktion: z.literal("widerrufen"), id: z.string().max(40) }),
  z.object({ aktion: z.literal("wechseln"), id: z.string().max(40).nullable() }),
  z.object({ aktion: z.literal("organisation"), name: z.string().trim().min(2).max(160), rechtsform: z.string().trim().max(60).optional(), strasse: z.string().trim().max(120).optional(), plz: z.string().regex(/^\d{5}$/).optional(), ort: z.string().trim().max(80).optional(), email: z.string().trim().email().max(200), telefon: z.string().trim().max(40).optional() }),
  z.object({ aktion: z.literal("einladen"), orgId: z.string().max(40), name: z.string().trim().min(2).max(120), email: z.string().trim().email().max(200), rolle: z.enum(["inhaber", "mitarbeiter"]) }),
]);

const sicht = (v: VollmachtRecord) => {
  const i = inhaltVon(v);
  return { id: v.id, art: v.art, rolle: v.rolle, umfang: v.umfang, bis: v.bis, status: v.status, vonName: i.vonName, anName: i.anName, anEmail: i.anEmail, seit: v.erstelltAm };
};

export async function GET(req: Request) {
  const tenant = await tenantAus(req);
  const selbst = await aktuellesKonto(tenant);
  if (!selbst) return fehler("nicht_angemeldet", 401);
  const h = await handelndesKonto(tenant);
  const meine = await erhalten(tenant, selbst.id);
  const organisationen = await Promise.all(
    meine
      .filter((v) => v.art === "organisation")
      .map(async (v) => ({ ...sicht(v), mitglieder: v.rolle === "inhaber" ? (await erteilt(tenant, v.vonKontoId)).map(sicht) : undefined, orgId: v.vonKontoId })),
  );
  return Response.json(
    {
      erteilt: (await erteilt(tenant, selbst.id)).map(sicht),
      erhalten: meine.filter((v) => v.art === "vollmacht").map(sicht),
      organisationen,
      aktiv: h?.vollmacht?.id ?? null,
      protokoll: (await protokoll(tenant, selbst.id)).slice(0, 30).map((l) => ({ aktion: l.aktion, details: l.details, am: l.erstelltAm })),
    },
    { headers: { "Cache-Control": "no-store" } },
  );
}

export async function POST(req: Request) {
  if (!gleicheHerkunft(req)) return fehler("herkunft", 403);
  const tenant = await tenantAus(req);
  if (!aktiv(tenant, "konto")) return fehler("nicht_verfuegbar", 404);
  const selbst = await aktuellesKonto(tenant);
  if (!selbst) return fehler("nicht_angemeldet", 401);
  const p = Schema.safeParse(await leseJson(req).catch(() => null));
  if (!p.success) return fehler("ungueltige_anfrage");
  const d = p.data;
  const basis = basisUrl(req, tenant);

  if (d.aktion === "erteilen" || d.aktion === "einladen") {
    const rl = rateLimit(`vollmacht:${clientKey(req)}`, 10, 60 * 60_000);
    if (!rl.ok) return tooMany(rl.retryAfter);
    let von = selbst;
    if (d.aktion === "einladen") {
      if (!(await istInhaber(tenant, d.orgId, selbst.id))) return fehler("keine_berechtigung", 403);
      const org = await ladeKonto(tenant, d.orgId);
      if (!org) return fehler("nicht_gefunden", 404);
      von = org;
    }
    const { vollmacht, code } = await erteile(tenant, von, {
      art: d.aktion === "einladen" ? "organisation" : "vollmacht",
      anName: d.name,
      anEmail: d.email,
      umfang: d.aktion === "einladen" ? ALLE : d.umfang,
      bis: d.aktion === "erteilen" ? d.bis : undefined,
      rolle: d.aktion === "einladen" ? d.rolle : undefined,
    });
    const link = `${basis}/konto/vollmachten?annehmen=${vollmacht.id}.${encodeURIComponent(code)}`;
    const wer = anzeigeName(selbst);
    await sendMail(tenant, {
      to: d.email,
      subject: d.aktion === "einladen" ? `Einladung: ${anzeigeName(von)} im Bürgerportal` : `${wer} möchte Ihnen eine Vollmacht erteilen`,
      text:
        d.aktion === "einladen"
          ? `Guten Tag ${d.name},\n\n${wer} lädt Sie ein, im Bürgerportal der ${tenant.art} ${tenant.name} für ${anzeigeName(von)} zu handeln.\n\nMelden Sie sich mit Ihrem eigenen Bürgerkonto an und nehmen Sie die Einladung an (14 Tage gültig):\n${link}\n\nFreundliche Grüße\n${tenant.email.absenderName}`
          : `Guten Tag ${d.name},\n\n${wer} möchte Ihnen im Bürgerportal der ${tenant.art} ${tenant.name} eine Vollmacht erteilen. Sie können dann Anliegen für ${wer} erledigen.\n\nMelden Sie sich mit Ihrem eigenen Bürgerkonto an und nehmen Sie die Vollmacht an (14 Tage gültig):\n${link}\n\nFreundliche Grüße\n${tenant.email.absenderName}`,
    }).catch(() => undefined);
    return Response.json({ ok: true, id: vollmacht.id }, { status: 201 });
  }

  if (d.aktion === "annehmen") {
    const r = await nimmAn(tenant, d.token, selbst);
    if (r === "eigene") return fehler("eigene_vollmacht", 409);
    if (r === "ungueltig") return fehler("ungueltig", 404);
    return Response.json({ ok: true, vonName: inhaltVon(r).vonName, art: r.art });
  }

  if (d.aktion === "widerrufen") {
    const v = await ladeVollmacht(tenant, d.id);
    if (!v) return fehler("nicht_gefunden", 404);
    // Widerrufen darf: wer vertreten wird, wer bevollmächtigt ist, oder ein Inhaber des Unternehmens
    const darf = v.vonKontoId === selbst.id || v.anKontoId === selbst.id || (v.art === "organisation" && (await istInhaber(tenant, v.vonKontoId, selbst.id)));
    if (!darf) return fehler("keine_berechtigung", 403);
    if (v.art === "organisation" && v.rolle === "inhaber" && (await erteilt(tenant, v.vonKontoId)).filter((x) => x.rolle === "inhaber" && x.status === "aktiv").length <= 1) return fehler("letzter_inhaber", 409);
    await widerrufe(v);
    const h = await handelndesKonto(tenant);
    if (h?.vollmacht?.id === v.id) await wechsle(null);
    return Response.json({ ok: true });
  }

  if (d.aktion === "wechseln") {
    if (!d.id) {
      await wechsle(null);
      return Response.json({ ok: true });
    }
    const v = (await erhalten(tenant, selbst.id)).find((x) => x.id === d.id);
    if (!v) return fehler("nicht_gefunden", 404);
    await wechsle(v);
    return Response.json({ ok: true, name: inhaltVon(v).vonName });
  }

  // Unternehmen anlegen
  if ((await erhalten(tenant, selbst.id)).filter((v) => v.art === "organisation" && v.rolle === "inhaber").length >= 5) return fehler("zu_viele", 409);
  const { org } = await erstelleOrganisation(tenant, selbst, d);
  return Response.json({ ok: true, id: org.id }, { status: 201 });
}
