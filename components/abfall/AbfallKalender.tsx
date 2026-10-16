"use client";

/**
 * Abfallkalender: Straße suchen → Bezirk → nächste Abfuhren.
 * Die Termine werden im Browser aus der Gemeinde-Config berechnet –
 * die eingegebene Straße verlässt das Gerät nicht.
 */
import { motion } from "framer-motion";
import { useEffect, useId, useMemo, useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { abfuhren, findeBezirk, sucheStrasse, type Abfuhr } from "@/lib/abfall/kalender";
import { plusTage } from "@/lib/feiertage";
import { pushAbonnieren } from "@/lib/client/push";
import { aktiv } from "@/lib/funktionen";
import { tx } from "@/lib/i18n";
import { einblenden, gestaffelt } from "@/lib/motion";

const MERKER = "abfall-bezirk.v1";
// Tonnenfarben nur als kleiner Punkt – die Bedeutung steht immer auch als Text daneben.
const FARBE: Record<string, string> = { rest: "#6b7280", bio: "#8a5a2b", papier: "#2563eb", gelb: "#d4a50f" };

export function AbfallKalender({ start }: { start: { bezirk?: string; erinnerung: boolean } | null }) {
  const { tenant, lang, konto } = useTenant();
  const de = lang === "de";
  const cfg = tenant.abfall!;
  const listId = useId();
  const [eingabe, setEingabe] = useState("");
  const [bezirkId, setBezirkId] = useState<string | undefined>(start?.bezirk);
  const [aus, setAus] = useState<Set<string>>(new Set());
  const [erinnerung, setErinnerung] = useState(start?.erinnerung ?? false);
  const [meldung, setMeldung] = useState<string | null>(null);

  useEffect(() => {
    if (start?.bezirk) return;
    try {
      const m = localStorage.getItem(MERKER);
      if (m && findeBezirk(tenant, m)) setBezirkId(m);
    } catch {}
  }, [start?.bezirk, tenant]);

  const vorschlaege = useMemo(() => sucheStrasse(cfg, eingabe), [cfg, eingabe]);
  const bezirk = findeBezirk(tenant, bezirkId);
  const heute = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
  const liste = useMemo(() => (bezirk ? abfuhren(cfg, bezirk, heute, plusTage(heute, 56)).filter((a) => !aus.has(a.art)) : []), [cfg, bezirk, heute, aus]);
  const tage = useMemo(() => {
    const m = new Map<string, Abfuhr[]>();
    for (const a of liste) m.set(a.datum, [...(m.get(a.datum) ?? []), a]);
    return [...m.entries()];
  }, [liste]);

  const label = (art: string) => tx(cfg.arten.find((a) => a.id === art)?.label ?? art, lang);
  const relativ = (d: string) => {
    if (d === heute) return de ? "Heute" : "Today";
    if (d === plusTage(heute, 1)) return de ? "Morgen" : "Tomorrow";
    return new Intl.DateTimeFormat(de ? "de-DE" : "en-GB", { weekday: "long", day: "numeric", month: "long", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));
  };

  const waehle = async (id: string) => {
    setBezirkId(id);
    setEingabe("");
    setMeldung(null);
    try {
      localStorage.setItem(MERKER, id);
    } catch {}
    if (konto) await fetch("/api/konto/einstellungen", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ abfallBezirk: id }) });
  };

  const erinnern = async () => {
    if (!bezirk) return;
    setMeldung(null);
    if (konto) {
      const r = await pushAbonnieren(["konto", "meldungen", "abfall"], { abfallBezirk: bezirk.id });
      await fetch("/api/konto/einstellungen", {
        method: "PUT",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ abfallBezirk: bezirk.id, abfallErinnerung: true, ...(r === "ok" ? { pushBenachrichtigung: true } : {}) }),
      });
      setErinnerung(true);
      setMeldung(r === "ok" ? (de ? "Wir erinnern Sie am Vorabend." : "We will remind you the evening before.") : de ? "Gespeichert. Für Erinnerungen bitte Benachrichtigungen erlauben." : "Saved. Please allow notifications.");
      return;
    }
    const r = await pushAbonnieren(["abfall"], { abfallBezirk: bezirk.id });
    if (r === "ok") setErinnerung(true);
    setMeldung(
      r === "ok"
        ? de
          ? "Wir erinnern Sie am Vorabend."
          : "We will remind you the evening before."
        : r === "abgelehnt"
          ? de
            ? "Bitte erlauben Sie Benachrichtigungen in Ihrem Browser."
            : "Please allow notifications in your browser."
          : de
            ? "Erinnerungen sind auf diesem Gerät nicht möglich. Nutzen Sie die Kalenderdatei."
            : "Reminders are not available on this device. Use the calendar file.",
    );
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <label htmlFor="abfall-strasse" className="text-[14px] font-medium">
          {de ? "Ihre Straße" : "Your street"}
        </label>
        <input
          id="abfall-strasse"
          className="field-input mt-1"
          value={eingabe}
          onChange={(e) => setEingabe(e.target.value)}
          placeholder={bezirk ? bezirk.name : de ? "z. B. Gartenweg" : "e.g. Gartenweg"}
          autoComplete="off"
          role="combobox"
          aria-expanded={vorschlaege.length > 0}
          aria-controls={listId}
          aria-autocomplete="list"
        />
        {eingabe.length >= 2 && (
          <ul id={listId} role="listbox" className="glass absolute inset-x-0 top-full z-10 mt-2 rounded-[20px] p-2">
            {vorschlaege.length ? (
              vorschlaege.map((v) => (
                <li key={v.strasse} role="option" aria-selected={false}>
                  <button type="button" onClick={() => waehle(v.bezirkId)} className="flex w-full items-center justify-between gap-4 rounded-[14px] px-4 py-3 text-left text-[15px] hover:bg-line">
                    {v.strasse}
                    <span className="text-[13px] text-subtle">{cfg.bezirke.find((b) => b.id === v.bezirkId)?.name}</span>
                  </button>
                </li>
              ))
            ) : (
              <li className="px-4 py-3 text-[14px] text-muted">{de ? "Keine Straße gefunden." : "No street found."}</li>
            )}
          </ul>
        )}
      </div>

      {bezirk && (
        <>
          <div className="flex flex-wrap gap-2" role="group" aria-label={de ? "Abfallarten" : "Waste types"}>
            {cfg.arten.map((a) => {
              const an = !aus.has(a.id);
              return (
                <button
                  key={a.id}
                  type="button"
                  aria-pressed={an}
                  onClick={() => setAus((s) => (s.has(a.id) ? new Set([...s].filter((x) => x !== a.id)) : new Set([...s, a.id])))}
                  className={`pressable flex items-center gap-2 rounded-full border px-4 py-2 text-[14px] ${an ? "border-[var(--line)] bg-surface" : "border-transparent text-subtle line-through"}`}
                >
                  <span className="size-2.5 rounded-full" style={{ background: FARBE[a.id] ?? "currentColor" }} aria-hidden="true" />
                  {tx(a.label, lang)}
                </button>
              );
            })}
          </div>

          <motion.ul className="space-y-3" key={bezirk.id} initial="hidden" animate="show" variants={gestaffelt(0.04)}>
              {tage.map(([datum, arten], i) => (
                <motion.li key={datum} variants={einblenden}>
                  <Glass className="rounded-[24px] p-6">
                    <p className={i === 0 ? "text-[13px] font-medium uppercase tracking-wide text-subtle" : "sr-only"}>{de ? "Nächste Abfuhr" : "Next collection"}</p>
                    <p className={i === 0 ? "mt-1 text-[22px] font-semibold tracking-tight" : "text-[16px] font-semibold"}>{relativ(datum)}</p>
                    <ul className="mt-2 space-y-1">
                      {arten.map((a) => (
                        <li key={a.art} className="flex items-center gap-3 text-[15px]">
                          <span className="size-2.5 rounded-full" style={{ background: FARBE[a.art] ?? "currentColor" }} aria-hidden="true" />
                          {label(a.art)}
                          {a.verschobenVon && (
                            <span className="text-[13px] text-subtle">
                              {de ? `verschoben wegen ${a.feiertag}` : `moved due to ${a.feiertag}`}
                            </span>
                          )}
                        </li>
                      ))}
                    </ul>
                  </Glass>
                </motion.li>
              ))}
          </motion.ul>

          <Glass className="flex flex-wrap items-center gap-3 rounded-[24px] p-4">
            <a
              href={`/api/abfall/ics?bezirk=${encodeURIComponent(bezirk.id)}${aus.size ? `&arten=${cfg.arten.filter((a) => !aus.has(a.id)).map((a) => a.id).join(",")}` : ""}`}
              className="pressable flex items-center gap-2 rounded-full px-4 py-3 text-[15px] font-medium"
            >
              <Icon name="calendar" className="size-4" />
              {de ? "In meinen Kalender übernehmen" : "Add to my calendar"}
            </a>
            {aktiv(tenant, "push") && (
              <button type="button" onClick={erinnern} disabled={erinnerung && !konto} className="pressable flex items-center gap-2 rounded-full px-4 py-3 text-[15px] font-medium disabled:text-subtle">
                <Icon name="bell" className="size-4" />
                {erinnerung ? (de ? "Erinnerung ist aktiv" : "Reminder active") : de ? "Am Vorabend erinnern" : "Remind me the evening before"}
              </button>
            )}
          </Glass>
          <p role="status" className="text-[14px] text-muted">
            {meldung}
          </p>
          {cfg.arten.some((a) => a.hinweis) && (
            <dl className="grid gap-x-6 gap-y-1 text-[13px] text-subtle sm:grid-cols-2">
              {cfg.arten.map((a) => (
                <div key={a.id} className="flex gap-2">
                  <dt className="font-medium">{tx(a.label, lang)}:</dt>
                  <dd>{a.hinweis ? tx(a.hinweis, lang) : ""}</dd>
                </div>
              ))}
            </dl>
          )}
        </>
      )}
    </div>
  );
}
