/** GET ?wahl= – Briefwahl-Anträge als CSV für die Wahlsoftware (zuständiges Amt, wird protokolliert). */
import { fehler } from "@/lib/api";
import { protokolliere } from "@/lib/backoffice/audit";
import { boZugang } from "@/lib/backoffice/zugang";
import { alleWahlen, antraegeFuer } from "@/lib/briefwahl/service";
import { darfWahlamt } from "@/lib/briefwahl/zugang";
import { STATUS_LABEL } from "@/lib/vorgaenge/service";

export const runtime = "nodejs";

const zelle = (s: string) => `"${s.replace(/"/g, '""').replace(/^[=+\-@\t\r]/, "'$&")}"`;
const VERSAND: Record<string, string> = { wohnanschrift: "Wohnanschrift", andere: "Andere Anschrift", abholen: "Abholung" };

export async function GET(req: Request) {
  const c = await boZugang(req);
  if ("antwort" in c) return c.antwort;
  if (!darfWahlamt(c.tenant, c.b)) return fehler("keine_berechtigung", 403);
  const wahl = (await alleWahlen(c.tenant)).find((w) => w.id === new URL(req.url).searchParams.get("wahl"));
  if (!wahl) return fehler("nicht_gefunden", 404);
  const liste = await antraegeFuer(c.tenant, wahl.id);
  const berlin = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });
  const zeilen = liste.map(({ v, w, email, doppelt }) =>
    [
      v.id,
      w.nachname,
      w.vorname,
      w.geburtsdatum,
      w.strasse,
      w.plz,
      w.ort,
      w.waehlerverzeichnis ?? "",
      VERSAND[w.versand] ?? w.versand,
      w.versand === "andere" ? [w.versandName, w.versandStrasse, w.versandPlzOrt, w.versandLand].filter(Boolean).join(", ") : "",
      email,
      berlin.format(new Date(v.erstelltAm)),
      STATUS_LABEL[v.status],
      doppelt ? "prüfen" : "",
    ]
      .map((x) => zelle(x ?? ""))
      .join(";"),
  );
  await protokolliere({ tenant: c.tenant.slug, benutzer: c.b.name, aktion: "briefwahl", details: `Export ${wahl.titel} (${liste.length})` });
  const kopf = "Vorgang;Familienname;Vorname;Geburtsdatum;Straße;PLZ;Ort;Wählerverzeichnis;Versand;Versandanschrift;E-Mail;Eingang;Status;Doppelantrag";
  return new Response("﻿" + [kopf, ...zeilen].join("\r\n"), {
    headers: { "content-type": "text/csv; charset=utf-8", "content-disposition": `attachment; filename="briefwahl-${wahl.datum}.csv"`, "Cache-Control": "no-store" },
  });
}
