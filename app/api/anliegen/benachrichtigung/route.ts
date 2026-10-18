/**
 * POST   /api/anliegen/benachrichtigung { id, code?, kanal, ziel }  – Status-Nachrichten bestellen
 * DELETE /api/anliegen/benachrichtigung { id, code?, kanal }        – abbestellen
 * Zugriff mit Zugangscode (ohne Konto) oder als Kontoinhaber.
 */
import { z } from "zod";
import { fehler, leseJson, tenantAus } from "@/lib/api";
import { gleicheHerkunft } from "@/lib/backoffice/auth";
import { kontoFuer } from "@/lib/konto/vertretung";
import { kanalVerfuegbar, normalisiereTelefon, sendeKurznachricht } from "@/lib/kurznachricht";
import { sendMail } from "@/lib/mail";
import { clientKey, rateLimit, tooMany } from "@/lib/rate-limit";
import type { Kanal } from "@/lib/records";
import { kanaeleVon, kanalSicht, setzeKanaele } from "@/lib/vorgaenge/benachrichtigung";
import { ladeMitCode, ladeVorgang } from "@/lib/vorgaenge/service";

export const runtime = "nodejs";

const Basis = z.object({ id: z.string().max(40), code: z.string().max(64).optional(), kanal: z.enum(["sms", "whatsapp", "email"]) });

async function zugriff(req: Request, b: z.infer<typeof Basis>) {
  const tenant = await tenantAus(req);
  const konto = await kontoFuer(tenant, "antraege");
  const eigen = konto ? await ladeVorgang(tenant, b.id) : undefined;
  const v = b.code ? await ladeMitCode(tenant, b.id, b.code) : eigen && eigen.kontoId === konto!.id ? eigen : undefined;
  return { tenant, v };
}

export async function POST(req: Request) {
  if (!gleicheHerkunft(req)) return fehler("herkunft", 403);
  // Schutz vor Missbrauch als SMS-Versender: wenige Bestellungen je Gerät
  const rl = rateLimit(`kanal:${clientKey(req)}`, 5, 60 * 60_000);
  if (!rl.ok) return tooMany(rl.retryAfter);
  const p = Basis.extend({ ziel: z.string().trim().min(5).max(200) }).safeParse(await leseJson(req).catch(() => null));
  if (!p.success) return fehler("ungueltige_anfrage");
  const { tenant, v } = await zugriff(req, p.data);
  if (!v) return fehler("nicht_gefunden", 404);
  if (!kanalVerfuegbar(tenant, p.data.kanal)) return fehler("nicht_verfuegbar", 404);
  let ziel: string | undefined;
  if (p.data.kanal === "email") ziel = z.string().email().safeParse(p.data.ziel).success ? p.data.ziel.toLowerCase() : undefined;
  else ziel = normalisiereTelefon(p.data.ziel);
  if (!ziel) return fehler(p.data.kanal === "email" ? "email" : "telefon");

  const neu: Kanal = { kanal: p.data.kanal, ziel };
  const liste = [...kanaeleVon(v).filter((k) => k.kanal !== neu.kanal), neu];
  await setzeKanaele(v, liste);
  const bestaetigung = `${tenant.art} ${tenant.name}: Sie erhalten ab jetzt Nachrichten zum Stand Ihres Anliegens ${v.id}. Abbestellen unter „Meine Anliegen“.`;
  if (neu.kanal === "email") await sendMail(tenant, { to: ziel, subject: `Benachrichtigungen zu Ihrem Anliegen ${v.id}`, text: `Guten Tag,\n\n${bestaetigung}\n\nFreundliche Grüße\n${tenant.email.absenderName}` }).catch(() => undefined);
  else await sendeKurznachricht(tenant, neu.kanal, ziel, bestaetigung);
  return Response.json({ ok: true, kanaele: liste.map(kanalSicht) });
}

export async function DELETE(req: Request) {
  if (!gleicheHerkunft(req)) return fehler("herkunft", 403);
  const p = Basis.safeParse(await leseJson(req).catch(() => null));
  if (!p.success) return fehler("ungueltige_anfrage");
  const { v } = await zugriff(req, p.data);
  if (!v) return fehler("nicht_gefunden", 404);
  const liste = kanaeleVon(v).filter((k) => k.kanal !== p.data.kanal);
  await setzeKanaele(v, liste);
  return Response.json({ ok: true, kanaele: liste.map(kanalSicht) });
}
