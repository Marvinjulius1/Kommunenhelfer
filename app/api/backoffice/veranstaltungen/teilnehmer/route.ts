/** GET ?id= – Teilnehmerliste als CSV (Rolle „redaktion“, wird protokolliert). */
import { fehler } from "@/lib/api";
import { protokolliere } from "@/lib/backoffice/audit";
import { hatRolle } from "@/lib/backoffice/auth";
import { boZugang } from "@/lib/backoffice/zugang";
import { decryptJson } from "@/lib/crypto";
import { anmeldungen, veranstaltung, type AnmeldeDaten } from "@/lib/veranstaltungen/service";

export const runtime = "nodejs";

const zelle = (s: string) => `"${s.replace(/"/g, '""').replace(/^[=+\-@]/, "'$&")}"`;

export async function GET(req: Request) {
  const c = await boZugang(req);
  if ("antwort" in c) return c.antwort;
  if (!hatRolle(c.b, "redaktion")) return fehler("keine_berechtigung", 403);
  const v = await veranstaltung(c.tenant, new URL(req.url).searchParams.get("id") ?? "");
  if (!v) return fehler("nicht_gefunden", 404);
  const zeilen = (await anmeldungen(c.tenant, v.id))
    .filter((a) => a.status !== "storniert")
    .map((a) => {
      const d = decryptJson<AnmeldeDaten>(a.daten);
      return [a.status === "angemeldet" ? "angemeldet" : "Warteliste", String(a.anzahl), d.name, d.email, d.telefon ?? "", d.hinweis ?? "", a.erstelltAm.slice(0, 16).replace("T", " ")].map(zelle).join(";");
    });
  await protokolliere({ tenant: c.tenant.slug, benutzer: c.b.name, aktion: "veranstaltung", details: `Teilnehmerliste: ${v.id}` });
  // BOM, damit Excel Umlaute richtig liest
  return new Response("﻿" + ["Status;Personen;Name;E-Mail;Telefon;Hinweis;Angemeldet am", ...zeilen].join("\r\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="teilnehmer-${v.id}.csv"`, "Cache-Control": "no-store" },
  });
}
