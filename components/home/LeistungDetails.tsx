"use client";

/**
 * Zeigt Unterlagen, Gebühren, Ablauf und Fristen einer Leistung –
 * ausschließlich aus der Gemeinde-Konfiguration (nie vom Sprachmodell).
 */
import type { Leistung } from "@/config/types";
import { useTenant } from "@/components/TenantProvider";
import { Icon, type IconName } from "@/components/ui/Icon";
import { formatEuro, tx } from "@/lib/i18n";

function Abschnitt({ icon, titel, children }: { icon: IconName; titel: string; children: React.ReactNode }) {
  return (
    <section className="py-4 first:pt-0 last:pb-0">
      <h2 className="mb-2 flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.06em] text-subtle">
        <Icon name={icon} className="size-4" />
        {titel}
      </h2>
      {children}
    </section>
  );
}

export function LeistungDetails({ leistung, kompakt }: { leistung: Leistung; kompakt?: boolean }) {
  const { t, lang } = useTenant();
  return (
    <div className="divide-y divide-[var(--line)] text-[15px] leading-relaxed">
      {leistung.unterlagen.length > 0 && (
        <Abschnitt icon="doc" titel={t.unterlagen}>
          <ul className="prose-calm">
            {leistung.unterlagen.map((u, i) => (
              <li key={i}>{tx(u, lang)}</li>
            ))}
          </ul>
        </Abschnitt>
      )}
      {leistung.gebuehren.length > 0 && (
        <Abschnitt icon="euro" titel={t.gebuehren}>
          <dl className="space-y-1.5">
            {leistung.gebuehren.map((g, i) => (
              <div key={i} className="flex items-baseline justify-between gap-4">
                <dt className="text-muted">
                  {tx(g.bezeichnung, lang)}
                  {g.hinweis && <span className="block text-[13px] text-subtle">{tx(g.hinweis, lang)}</span>}
                </dt>
                <dd className="max-w-[45%] shrink-0 text-end font-medium tabular-nums">
                  {g.betrag === null ? t.kostenfrei : typeof g.betrag === "number" ? formatEuro(g.betrag, lang) : g.betrag}
                </dd>
              </div>
            ))}
          </dl>
        </Abschnitt>
      )}
      {!kompakt && leistung.ablauf.length > 0 && (
        <Abschnitt icon="list" titel={t.ablauf}>
          <ol className="prose-calm">
            {leistung.ablauf.map((s, i) => (
              <li key={i}>{tx(s, lang)}</li>
            ))}
          </ol>
        </Abschnitt>
      )}
      {leistung.fristen && leistung.fristen.length > 0 && (
        <Abschnitt icon="clock" titel={t.fristen}>
          <ul className="prose-calm">
            {leistung.fristen.map((f, i) => (
              <li key={i}>{tx(f, lang)}</li>
            ))}
          </ul>
        </Abschnitt>
      )}
    </div>
  );
}
