import type { Metadata } from "next";
import Link from "next/link";
import { Icon, type IconName } from "@/components/ui/Icon";
import { Page } from "@/components/ui/Page";
import { aktiv } from "@/lib/funktionen";
import { tx } from "@/lib/i18n";
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
  const de = lang === "de";
  const an = (f: Parameters<typeof aktiv>[1]) => aktiv(tenant, f);

  const erledigen: Dienst[] = [
    { href: "/leistungen", icon: "doc", titel: de ? "Anträge online" : "Online applications", text: de ? "Alle Leistungen von A bis Z" : "All services from A to Z" },
    { href: "/termine", icon: "calendar", titel: de ? "Termin buchen" : "Book an appointment", text: de ? "Im Rathaus – ohne Wartezeit" : "At the town hall – no waiting" },
    { href: "/meine-anliegen", icon: "search", titel: de ? "Meine Anliegen" : "My requests", text: de ? "Stand, Rückfragen, Bescheide" : "Status, questions, decisions" },
    ...(an("konto") ? [{ href: "/konto", icon: "user" as const, titel: de ? "Bürgerkonto" : "Citizen account", text: de ? "Postfach, Zahlungen, Dokumentensafe" : "Inbox, payments, document safe" }] : []),
  ];
  const alltag: Dienst[] = [
    ...(an("abfall") && tenant.abfall ? [{ href: "/abfall", icon: "leaf" as const, titel: de ? "Abfallkalender" : "Waste calendar", text: de ? "Abfuhrtermine und Erinnerung" : "Collection dates and reminders" }] : []),
    ...(an("maengelmelder") && tenant.maengel ? [{ href: "/maengel/melden", icon: "pin" as const, titel: de ? "Mangel melden" : "Report an issue", text: de ? "Schlagloch, Laterne, wilder Müll" : "Potholes, street lights, dumping" }] : []),
    { href: "/aktuelles", icon: "megaphone", titel: de ? "Aktuelles" : "News", text: de ? "Sperrungen und Hinweise" : "Closures and notices" },
  ];
  const lebenslagen: Dienst[] = an("lebenslagen")
    ? (tenant.lebenslagen ?? []).map((l) => ({ href: `/lebenslagen/${l.id}`, icon: "tasks" as const, titel: tx(l.titel, lang), text: tx(l.kurz, lang) }))
    : [];

  return (
    <Page titel={de ? "Alle Dienste" : "All services"} intro={de ? `Was Sie bei der ${tenant.art} ${tenant.name} online erledigen können.` : `What you can do online.`} breit>
      <Gruppe titel={de ? "Erledigen" : "Get things done"} dienste={erledigen} />
      <Gruppe titel={de ? "Im Alltag" : "Everyday"} dienste={alltag} />
      <Gruppe titel={de ? "Lebenslagen" : "Life events"} dienste={lebenslagen} />
    </Page>
  );
}
