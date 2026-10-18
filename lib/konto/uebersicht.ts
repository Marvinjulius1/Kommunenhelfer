/**
 * Inhalte des Konto-Dashboards: Kacheln mit Zählern und persönliche Hinweise.
 * Jede Funktion trägt ihren Teil bei – abhängig von den Funktionen der Gemeinde.
 */
import "server-only";
import type { GemeindeConfig } from "@/config/types";
import type { IconName } from "@/components/ui/Icon";
import type { KontoRecord } from "@/lib/records";
import { aktiv } from "@/lib/funktionen";
import { checklistenVon, checklisteSicht } from "@/lib/lebenslagen/service";
import { aktuelleMeldungen } from "@/lib/meldungen/service";
import { postFuerKonto } from "@/lib/postfach/service";
import { safeVon } from "@/lib/safe/service";
import { euro, zahlungZugang, zahlungenVon } from "@/lib/zahlung/service";
import { berechneHinweise, type Hinweis } from "./hinweise";
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

  const post = await postFuerKonto(k);
  const ungelesen = post.filter((p) => !p.gelesenAm).length;
  kacheln.push({ href: "/konto/postfach", icon: "inbox", titel: "Postfach", text: ungelesen ? `${ungelesen} ungelesen` : post.length ? "Bescheide und Nachrichten" : "Bescheide kommen digital hierher", zahl: ungelesen });

  if (aktiv(tenant, "zahlung")) {
    const offeneZ = await zahlungenVon((z) => z.kontoId === k.id && z.status === "offen");
    const summe = offeneZ.reduce((s, z) => s + z.betragCent, 0);
    kacheln.push({ href: "/konto/zahlungen", icon: "card", titel: "Zahlungen", text: offeneZ.length ? `${euro(summe)} offen` : "Quittungen und offene Gebühren", zahl: offeneZ.length });
  }
  const safe = await safeVon(k);
  kacheln.push({ href: "/konto/dokumente", icon: "shield", titel: "Dokumentensafe", text: safe.length ? `${safe.length} Dokument${safe.length > 1 ? "e" : ""} sicher abgelegt` : "Unterlagen einmal ablegen, immer wieder verwenden" });

  if (aktiv(tenant, "lebenslagen") && tenant.lebenslagen?.length) {
    const listen = (await checklistenVon(k)).map((c) => checklisteSicht(tenant, c)).filter((c) => !!c);
    const bald = new Date(Date.now() + 7 * 86400_000).toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
    let faellig = 0;
    for (const c of listen) for (const sc of c.schritte) if (!sc.erledigt && sc.frist && sc.frist <= bald) faellig++;
    const offen = listen.reduce((s, c) => s + c.offen, 0);
    kacheln.push({
      href: listen.length === 1 ? `/lebenslagen/${listen[0].lebenslageId}` : "/lebenslagen",
      icon: "tasks",
      titel: "Meine Checklisten",
      text: listen.length ? `${listen.map((c) => c.titel).join(", ")} · ${offen} offen` : "Umzug, Geburt, neu hier – alles Schritt für Schritt",
      zahl: faellig,
    });
  }

  const meldungen = await aktuelleMeldungen(tenant, k.einstellungen.ortsteil);
  kacheln.push({
    href: "/aktuelles",
    icon: "megaphone",
    titel: "Aktuelles",
    text: meldungen.length ? meldungen[0].titel : `Meldungen${k.einstellungen.ortsteil ? ` für ${k.einstellungen.ortsteil}` : " aus Ihrer Gemeinde"}`,
    zahl: meldungen.filter((m) => m.wichtig).length,
  });

  kacheln.push(
    ...(aktiv(tenant, "hinweise") ? [{ href: "/konto/haushalt", icon: "home" as const, titel: "Mein Haushalt", text: "Kinder, Hund, Reisepass – für Hinweise, die zu Ihnen passen" }] : []),
    { href: "/konto/einstellungen", icon: "bell", titel: "Benachrichtigungen", text: k.einstellungen.pushBenachrichtigung ? "Push und E-Mail aktiv" : "E-Mail, Push, Wohnort" },
    { href: "/konto/profil", icon: "user", titel: "Persönliche Daten", text: "Füllen Formulare automatisch aus" },
    { href: "/konto/sicherheit", icon: "lock", titel: "Sicherheit & Datenschutz", text: "Geräte, Passwort, Datenexport, Konto löschen" },
  );
  return { kacheln, hinweise: aktiv(tenant, "hinweise") ? await hinweiseFuer(tenant, k) : [] };
}

/** „Was steht bei mir an?“ für ein Konto (Dashboard und tägliche Erinnerung). */
export async function hinweiseFuer(tenant: GemeindeConfig, k: KontoRecord, heute = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" })): Promise<Hinweis[]> {
  const { vorgaenge, termine } = await anliegenVon(k);
  const zahlungen = aktiv(tenant, "zahlung") ? await zahlungenVon((z) => z.kontoId === k.id && z.status === "offen") : [];
  const checklisten = aktiv(tenant, "lebenslagen") ? (await checklistenVon(k)).map((c) => checklisteSicht(tenant, c)).filter((c) => !!c) : [];
  return berechneHinweise(
    tenant,
    {
      profil: profilVon(k),
      vorgaenge,
      termine,
      zahlungen: zahlungen.map((z) => ({ id: z.id, betragCent: z.betragCent, zweck: z.zweck, url: `/bezahlen/${z.id}?t=${encodeURIComponent(zahlungZugang(z))}` })),
      checklisten,
      abfallBezirk: aktiv(tenant, "abfall") ? k.einstellungen.abfallBezirk : undefined,
      ausgeblendet: k.ausgeblendet,
    },
    heute,
  );
}
