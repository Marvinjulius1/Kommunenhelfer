import type { Metadata } from "next";
import Link from "next/link";
import { AbmeldenButton } from "@/components/backoffice/Aktionen";
import { VerwaltungMenu } from "@/components/backoffice/VerwaltungMenu";
import { ThemeToggle } from "@/components/ThemeToggle";
import { aktuellerBenutzer, hatRolle } from "@/lib/backoffice/auth";
import type { GemeindeConfig } from "@/config/types";
import { aktiv } from "@/lib/funktionen";
import { getTenant } from "@/lib/tenant";

/** Navigation je nach Paket und Daten der Gemeinde */
function navigation(tenant: GemeindeConfig, betreiber: boolean) {
  const an = (f: Parameters<typeof aktiv>[1]) => aktiv(tenant, f);
  const haupt: [string, string, boolean][] = [
    ["/backoffice", "Vorgänge", true],
    ["/backoffice/wartezeit", "Wartezeit", an("warteschlange")],
    ["/backoffice/auslastung", "Auslastung", an("auslastung") && tenant.aemter.some((a) => a.termine)],
    ["/backoffice/ausweise", "Ausweise", an("ausweisStatus")],
    ["/backoffice/fundbuero", "Fundbüro", an("fundbuero")],
    ["/backoffice/meldungen", "Meldungen", true],
    ["/backoffice/beteiligung", "Beteiligung", an("beteiligung") || an("buergerhaushalt")],
  ];
  const verwaltung: [string, string, boolean][] = [
    ["/backoffice/krise", "Krisenmodus", an("krisenmodus")],
    ["/backoffice/briefwahl", "Briefwahl", an("briefwahl")],
    ["/backoffice/kita", "Kita-Plätze", an("kita") && !!tenant.kitas?.length],
    ["/backoffice/veranstaltungen", "Veranstaltungen & Ehrenamt", an("veranstaltungen") || an("ehrenamt")],
    ["/backoffice/parken", "Verwarnungsgeld", an("parken")],
    ["/backoffice/bericht", "Wirkungsbericht", an("wirkungsbericht")],
    ["/backoffice/statistik", "Statistik", true],
    ["/backoffice/formulare", "Formulare", an("formularBaukasten")],
    ["/backoffice/import", "Leistungen übernehmen", true],
    ["/backoffice/admin", "Portal anpassen", true],
    ["/backoffice/vertretung", "Vertretung", true],
    ["/backoffice/betreiber", "Betreiber: Gemeinden", betreiber],
  ];
  const nur = (l: [string, string, boolean][]) => l.filter((x) => x[2]).map(([h, t]) => [h, t] as [string, string]);
  return { haupt: nur(haupt), verwaltung: nur(verwaltung) };
}

export const metadata: Metadata = { title: "Backoffice", robots: { index: false, follow: false } };

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenant();
  const b = await aktuellerBenutzer(tenant);
  const nav = navigation(tenant, !!b && b.gemeinde === "*" && hatRolle(b, "admin"));
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-[var(--line)] print:hidden">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-2 px-4 sm:px-6 lg:h-16 lg:flex-nowrap">
          <Link href="/backoffice" className="flex h-14 shrink-0 items-center gap-2 lg:h-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tenant.wappen} alt="" width={120} height={140} className="h-8 w-auto" />
            <span className="text-[15px] font-medium">{tenant.name}</span>
            <span className="hidden text-[15px] text-subtle 2xl:inline">· Backoffice</span>
          </Link>
          {b && (
            <nav aria-label="Backoffice" className="order-last -mx-2 flex w-[calc(100%+1rem)] items-center gap-1 overflow-x-auto pb-2 text-[14px] text-muted [scrollbar-width:none] lg:order-none lg:mx-0 lg:ml-auto lg:w-auto lg:min-w-0 lg:pb-0">
              {nav.haupt.map(([href, label]) => (
                <Link key={href} href={href} className="shrink-0 rounded-full px-3 py-1 hover:text-fg">
                  {label}
                </Link>
              ))}
              {/* Auf kleinen Bildschirmen stehen die Verwaltungspunkte direkt in der wischbaren Leiste */}
              {nav.verwaltung.map(([href, label]) => (
                <Link key={href} href={href} className="shrink-0 rounded-full px-3 py-1 hover:text-fg lg:hidden">
                  {label}
                </Link>
              ))}
            </nav>
          )}
          {b && (
            <div className="hidden lg:block">
              <VerwaltungMenu eintraege={nav.verwaltung} />
            </div>
          )}
          <div className="flex shrink-0 items-center gap-2 text-[14px] text-muted">
            {b && <span className="hidden 2xl:inline">{b.name}</span>}
            {b && <AbmeldenButton />}
            <ThemeToggle />
          </div>
        </div>
      </header>
      {b?.demo && (
        <p className="bg-[var(--line)] px-4 py-2 text-center text-[13px] text-muted print:hidden">
          Demo-Zugang aktiv. Nur für Vorführungen mit Testdaten – in Produktion BACKOFFICE_DEMO entfernen.
        </p>
      )}
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
