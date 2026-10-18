import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { mitKonto } from "@/lib/konto/api";
import { aktualisiereProfil, findeKontoPerEmail, profilVon, sicht } from "@/lib/konto/service";
import { ibanGueltig } from "@/lib/flows/validate";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const tenant = await tenantAus(req);
  const ctx = await mitKonto(req, tenant);
  if ("antwort" in ctx) return ctx.antwort;
  const p = profilVon(ctx.konto);
  return Response.json({ ...sicht(ctx.konto), profil: { ...p, iban: p.iban ? `${p.iban.slice(0, 4)} •••• ${p.iban.slice(-4)}` : undefined } }, { headers: { "Cache-Control": "no-store" } });
}

const opt = (max: number) => z.string().trim().max(max).optional();
const Schema = z.object({
  vorname: opt(80),
  nachname: opt(80),
  geburtsdatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).optional(),
  strasse: opt(120),
  plz: z.string().regex(/^\d{5}$/).or(z.literal("")).optional(),
  ort: opt(80),
  email: z.string().trim().email().max(200).optional(),
  telefon: opt(40),
  kontoinhaber: opt(120),
  iban: opt(42),
  ausweisGueltigBis: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).optional(),
  ausweisAntragsnummer: opt(40),
  reisepassGueltigBis: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).or(z.literal("")).optional(),
  kinder: z.array(z.object({ vorname: z.string().trim().max(40), geburtsdatum: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) })).max(12).optional(),
  hund: z.boolean().optional(),
  grundbesitz: z.boolean().optional(),
});

export async function PUT(req: Request) {
  const tenant = await tenantAus(req);
  const ctx = await mitKonto(req, tenant);
  if ("antwort" in ctx) return ctx.antwort;
  let b: z.infer<typeof Schema>;
  try {
    b = Schema.parse(await leseJson(req));
  } catch {
    return fehler("ungueltige_anfrage");
  }
  // Beim Online-Ausweis sind Name und Geburtsdatum geprüft und nicht änderbar
  if (ctx.konto.vertrauensniveau === "hoch") {
    delete b.vorname;
    delete b.nachname;
    delete b.geburtsdatum;
  }
  if (b.iban) {
    b.iban = b.iban.replace(/\s+/g, "").toUpperCase();
    if (b.iban.includes("•")) delete b.iban; // maskierter Wert unverändert
    else if (!ibanGueltig(b.iban)) return fehler("iban");
  }
  if (b.email) {
    const anderes = await findeKontoPerEmail(tenant, b.email);
    if (anderes && anderes.id !== ctx.konto.id) return fehler("email_vergeben", 409);
  }
  const neu = await aktualisiereProfil(ctx.konto, Object.fromEntries(Object.entries(b).filter(([, v]) => v !== undefined)), tenant);
  return Response.json(sicht(neu));
}
