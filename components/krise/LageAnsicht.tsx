/** Lage-Seite: was los ist, wen man anruft, wohin man geht, was man tun soll. Bewusst schlicht und schnell. */
import Link from "next/link";
import { Aktualisieren } from "@/components/krise/Aktualisieren";
import { Icon } from "@/components/ui/Icon";
import type { GemeindeConfig } from "@/config/types";
import type { KrisenRecord } from "@/lib/krise/service";
import type { Warnung } from "@/lib/warnungen/service";

const tel = (n: string) => `tel:${n.replace(/[^\d+]/g, "")}`;

export function LageAnsicht({ tenant, lage, amtlich, startseite, deutschFremd }: { tenant: GemeindeConfig; lage: KrisenRecord; amtlich: Warnung[]; startseite?: boolean; deutschFremd?: boolean }) {
  const fmt = new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short", timeZone: "Europe/Berlin" });
  const gefahr = lage.stufe === "gefahr";
  const stand = lage.meldungen[0]?.zeit ?? lage.geaendertAm ?? lage.seit!;
  return (
    <div lang={deutschFremd ? "de" : undefined} className={`mx-auto w-full max-w-3xl px-4 pb-16 sm:px-6 ${startseite ? "pt-16" : ""}`}>
      <Aktualisieren />
      {startseite && (
        <p className="mb-4 flex items-center gap-2 text-[15px] font-medium">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={tenant.wappen} alt="" width={120} height={140} className="h-8 w-auto" />
          {tenant.art} {tenant.name}
        </p>
      )}
      <section aria-labelledby="lage-titel" className={`rounded-[28px] p-6 sm:p-8 ${gefahr ? "bg-[#b42318] text-white" : "bg-[#fef0c7] text-[#3a2a00]"}`}>
        <p className="flex items-center gap-2 text-[13px] font-semibold uppercase tracking-[0.06em]">
          <Icon name="alert" className="size-4" />
          {gefahr ? "Gefahr" : "Warnung"} · Aktuelle Lage
        </p>
        <h1 id="lage-titel" className="mt-2 text-[32px] font-semibold leading-tight tracking-[-0.02em] sm:text-[40px]">
          {lage.titel}
        </h1>
        <p className="mt-3 whitespace-pre-wrap text-[17px] leading-relaxed">{lage.text}</p>
        <p className="mt-4 text-[13px] opacity-85">
          Stand: {fmt.format(new Date(stand))} · aktualisiert sich automatisch
        </p>
      </section>

      <section aria-labelledby="notruf" className="mt-6">
        <h2 id="notruf" className="sr-only">
          Telefonnummern
        </h2>
        <ul className="grid gap-3 sm:grid-cols-2">
          {lage.hotline && (
            <li className="sm:col-span-2">
              <a href={tel(lage.hotline)} className="pressable flex items-center gap-4 rounded-[20px] border-2 border-accent p-4">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-accent text-on-accent">
                  <Icon name="phone" className="size-5" />
                </span>
                <span>
                  <span className="block text-[13px] text-muted">Bürgertelefon zur Lage</span>
                  <span className="text-[22px] font-semibold tabular-nums">{lage.hotline}</span>
                </span>
              </a>
            </li>
          )}
          {lage.notrufe.map((n) => (
            <li key={n.nummer + n.label}>
              <a href={tel(n.nummer)} className="pressable flex items-center gap-4 rounded-[20px] border border-[var(--line)] bg-surface p-4">
                <span className="text-[24px] font-semibold tabular-nums">{n.nummer}</span>
                <span className="text-[14px] text-muted">{n.label}</span>
              </a>
            </li>
          ))}
        </ul>
      </section>

      {lage.meldungen.length > 0 && (
        <section aria-labelledby="verlauf" className="mt-10">
          <h2 id="verlauf" className="text-[22px] font-semibold tracking-[-0.015em]">
            Lagemeldungen
          </h2>
          <ol className="mt-4 space-y-4 border-s-2 border-[var(--line)] ps-5">
            {lage.meldungen.map((m) => (
              <li key={m.id}>
                <p className="text-[13px] text-subtle">{fmt.format(new Date(m.zeit))}</p>
                <p className="mt-0.5 whitespace-pre-wrap text-[16px] leading-relaxed">{m.text}</p>
              </li>
            ))}
          </ol>
        </section>
      )}

      {lage.anlaufstellen.length > 0 && (
        <section aria-labelledby="anlauf" className="mt-10">
          <h2 id="anlauf" className="text-[22px] font-semibold tracking-[-0.015em]">
            Anlaufstellen
          </h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {lage.anlaufstellen.map((a) => (
              <li key={a.name} className="rounded-[20px] border border-[var(--line)] bg-surface p-4">
                <p className="font-semibold">{a.name}</p>
                {a.adresse && (
                  <p className="mt-1 flex items-start gap-1.5 text-[14px] text-muted">
                    <Icon name="location" className="mt-0.5 size-4 shrink-0" />
                    {a.adresse}
                  </p>
                )}
                {a.info && <p className="mt-1 text-[14px]">{a.info}</p>}
              </li>
            ))}
          </ul>
        </section>
      )}

      {lage.tipps.length > 0 && (
        <section aria-labelledby="tipps" className="mt-10">
          <h2 id="tipps" className="text-[22px] font-semibold tracking-[-0.015em]">
            Was Sie jetzt tun sollten
          </h2>
          <ul className="mt-4 space-y-3">
            {lage.tipps.map((t) => (
              <li key={t} className="flex gap-3 text-[16px] leading-relaxed">
                <Icon name="check" className="mt-1 size-5 shrink-0 text-accent" />
                {t}
              </li>
            ))}
          </ul>
        </section>
      )}

      {amtlich.length > 0 && (
        <section aria-labelledby="amtlich" className="mt-10">
          <h2 id="amtlich" className="text-[22px] font-semibold tracking-[-0.015em]">
            Amtliche Warnungen
          </h2>
          <ul className="mt-4 space-y-3">
            {amtlich.map((w) => (
              <li key={w.id} className="rounded-[20px] border border-[var(--line)] p-4">
                <p className="font-semibold">{w.titel}</p>
                {w.text && <p className="mt-1 text-[14px] text-muted">{w.text}</p>}
              </li>
            ))}
          </ul>
          <p className="mt-2 text-[13px] text-subtle">Quelle: Modulares Warnsystem des Bundes (NINA)</p>
        </section>
      )}

      <p className="mt-12 flex flex-wrap gap-x-6 gap-y-2 text-[15px]">
        {startseite && (
          <Link href="/?portal=1" className="font-medium text-accent underline underline-offset-4">
            Weiter zum Bürgerportal
          </Link>
        )}
        <Link href="/aktuelles" className="text-accent underline underline-offset-4">
          Alle Meldungen
        </Link>
      </p>
    </div>
  );
}
