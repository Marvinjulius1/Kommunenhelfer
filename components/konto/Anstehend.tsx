"use client";

/**
 * „Was steht bei mir an?“ – persönliche Hinweise im Konto-Dashboard.
 * Hinweise lassen sich ausblenden; Wiederkehrendes erscheint im nächsten Jahr neu.
 */
import { AnimatePresence, motion } from "framer-motion";
import Link from "next/link";
import { useState } from "react";
import { Glass } from "@/components/ui/Glass";
import { Icon, type IconName } from "@/components/ui/Icon";
import type { Hinweis } from "@/lib/konto/hinweise";
import { einblenden, uebergang } from "@/lib/motion";

const ICON: Record<Hinweis["art"], IconName> = { aufgabe: "alert", frist: "clock", termin: "calendar", info: "info" };

export function Anstehend({ start, haushaltLeer }: { start: Hinweis[]; haushaltLeer: boolean }) {
  const [liste, setListe] = useState(start);
  const [meldung, setMeldung] = useState<string | null>(null);

  const ausblenden = async (h: Hinweis) => {
    setListe((l) => l.filter((x) => x.id !== h.id));
    const r = await fetch("/api/konto/hinweise", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: h.id }) });
    setMeldung(r.ok ? `„${h.titel}“ ausgeblendet.` : "Das konnte nicht gespeichert werden.");
    if (!r.ok) setListe((l) => [...l, h]);
  };

  return (
    <section aria-labelledby="anstehend-titel" className="mt-10">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <h2 id="anstehend-titel" className="text-[20px] font-semibold tracking-tight">
          Was steht bei mir an?
        </h2>
        {liste.some((h) => h.datum) && (
          <a href="/api/konto/hinweise/ics" className="flex items-center gap-1 text-[14px] text-accent underline underline-offset-4">
            <Icon name="calendar" className="size-4" />
            In meinen Kalender
          </a>
        )}
      </div>
      {liste.length === 0 ? (
        <Glass className="mt-4 rounded-[24px] p-6 text-[15px] text-muted">
          Gerade steht nichts an. Wir melden uns, sobald es etwas zu tun gibt.
        </Glass>
      ) : (
        <ul className="mt-4 space-y-2">
          <AnimatePresence initial={false}>
            {liste.map((h) => (
              <motion.li key={h.id} layout variants={einblenden} initial="hidden" animate="show" exit={{ opacity: 0, height: 0, transition: uebergang.kurz }}>
                <Glass className="flex flex-wrap items-start gap-4 rounded-[24px] p-5 sm:flex-nowrap">
                  <span className={`grid size-9 shrink-0 place-items-center rounded-full ${h.wichtig ? "bg-fg text-bg" : "bg-[var(--line)]"}`}>
                    <Icon name={ICON[h.art]} className="size-4" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[16px] font-medium">{h.titel}</p>
                    {h.text && <p className="mt-1 text-[14px] leading-relaxed text-muted">{h.text}</p>}
                    {h.href && h.link && (
                      <Link href={h.href} className="mt-2 inline-flex items-center gap-1 text-[14px] font-medium text-accent underline underline-offset-4">
                        {h.link}
                        <Icon name="chevronRight" className="size-3.5" />
                      </Link>
                    )}
                  </div>
                  {h.ausblendbar && (
                    <button type="button" onClick={() => ausblenden(h)} className="pressable shrink-0 rounded-full px-3 py-2 text-[13px] text-muted hover:text-fg">
                      Erledigt
                      <span className="sr-only">: {h.titel}</span>
                    </button>
                  )}
                </Glass>
              </motion.li>
            ))}
          </AnimatePresence>
        </ul>
      )}
      {haushaltLeer && (
        <p className="mt-3 text-[14px] text-muted">
          Mehr passende Hinweise, z. B. zu Kita, Hundesteuer oder Reisepass:{" "}
          <Link href="/konto/haushalt" className="font-medium text-accent underline underline-offset-4">
            Mein Haushalt ergänzen
          </Link>
        </p>
      )}
      <p role="status" className="sr-only">
        {meldung}
      </p>
    </section>
  );
}
