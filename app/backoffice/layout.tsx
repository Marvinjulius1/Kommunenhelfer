import type { Metadata } from "next";
import Link from "next/link";
import { AbmeldenButton } from "@/components/backoffice/Aktionen";
import { ThemeToggle } from "@/components/ThemeToggle";
import { aktuellerBenutzer } from "@/lib/backoffice/auth";
import { getTenant } from "@/lib/tenant";

export const metadata: Metadata = { title: "Backoffice", robots: { index: false, follow: false } };

export default async function BackofficeLayout({ children }: { children: React.ReactNode }) {
  const tenant = await getTenant();
  const b = await aktuellerBenutzer(tenant);
  return (
    <div className="flex flex-1 flex-col">
      <header className="border-b border-[var(--line)]">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-x-2 px-4 sm:h-16 sm:flex-nowrap sm:px-6">
          <Link href="/backoffice" className="flex h-14 shrink-0 items-center gap-2 sm:h-auto">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={tenant.wappen} alt="" width={120} height={140} className="h-8 w-auto" />
            <span className="text-[15px] font-medium">{tenant.name}</span>
            <span className="hidden text-[15px] text-subtle md:inline">· Backoffice</span>
          </Link>
          {b && (
            <nav aria-label="Backoffice" className="order-last -mx-2 flex w-[calc(100%+1rem)] items-center gap-1 overflow-x-auto pb-2 text-[14px] text-muted [scrollbar-width:none] sm:order-none sm:mx-0 sm:ml-auto sm:w-auto sm:pb-0">
              {[
                ["/backoffice", "Vorgänge"],
                ["/backoffice/wartezeit", "Wartezeit"],
                ["/backoffice/ausweise", "Ausweise"],
                ["/backoffice/fundbuero", "Fundbüro"],
                ["/backoffice/meldungen", "Meldungen"],
              ].map(([href, label]) => (
                <Link key={href} href={href} className="shrink-0 rounded-full px-3 py-1 hover:text-fg">
                  {label}
                </Link>
              ))}
            </nav>
          )}
          <div className="flex items-center gap-2 text-[14px] text-muted">
            {b && <span className="hidden lg:inline">{b.name}</span>}
            {b && <AbmeldenButton />}
            <ThemeToggle />
          </div>
        </div>
      </header>
      {b?.demo && (
        <p className="bg-[var(--line)] px-4 py-2 text-center text-[13px] text-muted">
          Demo-Zugang aktiv. Nur für Vorführungen mit Testdaten – in Produktion BACKOFFICE_DEMO entfernen.
        </p>
      )}
      <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-8 sm:px-6">{children}</div>
    </div>
  );
}
