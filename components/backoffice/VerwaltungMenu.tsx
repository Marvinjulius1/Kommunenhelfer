"use client";

/** Aufklappmenü „Verwaltung“ im Backoffice – hält die Hauptnavigation kurz. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";

export function VerwaltungMenu({ eintraege }: { eintraege: [string, string][] }) {
  const [offen, setOffen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const pfad = usePathname();
  useEffect(() => setOffen(false), [pfad]);
  useEffect(() => {
    if (!offen) return;
    const klick = (e: MouseEvent) => !ref.current?.contains(e.target as Node) && setOffen(false);
    const taste = (e: KeyboardEvent) => e.key === "Escape" && setOffen(false);
    document.addEventListener("mousedown", klick);
    document.addEventListener("keydown", taste);
    return () => {
      document.removeEventListener("mousedown", klick);
      document.removeEventListener("keydown", taste);
    };
  }, [offen]);
  const aktiv = eintraege.some(([href]) => pfad.startsWith(href));
  return (
    <div ref={ref} className="relative">
      <button type="button" aria-expanded={offen} aria-controls="bo-verwaltung" onClick={() => setOffen((o) => !o)} className={`flex items-center gap-1 rounded-full px-3 py-1 text-[14px] hover:text-fg ${aktiv ? "text-fg" : ""}`}>
        Verwaltung
        <Icon name="chevronDown" className={`size-3.5 transition-transform ${offen ? "rotate-180" : ""}`} />
      </button>
      {offen && (
        <ul id="bo-verwaltung" className="glass absolute right-0 top-full z-30 mt-2 w-52 rounded-[18px] p-2 text-[14px]">
          {eintraege.map(([href, label]) => (
            <li key={href}>
              <Link href={href} aria-current={pfad.startsWith(href) ? "page" : undefined} className="block rounded-[12px] px-3 py-2 hover:bg-[var(--line)] aria-[current=page]:font-medium">
                {label}
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
