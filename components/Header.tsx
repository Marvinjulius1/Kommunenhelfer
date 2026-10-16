"use client";

/**
 * Kopfzeile.
 *  - Startseite: nur ein kleiner, leiser Hell/Dunkel-Schalter in der Ecke.
 *  - Unterseiten (Abläufe): Wappen als Rückweg zur Startseite + leises Menü.
 *  - Backoffice: eigene Kopfzeile (hier nichts).
 */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useState } from "react";
import { ladeAnliegen, onAnliegenChange } from "@/lib/client/anliegen";
import { aktiv } from "@/lib/funktionen";
import { feder } from "@/lib/motion";
import { ThemeToggle } from "./ThemeToggle";
import { useTenant } from "./TenantProvider";
import { Icon } from "./ui/Icon";

/** Kleiner Zugang zum Bürgerkonto: Person-Icon bzw. Initialen, wenn angemeldet. */
function KontoKnopf({ className = "" }: { className?: string }) {
  const { konto, lang } = useTenant();
  const label = konto ? (lang === "de" ? "Mein Konto" : "My account") : lang === "de" ? "Anmelden" : "Sign in";
  return (
    <Link href={konto ? "/konto" : "/konto/anmelden"} aria-label={label} title={label} className={`pressable grid size-10 place-items-center rounded-full text-subtle hover:text-fg ${className}`}>
      {konto?.vorname ? (
        <span className="grid size-7 place-items-center rounded-full bg-[var(--line)] text-[12px] font-semibold text-fg" aria-hidden="true">
          {(konto.vorname[0] + (konto.nachname[0] ?? "")).toUpperCase()}
        </span>
      ) : (
        <Icon name="user" className="size-[18px]" />
      )}
    </Link>
  );
}

export function Header() {
  const { tenant, t } = useTenant();
  const kontoAktiv = aktiv(tenant, "konto");
  const pathname = usePathname();
  const [offen, setOffen] = useState(false);
  const [hatAnliegen, setHatAnliegen] = useState(false);

  useEffect(() => {
    const update = () => setHatAnliegen(ladeAnliegen().length > 0);
    update();
    return onAnliegenChange(update);
  }, []);

  useEffect(() => setOffen(false), [pathname]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOffen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  if (pathname.startsWith("/backoffice") || pathname.startsWith("/wartezeit/anzeige")) return null;

  const skip = (
    <a href="#inhalt" className="sr-only-focusable glass fixed left-4 top-4 z-50 rounded-full px-4 py-2 text-sm font-medium">
      {t.hauptinhalt}
    </a>
  );

  if (pathname === "/") {
    return (
      <header className="pointer-events-none fixed right-0 top-0 z-30 flex gap-1 p-2 pt-[max(8px,env(safe-area-inset-top))] pr-[max(8px,env(safe-area-inset-right))]">
        {skip}
        {kontoAktiv && <KontoKnopf className="pointer-events-auto opacity-60 hover:opacity-100 focus-visible:opacity-100" />}
        <ThemeToggle className="pointer-events-auto opacity-60 hover:opacity-100 focus-visible:opacity-100" />
      </header>
    );
  }

  const links = [
    { href: "/dienste", label: t.menuDienste },
    { href: "/termine", label: t.menuTermine },
    ...(hatAnliegen ? [{ href: "/meine-anliegen", label: t.menuAnliegen }] : []),
    { href: "/hilfe", label: t.menuHilfe },
    { href: "/kontakt", label: t.menuKontakt },
  ];

  return (
    <header className="relative z-30 pt-[env(safe-area-inset-top)]">
      {skip}
      <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-4 sm:px-6">
        <Link href="/" className="flex min-w-0 items-center gap-2 rounded-lg py-1 pr-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tenant.wappen} alt="" width={120} height={140} className="h-8 w-auto" />
          <span className="truncate text-[15px] font-medium tracking-[-0.01em]">{tenant.name}</span>
          <span className="sr-only">– {t.startseite}</span>
        </Link>

        <nav aria-label="Hauptmenü" className="flex items-center gap-1">
          <ul className="hidden items-center sm:flex">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={pathname.startsWith(l.href) ? "page" : undefined}
                  className="rounded-full px-4 py-2 text-[14px] text-muted hover:text-fg aria-[current=page]:text-fg"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>
          {kontoAktiv && <KontoKnopf />}
          <ThemeToggle />
          <button
            type="button"
            className="pressable grid size-10 place-items-center rounded-full text-muted sm:hidden"
            aria-expanded={offen}
            aria-controls="mobile-menu"
            aria-label={offen ? t.menuSchliessen : t.menuOeffnen}
            onClick={() => setOffen((v) => !v)}
          >
            <Icon name={offen ? "close" : "menu"} className="size-5" />
          </button>
        </nav>
      </div>

      <AnimatePresence>
        {offen && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={feder.klein}
            className="glass absolute inset-x-4 top-16 rounded-[24px] p-2 sm:hidden"
          >
            <ul>
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="flex items-center justify-between rounded-[16px] px-4 py-4 text-[17px]">
                    {l.label}
                    <Icon name="chevronRight" className="size-4 text-subtle" />
                  </Link>
                </li>
              ))}
            </ul>
          </motion.div>
        )}
      </AnimatePresence>
    </header>
  );
}
