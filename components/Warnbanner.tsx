"use client";

/** Banner für aktive Warnungen – auf allen Bürgerseiten, nicht im Backoffice. */
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import { Icon } from "@/components/ui/Icon";

export function Warnbanner({ warnungen }: { warnungen: { id: string; stufe: "warnung" | "gefahr"; titel: string; quelle: string }[] }) {
  const pfad = usePathname();
  const ref = useRef<HTMLDivElement>(null);
  // Höhe als CSS-Variable – die schwebende Kopfzeile der Startseite rückt darunter
  useEffect(() => {
    const el = ref.current;
    const root = document.documentElement;
    if (!el) {
      root.style.removeProperty("--warnbanner");
      return;
    }
    const ro = new ResizeObserver(() => root.style.setProperty("--warnbanner", `${el.offsetHeight}px`));
    ro.observe(el);
    return () => {
      ro.disconnect();
      root.style.removeProperty("--warnbanner");
    };
  });
  if (!warnungen.length || pfad.startsWith("/backoffice") || pfad.startsWith("/wartezeit/anzeige")) return null;
  // Auf der Lage-Seite selbst steht die Lage schon groß
  if (warnungen[0].quelle === "krise" && (pfad === "/lage" || pfad === "/")) return null;
  const gefahr = warnungen.some((w) => w.stufe === "gefahr");
  const erste = warnungen[0];
  return (
    <div ref={ref} role="region" aria-label="Warnungen" className={gefahr ? "bg-[#b42318] text-white" : "bg-[#fef0c7] text-[#3a2a00]"}>
      <Link href={erste.quelle === "krise" ? "/lage" : "/aktuelles"} className="mx-auto flex max-w-5xl items-start gap-3 px-4 py-2.5 text-[14px] sm:px-6">
        <Icon name="alert" className="mt-0.5 size-4 shrink-0" />
        <span className="min-w-0 flex-1">
          <span className="font-semibold">{gefahr ? "Warnung: " : "Hinweis: "}</span>
          {erste.titel}
          {warnungen.length > 1 && <span className="opacity-80"> · und {warnungen.length - 1} weitere</span>}
          {erste.quelle === "nina" && <span className="opacity-80"> (amtliche Warnung)</span>}
          {erste.quelle === "krise" && <span className="opacity-80"> – Notrufe, Anlaufstellen und Hinweise</span>}
        </span>
        <span className="shrink-0 underline underline-offset-2">Mehr</span>
      </Link>
    </div>
  );
}
