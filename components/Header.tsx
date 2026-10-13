"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import type { Sprache } from "@/config/types";
import { ladeAnliegen, onAnliegenChange } from "@/lib/client/anliegen";
import { spring } from "@/lib/client/motion";
import { ThemeToggle } from "./ThemeToggle";
import { useTenant } from "./TenantProvider";
import { Icon } from "./ui/Icon";

const SPRACHNAMEN: Record<Sprache, string> = { de: "Deutsch", en: "English" };

export function Header() {
  const { tenant, t, lang } = useTenant();
  const pathname = usePathname();
  const router = useRouter();
  const [offen, setOffen] = useState(false);
  const [sprachMenue, setSprachMenue] = useState(false);
  const [hatAnliegen, setHatAnliegen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const update = () => setHatAnliegen(ladeAnliegen().length > 0);
    update();
    return onAnliegenChange(update);
  }, []);

  useEffect(() => {
    setOffen(false);
    setSprachMenue(false);
  }, [pathname]);

  // Escape schließt Menüs; Klick außerhalb ebenso.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && (setOffen(false), setSprachMenue(false));
    const onClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setSprachMenue(false);
    };
    document.addEventListener("keydown", onKey);
    document.addEventListener("click", onClick);
    return () => {
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("click", onClick);
    };
  }, []);

  const spracheWaehlen = (l: Sprache) => {
    document.cookie = `lang=${l}; path=/; max-age=31536000; samesite=lax`;
    setSprachMenue(false);
    router.refresh();
  };

  const links = [
    { href: "/termine", label: t.menuTermine },
    ...(hatAnliegen ? [{ href: "/meine-anliegen", label: t.menuAnliegen }] : []),
    { href: "/hilfe", label: t.menuHilfe },
    { href: "/kontakt", label: t.menuKontakt },
  ];
  const istStart = pathname === "/";

  return (
    <header className="relative z-30">
      <a href="#inhalt" className="sr-only-focusable glass glass-strong fixed left-4 top-4 z-50 rounded-full px-4 py-2 text-sm font-medium">
        {t.hauptinhalt}
      </a>
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:h-20 sm:px-6">
        <div className="min-w-0">
          <AnimatePresence initial={false}>
            {!istStart && (
              <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} transition={spring}>
                <Link href="/" className="flex items-center gap-2.5 rounded-xl py-1 pr-2">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={tenant.wappen} alt="" className="h-8 w-auto" />
                  <span className="truncate text-[15px] font-semibold tracking-[-0.01em]">{tenant.name}</span>
                  <span className="sr-only">– {t.startseite}</span>
                </Link>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <nav aria-label="Hauptmenü" className="flex items-center gap-1.5 sm:gap-2">
          <ul className="hidden items-center gap-1 sm:flex">
            {links.map((l) => (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={pathname.startsWith(l.href) ? "page" : undefined}
                  className="rounded-full px-3.5 py-2 text-[14px] text-muted transition-colors hover:text-fg aria-[current=page]:text-fg aria-[current=page]:font-medium"
                >
                  {l.label}
                </Link>
              </li>
            ))}
          </ul>

          {tenant.sprachen.length > 1 && (
            <div className="relative" ref={menuRef}>
              <button
                type="button"
                onClick={() => setSprachMenue((v) => !v)}
                aria-expanded={sprachMenue}
                aria-haspopup="true"
                aria-label={`${t.menuSprache}: ${SPRACHNAMEN[lang]}`}
                className="glass glass-interactive flex h-10 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium uppercase tracking-wide"
              >
                <Icon name="globe" className="size-4" />
                {lang}
              </button>
              <AnimatePresence>
                {sprachMenue && (
                  <motion.ul
                    initial={{ opacity: 0, scale: 0.96, y: -4 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.97, y: -2 }}
                    transition={spring}
                    className="glass glass-strong absolute right-0 top-12 min-w-40 origin-top-right rounded-2xl p-1.5"
                  >
                    {tenant.sprachen.map((l) => (
                      <li key={l}>
                        <button
                          type="button"
                          lang={l}
                          onClick={() => spracheWaehlen(l)}
                          aria-current={l === lang ? "true" : undefined}
                          className="flex w-full items-center justify-between gap-4 rounded-xl px-3 py-2.5 text-left text-[15px] hover:bg-[var(--line)]"
                        >
                          {SPRACHNAMEN[l]}
                          {l === lang && <Icon name="check" className="size-4 text-accent" />}
                        </button>
                      </li>
                    ))}
                  </motion.ul>
                )}
              </AnimatePresence>
            </div>
          )}

          <ThemeToggle />

          <button
            type="button"
            className="glass glass-interactive grid size-10 place-items-center rounded-full sm:hidden"
            aria-expanded={offen}
            aria-controls="mobile-menu"
            aria-label={offen ? t.menuSchliessen : t.menuOeffnen}
            onClick={() => setOffen((v) => !v)}
          >
            <Icon name={offen ? "close" : "menu"} className="size-[18px]" />
          </button>
        </nav>
      </div>

      <AnimatePresence>
        {offen && (
          <motion.div
            id="mobile-menu"
            initial={{ opacity: 0, y: -8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={spring}
            className="glass glass-strong absolute inset-x-3 top-16 rounded-3xl p-2 sm:hidden"
          >
            <ul>
              {links.map((l) => (
                <li key={l.href}>
                  <Link href={l.href} className="flex items-center justify-between rounded-2xl px-4 py-3.5 text-[17px]">
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
