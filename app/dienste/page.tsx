import type { Metadata } from "next";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Page } from "@/components/ui/Page";
import { aktiv } from "@/lib/funktionen";
import { deutsch, tx } from "@/lib/i18n";
import { getLang, getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Alle Dienste" };

interface Dienst {
  href: string;
  icon: IconName;
  titel: string;
  text: string;
}

function Gruppe({ titel, dienste }: { titel: string; dienste: Dienst[] }) {
  if (!dienste.length) return null;
  return (
    <section className="mt-10 first:mt-0">
      <h2 className="mb-3 text-[13px] font-medium uppercase tracking-wide text-subtle">{titel}</h2>
      <ul className="grid gap-3 sm:grid-cols-2">
        {dienste.map((d) => (
          <li key={d.href}>
            <Link href={d.href} className="glass pressable flex h-full items-start gap-4 rounded-[24px] p-5">
              <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[var(--line)]">
                <Icon name={d.icon} className="size-5" />
              </span>
              <span>
                <span className="block text-[16px] font-semibold">{d.titel}</span>
                <span className="mt-1 block text-[14px] leading-snug text-muted">{d.text}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Übersicht aller Portal-Funktionen – je nachdem, was die Gemeinde anbietet. */
export default async function DiensteSeite() {
  const tenant = await getTenant();
  const lang = await getLang(tenant);
  const de = deutsch(lang);
  const an = (f: Parameters<typeof aktiv>[1]) => aktiv(tenant, f);

  const erledigen: Dienst[] = [
    { href: "/leistungen", icon: "doc", titel: de ? "Anträge online" : "Online applications", text: de ? "Alle Leistungen von A bis Z" : "All services from A to Z" },
    { href: "/termine", icon: "calendar", titel: de ? "Termin buchen" : "Book an appointment", text: de ? "Im Rathaus – ohne Wartezeit" : "At the town hall – no waiting" },
    { href: "/meine-anliegen", icon: "search", titel: de ? "Meine Anliegen" : "My requests", text: de ? "Stand, Rückfragen, Bescheide" : "Status, questions, decisions" },
    ...(an("warteschlange") ? [{ href: "/wartezeit", icon: "clock" as const, titel: de ? "Wartezeit & Wartenummer" : "Waiting times", text: de ? "Live sehen, Nummer online ziehen" : "Live, take a number online" }] : []),
    ...(an("ausweisStatus") ? [{ href: "/ausweis-status", icon: "id" as const, titel: de ? "Ist mein Ausweis da?" : "Is my ID ready?", text: de ? "Status mit der Antragsnummer prüfen" : "Check with your application number" }] : []),
    ...(an("konto") ? [{ href: "/konto", icon: "user" as const, titel: de ? "Bürgerkonto" : "Citizen account", text: de ? "Postfach, Zahlungen, Dokumentensafe" : "Inbox, payments, document safe" }] : []),
    ...(an("konto") ? [{ href: "/konto/vollmachten", icon: "users" as const, titel: de ? "Familie, Vollmacht, Unternehmen" : "Family, power of attorney, business", text: de ? "Für Angehörige oder die eigene Firma handeln" : "Act for relatives or your company" }] : []),
    ...(tenant.ausschreibungen?.length ? [{ href: "/ausschreibungen", icon: "doc" as const, titel: de ? "Ausschreibungen" : "Tenders", text: de ? "Aufträge der Gemeinde" : "Public contracts" }] : []),
  ];
  const alltag: Dienst[] = [
    ...(an("abfall") && tenant.abfall ? [{ href: "/abfall", icon: "leaf" as const, titel: de ? "Abfallkalender" : "Waste calendar", text: de ? "Abfuhrtermine und Erinnerung" : "Collection dates and reminders" }] : []),
    ...(an("maengelmelder") && tenant.maengel ? [{ href: "/maengel/melden", icon: "pin" as const, titel: de ? "Mangel melden" : "Report an issue", text: de ? "Schlagloch, Laterne, wilder Müll" : "Potholes, street lights, dumping" }] : []),
    ...(an("fundbuero") ? [{ href: "/fundbuero", icon: "search" as const, titel: de ? "Fundbüro" : "Lost and found", text: de ? "Verloren? Hier suchen" : "Lost something? Search here" }] : []),
    { href: "/aktuelles", icon: "megaphone", titel: de ? "Aktuelles" : "News", text: de ? "Sperrungen und Hinweise" : "Closures and notices" },
    ...(an("karte") && tenant.karte ? [{ href: "/karte", icon: "pin" as const, titel: de ? "Stadtkarte" : "Town map", text: de ? "Wertstoffhof, Defibrillatoren, Baustellen" : "Recycling, defibrillators, roadworks" }] : []),
    ...(an("parken") ? [{ href: "/parken", icon: "card" as const, titel: de ? "Parken & Verwarnungsgeld" : "Parking & fines", text: de ? "Bezahlen, Stellung nehmen, Parkausweis" : "Pay, respond, parking permit" }] : []),
    ...(an("friedhof") && tenant.friedhoefe?.length ? [{ href: "/friedhof", icon: "leaf" as const, titel: de ? "Friedhöfe" : "Cemeteries", text: de ? "Grabarten, Gebühren, Nutzungsrecht verlängern" : "Grave types, fees, extensions" }] : []),
  ];
  const familie: Dienst[] = [
    ...(an("kita") && tenant.kitas?.length ? [{ href: "/kita", icon: "users" as const, titel: de ? "Kita-Platz" : "Childcare place", text: de ? "Wunsch-Kitas wählen, Warteliste sehen" : "Choose day-care, see waiting list" }] : []),
    ...(an("veranstaltungen") ? [{ href: "/veranstaltungen", icon: "calendar" as const, titel: de ? "Veranstaltungen" : "Events", text: de ? "Feste, Kurse, Ferienprogramm – mit Anmeldung" : "Festivals, courses, holiday programme" }] : []),
    ...(an("veranstaltungen") && tenant.vereine?.length ? [{ href: "/vereine", icon: "heart" as const, titel: de ? "Vereine" : "Clubs", text: de ? "Sport, Kultur, Musik, Soziales" : "Sports, culture, music, social" }] : []),
  ];
  const mitmachen: Dienst[] = [
    ...(an("beteiligung") ? [{ href: "/beteiligung", icon: "users" as const, titel: de ? "Mitmachen" : "Get involved", text: de ? "Umfragen und Ideen" : "Surveys and ideas" }] : []),
    ...(an("buergerhaushalt") ? [{ href: "/buergerhaushalt", icon: "euro" as const, titel: de ? "Bürgerhaushalt" : "Participatory budget", text: de ? "Mitentscheiden, wofür Geld ausgegeben wird" : "Decide how money is spent" }] : []),
    ...(an("ehrenamt") ? [{ href: "/ehrenamt", icon: "heart" as const, titel: de ? "Ehrenamt" : "Volunteering", text: de ? "Mit anpacken – hier wird Hilfe gesucht" : "Lend a hand" }] : []),
    ...(an("ratsinfo") && tenant.ratsinfo ? [{ href: "/ratsinfo", icon: "megaphone" as const, titel: de ? "Rat und Ausschüsse" : "Council", text: de ? "Sitzungen, Beschlüsse, Livestream" : "Meetings, decisions, livestream" }] : []),
  ];
  const lebenslagen: Dienst[] = an("lebenslagen")
    ? (tenant.lebenslagen ?? []).map((l) => ({ href: `/lebenslagen/${l.id}`, icon: "tasks" as const, titel: tx(l.titel, lang), text: tx(l.kurz, lang) }))
    : [];

  return (
    <Page titel={de ? "Alle Dienste" : "All services"} intro={de ? `Was Sie bei der ${tenant.art} ${tenant.name} online erledigen können.` : `What you can do online.`} breit>
      <Gruppe titel={de ? "Erledigen" : "Get things done"} dienste={erledigen} />
      <Gruppe titel={de ? "Im Alltag" : "Everyday"} dienste={alltag} />
      <Gruppe titel={de ? "Familie und Freizeit" : "Family and leisure"} dienste={familie} />
      <Gruppe titel={de ? "Mitmachen" : "Participate"} dienste={mitmachen} />
      <Gruppe titel={de ? "Lebenslagen" : "Life events"} dienste={lebenslagen} />
    </Page>
  );
}
