/**
 * Inhalte des Konto-Dashboards: Kacheln mit Zählern und persönliche Hinweise.
 * Jede Funktion trägt ihren Teil bei – abhängig von den Funktionen der Gemeinde.
 */
import "server-only";
import type { GemeindeConfig } from "@/config/types";
import type { IconName } from "@/components/ui/Icon";
import type { KontoRecord } from "@/lib/records";
import { anliegenVon, profilVon } from "./service";

export interface KachelDaten {
  href: string;
  icon: IconName;
  titel: string;
  text?: string;
  zahl?: number;
}

export async function kontoUebersicht(tenant: GemeindeConfig, k: KontoRecord) {
  const { vorgaenge, termine } = await anliegenVon(k);
  const p = profilVon(k);
  const offen = vorgaenge.filter((v) => v.status !== "erledigt");
  const rueckfragen = vorgaenge.filter((v) => v.status === "rueckfrage").length;
  const heute = new Date().toISOString().slice(0, 16);
  const naechster = termine.filter((t) => t.status === "gebucht" && t.slot >= heute).sort((a, b) => a.slot.localeCompare(b.slot))[0];
  const fmtSlot = (s: string) =>
    new Intl.DateTimeFormat("de-DE", { weekday: "short", day: "numeric", month: "long" }).format(new Date(s.slice(0, 10) + "T12:00:00")) + `, ${s.slice(11)} Uhr`;

  const kacheln: KachelDaten[] = [
    {
      href: "/meine-anliegen",
      icon: "doc",
      titel: "Meine Anliegen",
      text: offen.length ? `${offen.length} in Bearbeitung${rueckfragen ? ` · ${rueckfragen} Rückfrage${rueckfragen > 1 ? "n" : ""}` : ""}` : "Keine offenen Anliegen",
      zahl: rueckfragen,
    },
    { href: "/termine", icon: "calendar", titel: "Termine", text: naechster ? `Nächster Termin: ${fmtSlot(naechster.slot)}` : "Termin im Rathaus buchen" },
  ];

  const hinweise: { text: string; href: string; link: string }[] = [];
  if (p.ausweisGueltigBis) {
    const tage = Math.round((new Date(p.ausweisGueltigBis).getTime() - Date.now()) / 86400_000);
    if (tage <= 90)
      hinweise.push({
        text: tage < 0 ? "Ihr Personalausweis ist abgelaufen." : `Ihr Personalausweis läuft in ${tage} Tagen ab. Planen Sie etwa 4 Wochen für den neuen Ausweis ein.`,
        href: "/termine?leistung=personalausweis",
        link: "Termin buchen",
      });
  }

  kacheln.push(
    { href: "/konto/profil", icon: "user", titel: "Persönliche Daten", text: "Füllen Formulare automatisch aus" },
    { href: "/konto/sicherheit", icon: "lock", titel: "Sicherheit & Datenschutz", text: "Geräte, Passwort, Datenexport, Konto löschen" },
  );
  return { kacheln, hinweise };
}
