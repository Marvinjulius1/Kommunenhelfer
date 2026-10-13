"use client";

/**
 * Monatskalender im Glas-Stil. Nur Tage mit freien Terminen sind wählbar.
 * Tastatur: Pfeiltasten bewegen den Fokus zwischen buchbaren Tagen.
 */
import { motion, AnimatePresence } from "framer-motion";
import { useMemo, useRef, useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { Icon } from "@/components/ui/Icon";
import { spring } from "@/lib/client/motion";

interface Props {
  verfuegbar: Map<string, number>; // Datum → Anzahl freier Termine
  gewaehlt?: string;
  onWaehle: (datum: string) => void;
}

const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

export function Calendar({ verfuegbar, gewaehlt, onWaehle }: Props) {
  const { lang } = useTenant();
  const locale = lang === "de" ? "de-DE" : "en-GB";
  const tage = [...verfuegbar.keys()].sort();
  const erster = tage[0] ? new Date(tage[0] + "T12:00:00") : new Date();
  const letzter = tage.at(-1) ? new Date(tage.at(-1)! + "T12:00:00") : new Date();
  const [monat, setMonat] = useState(() => new Date(erster.getFullYear(), erster.getMonth(), 1));
  const [richtung, setRichtung] = useState(0);
  const gridRef = useRef<HTMLDivElement>(null);

  const zellen = useMemo(() => {
    const start = new Date(monat);
    const versatz = (start.getDay() + 6) % 7; // Montag zuerst
    const anzahl = new Date(monat.getFullYear(), monat.getMonth() + 1, 0).getDate();
    return [...Array(versatz).fill(null), ...Array.from({ length: anzahl }, (_, i) => new Date(monat.getFullYear(), monat.getMonth(), i + 1))];
  }, [monat]);

  const kannZurueck = monat > new Date(erster.getFullYear(), erster.getMonth(), 1);
  const kannVor = new Date(monat.getFullYear(), monat.getMonth() + 1, 1) <= letzter;
  const wechsel = (n: number) => {
    setRichtung(n);
    setMonat(new Date(monat.getFullYear(), monat.getMonth() + n, 1));
  };

  const wochentage = Array.from({ length: 7 }, (_, i) =>
    new Intl.DateTimeFormat(locale, { weekday: "short" }).format(new Date(2024, 0, 1 + i)),
  );
  const heute = iso(new Date());

  const onKey = (e: React.KeyboardEvent) => {
    const schritte: Record<string, number> = { ArrowLeft: -1, ArrowRight: 1, ArrowUp: -7, ArrowDown: 7 };
    if (!(e.key in schritte)) return;
    e.preventDefault();
    const buttons = [...(gridRef.current?.querySelectorAll<HTMLButtonElement>("button[data-datum]") ?? [])];
    const idx = buttons.indexOf(document.activeElement as HTMLButtonElement);
    if (idx < 0) return;
    const ziel = new Date(buttons[idx].dataset.datum + "T12:00:00");
    ziel.setDate(ziel.getDate() + schritte[e.key]);
    // Nächsten buchbaren Tag in Richtung suchen
    const sortiert = e.key === "ArrowLeft" || e.key === "ArrowUp" ? [...buttons].reverse() : buttons;
    const next = sortiert.find((b) => (schritte[e.key] > 0 ? b.dataset.datum! >= iso(ziel) : b.dataset.datum! <= iso(ziel)));
    next?.focus();
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-[17px] font-semibold capitalize" aria-live="polite">
          {new Intl.DateTimeFormat(locale, { month: "long", year: "numeric" }).format(monat)}
        </h3>
        <div className="flex gap-1">
          <button type="button" onClick={() => wechsel(-1)} disabled={!kannZurueck} aria-label={lang === "de" ? "Vorheriger Monat" : "Previous month"} className="grid size-9 place-items-center rounded-full hover:bg-[var(--line)] disabled:opacity-30">
            <Icon name="chevronLeft" className="size-4" />
          </button>
          <button type="button" onClick={() => wechsel(1)} disabled={!kannVor} aria-label={lang === "de" ? "Nächster Monat" : "Next month"} className="grid size-9 place-items-center rounded-full hover:bg-[var(--line)] disabled:opacity-30">
            <Icon name="chevronRight" className="size-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[12px] font-medium uppercase tracking-wide text-subtle" aria-hidden="true">
        {wochentage.map((w) => (
          <div key={w} className="py-1">
            {w.replace(".", "")}
          </div>
        ))}
      </div>

      <AnimatePresence mode="popLayout" initial={false} custom={richtung}>
        <motion.div
          key={monat.toISOString()}
          ref={gridRef}
          onKeyDown={onKey}
          custom={richtung}
          initial={{ opacity: 0, x: richtung * 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: richtung * -20 }}
          transition={spring}
          className="mt-1 grid grid-cols-7 gap-1"
        >
          {zellen.map((d, i) => {
            if (!d) return <div key={`leer-${i}`} />;
            const key = iso(d);
            const frei = verfuegbar.get(key) ?? 0;
            const aktiv = key === gewaehlt;
            const label = new Intl.DateTimeFormat(locale, { weekday: "long", day: "numeric", month: "long" }).format(d);
            if (!frei)
              return (
                <div key={key} className={`grid aspect-square place-items-center rounded-full text-[15px] text-subtle/50 ${key === heute ? "font-semibold" : ""}`} aria-hidden="true">
                  {d.getDate()}
                </div>
              );
            return (
              <button
                key={key}
                type="button"
                data-datum={key}
                onClick={() => onWaehle(key)}
                aria-pressed={aktiv}
                aria-label={`${label}, ${frei} ${lang === "de" ? (frei === 1 ? "freier Termin" : "freie Termine") : "free slots"}`}
                className={`relative grid aspect-square place-items-center rounded-full text-[15px] font-medium transition-colors ${
                  aktiv ? "bg-accent text-on-accent" : "text-fg hover:bg-[color-mix(in_srgb,var(--accent)_10%,transparent)]"
                }`}
              >
                {d.getDate()}
                {!aktiv && <span className="absolute bottom-[18%] size-1 rounded-full bg-accent" aria-hidden="true" />}
              </button>
            );
          })}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
