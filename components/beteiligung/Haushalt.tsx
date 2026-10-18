"use client";

/** Budget auf Projekte verteilen – mit Live-Budgetanzeige. Nach dem Ende: Ergebnis. */
import Link from "next/link";
import { useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";

interface Projekt {
  id: string;
  titel: string;
  text: string;
  kostenEuro: number;
  ortsteil?: string;
}
interface Sicht {
  id: string;
  titel: string;
  text: string;
  budgetEuro: number;
  bis: string;
  offen: boolean;
  nurOnlineAusweis: boolean;
  projekte: Projekt[];
  teilnehmer: number;
  teilgenommen: boolean;
  ergebnis?: (Projekt & { stimmen: number; finanziert: boolean })[];
}

const euro = (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);

export function Haushalt({ start }: { start: Sicht }) {
  const { konto } = useTenant();
  const [h, setH] = useState(start);
  const [wahl, setWahl] = useState<string[]>([]);
  const [meldung, setMeldung] = useState<{ ok: boolean; text: string } | null>(null);
  const summe = wahl.reduce((s, id) => s + (h.projekte.find((p) => p.id === id)?.kostenEuro ?? 0), 0);
  const rest = h.budgetEuro - summe;

  const abgeben = async () => {
    const r = await fetch("/api/beteiligung/haushalt", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: h.id, auswahl: wahl }) });
    const d = await r.json().catch(() => ({}));
    if (r.ok) {
      setH({ ...h, teilgenommen: true, teilnehmer: h.teilnehmer + 1 });
      setMeldung({ ok: true, text: "Danke – Ihre Stimme ist gezählt." });
    } else setMeldung({ ok: false, text: d.fehler === "ausweis" ? "Für diesen Bürgerhaushalt brauchen Sie ein mit dem Online-Ausweis bestätigtes Konto." : d.fehler === "schon" ? "Sie haben bereits teilgenommen." : "Das hat nicht geklappt." });
  };

  return (
    <section aria-labelledby={`hh-${h.id}`}>
      <h2 id={`hh-${h.id}`} className="text-[22px] font-semibold tracking-tight">
        {h.titel}
      </h2>
      {h.text && <p className="mt-2 text-[16px] leading-relaxed text-muted">{h.text}</p>}
      <p className="mt-2 text-[14px] text-subtle">
        Budget {euro(h.budgetEuro)} · {h.teilnehmer === 1 ? "1 Teilnahme" : `${h.teilnehmer} Teilnahmen`} · {h.offen ? `bis ${new Intl.DateTimeFormat("de-DE", { dateStyle: "long" }).format(new Date(h.bis))}` : "beendet"}
      </p>

      {h.ergebnis ? (
        <ol className="mt-6 space-y-2">
          {h.ergebnis.map((p, i) => (
            <li key={p.id}>
              <Glass className="flex items-start gap-4 rounded-[20px] p-5">
                <span className="w-6 shrink-0 text-[15px] font-semibold tabular-nums text-subtle">{i + 1}.</span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[16px] font-medium">{p.titel}</span>
                  <span className="text-[13px] text-muted">
                    {euro(p.kostenEuro)} · {p.stimmen} Stimmen
                  </span>
                </span>
                {p.finanziert && (
                  <span className="shrink-0 rounded-full bg-[color-mix(in_srgb,var(--success)_14%,transparent)] px-3 py-1 text-[12px] font-medium text-success">Wird umgesetzt</span>
                )}
              </Glass>
            </li>
          ))}
        </ol>
      ) : (
        <>
          <Glass className="sticky top-2 z-10 mt-6 rounded-[20px] px-5 py-4">
            <div className="flex items-baseline justify-between gap-4 text-[14px]">
              <span>Verteilt: {euro(summe)}</span>
              <span className={rest < 0 ? "font-medium text-danger" : "text-muted"}>noch {euro(Math.max(0, rest))} frei</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-[var(--line)]" role="meter" aria-valuemin={0} aria-valuemax={h.budgetEuro} aria-valuenow={summe} aria-label="Verteiltes Budget">
              <div className="h-2 rounded-full bg-accent transition-[width]" style={{ width: `${Math.min(100, (summe / h.budgetEuro) * 100)}%` }} />
            </div>
          </Glass>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {h.projekte.map((p) => {
              const an = wahl.includes(p.id);
              const zuTeuer = !an && p.kostenEuro > rest;
              return (
                <li key={p.id}>
                  <label className={`glass flex h-full cursor-pointer items-start gap-3 rounded-[20px] p-5 ${an ? "ring-2 ring-accent" : ""} ${zuTeuer || h.teilgenommen ? "opacity-60" : ""}`}>
                    <input type="checkbox" className="checkbox mt-1" checked={an} disabled={zuTeuer || h.teilgenommen || !konto} onChange={() => setWahl((w) => (an ? w.filter((x) => x !== p.id) : [...w, p.id]))} />
                    <span className="min-w-0">
                      <span className="block text-[16px] font-medium">{p.titel}</span>
                      <span className="mt-1 block text-[14px] font-semibold tabular-nums">{euro(p.kostenEuro)}</span>
                      {p.text && <span className="mt-1 block text-[14px] leading-snug text-muted">{p.text}</span>}
                      {p.ortsteil && <span className="mt-1 block text-[12px] text-subtle">{p.ortsteil}</span>}
                      {zuTeuer && <span className="mt-1 block text-[12px] text-subtle">passt nicht mehr ins Budget</span>}
                    </span>
                  </label>
                </li>
              );
            })}
          </ul>
          <div className="mt-6">
            {!konto ? (
              <p className="text-[15px] text-muted">
                Zum Mitentscheiden brauchen Sie ein Bürgerkonto – eine Teilnahme pro Person.{" "}
                <Link href="/konto/anmelden?weiter=/buergerhaushalt" className="font-medium text-accent underline underline-offset-4">
                  Anmelden
                </Link>
              </p>
            ) : h.teilgenommen ? (
              <p className="flex items-center gap-2 text-[15px] text-success">
                <Icon name="check" className="size-4" /> Sie haben teilgenommen. Das Ergebnis erscheint nach dem Ende.
              </p>
            ) : (
              <Button onClick={abgeben} disabled={!wahl.length || rest < 0}>
                Stimme abgeben ({wahl.length === 1 ? "1 Projekt" : `${wahl.length} Projekte`})
              </Button>
            )}
            <p role={meldung?.ok === false ? "alert" : "status"} className={`mt-2 text-[14px] ${meldung?.ok === false ? "text-danger" : "text-success"}`}>
              {meldung?.text}
            </p>
            <p className="mt-2 text-[13px] text-subtle">Anonym: Gespeichert werden nur die Summen je Projekt. Wer welches Projekt gewählt hat, lässt sich nicht nachvollziehen.</p>
          </div>
        </>
      )}
    </section>
  );
}
