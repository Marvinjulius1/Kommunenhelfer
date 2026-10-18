/** Antragszusammenfassung als PDF – für E-Akte, DMS-Ablage und Druck. */
import "server-only";
import type { GemeindeConfig } from "@/config/types";
import { decryptJson } from "@/lib/crypto";
import { anzeigeWert } from "@/lib/flows/validate";
import { tx } from "@/lib/i18n";
import { textPdf, type PdfAbschnitt } from "@/lib/pdf/text";
import type { VorgangDaten, VorgangRecord } from "@/lib/records";
import { artLabel } from "@/lib/uploads/pruefung";
import { nachrichten, STATUS_LABEL } from "./service";

export function vorgangPdf(tenant: GemeindeConfig, v: VorgangRecord): Buffer {
  const d = decryptJson<VorgangDaten>(v.daten);
  const l = tenant.leistungen.find((x) => x.id === v.leistungId);
  const amt = tenant.aemter.find((a) => a.id === v.amtId);
  const fmt = (iso: string) => new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" }).format(new Date(iso));
  const felder = l?.formular?.schritte.flatMap((s) => s.felder) ?? [];
  const abschnitte: PdfAbschnitt[] = [
    {
      ueberschrift: "Vorgang",
      zeilen: [
        ["Vorgangsnummer", v.id],
        ["Eingegangen", fmt(v.erstelltAm)],
        ["Zuständig", amt ? tx(amt.name, "de") : v.amtId],
        ["Status", STATUS_LABEL[v.status]],
        ...(v.leistungsschluessel ? ([["Leistungsschlüssel", v.leistungsschluessel]] as [string, string][]) : []),
      ],
    },
    { ueberschrift: "Antragsteller/in", zeilen: [["Name", d.kontakt.name], ["E-Mail", d.kontakt.email], ["Telefon", d.kontakt.telefon ?? ""], ...(d.fuer ? ([["Hinweis", d.fuer]] as [string, string][]) : [])] },
  ];
  if (d.werte) abschnitte.push({ ueberschrift: "Angaben im Formular", zeilen: felder.filter((f) => d.werte![f.id] !== undefined).map((f) => [tx(f.label, "de"), anzeigeWert(f, d.werte![f.id], "de")] as [string, string]) });
  if (d.nachricht) abschnitte.push({ ueberschrift: "Nachricht", zeilen: [d.nachricht] });
  if (v.dokumente.length) abschnitte.push({ ueberschrift: `Unterlagen (${v.dokumente.length})`, zeilen: v.dokumente.map((x) => [artLabel(tenant, x.art, "de"), decryptJson<string>(x.name)] as [string, string]) });
  const n = nachrichten(v);
  if (n.length) abschnitte.push({ ueberschrift: "Nachrichten", zeilen: n.map((x) => `${fmt(x.am)} – ${x.von === "amt" ? "Amt" : "Bürger/in"}: ${x.text}`) });
  return textPdf(l ? tx(l.titel, "de") : "Vorgang", `${tenant.art} ${tenant.name} · Bürgerportal`, abschnitte, `${v.id} · erstellt ${fmt(new Date().toISOString())}`);
}
