/** GET ?von=JJJJ-MM-TT&bis=JJJJ-MM-TT – bezahlte Online-Zahlungen als CSV für die Gemeindekasse (Rolle „admin“). */
import { fehler } from "@/lib/api";
import { protokolliere } from "@/lib/backoffice/audit";
import { hatRolle } from "@/lib/backoffice/auth";
import { boZugang } from "@/lib/backoffice/zugang";
import { zahlungenVon } from "@/lib/zahlung/service";

export const runtime = "nodejs";

const zelle = (s: string) => `"${s.replace(/"/g, '""').replace(/^[=+\-@\t\r]/, "'$&")}"`;
const DATUM = /^\d{4}-\d{2}-\d{2}$/;

export async function GET(req: Request) {
  const c = await boZugang(req);
  if ("antwort" in c) return c.antwort;
  if (!hatRolle(c.b, "admin")) return fehler("keine_berechtigung", 403);
  const q = new URL(req.url).searchParams;
  const heute = new Date().toISOString().slice(0, 10);
  const von = q.get("von") ?? `${heute.slice(0, 7)}-01`;
  const bis = q.get("bis") ?? heute;
  if (!DATUM.test(von) || !DATUM.test(bis) || von > bis) return fehler("ungueltige_anfrage");
  const liste = await zahlungenVon((z) => z.tenant === c.tenant.slug && z.status === "bezahlt" && !!z.bezahltAm && z.bezahltAm.slice(0, 10) >= von && z.bezahltAm.slice(0, 10) <= bis);
  const berlin = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });
  const zeilen = liste.map((z) =>
    [berlin.format(new Date(z.bezahltAm!)), (z.betragCent / 100).toFixed(2).replace(".", ","), z.zweck, z.vorgangId ?? (z.bezug ? `${z.bezug.art} ${z.bezug.id}` : ""), z.methode ?? "", z.anbieter, z.referenz ?? "", z.id].map(zelle).join(";"),
  );
  const summe = liste.reduce((s, z) => s + z.betragCent, 0);
  await protokolliere({ tenant: c.tenant.slug, benutzer: c.b.name, aktion: "kassen_export", details: `Kassen-Export ${von} bis ${bis} (${liste.length})` });
  const csv = ["Bezahlt am;Betrag (EUR);Zweck;Bezug;Zahlart;Anbieter;Referenz;Zahlungs-ID", ...zeilen, `${zelle("Summe")};${zelle((summe / 100).toFixed(2).replace(".", ","))}`].join("\r\n");
  return new Response("﻿" + csv, {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="kasse-${von}-${bis}.csv"`, "Cache-Control": "no-store" },
  });
}
