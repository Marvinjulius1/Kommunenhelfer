"use client";

/** Bedarf melden, Wartelistenplatz sehen, Angebot annehmen – mit Bürgerkonto. */
import Link from "next/link";
import { useCallback, useEffect, useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";

type Gruppe = "u3" | "ue3" | "hort";
interface Wunsch {
  id: string;
  kind: { vorname: string; geburtsdatum: string; stunden: number };
  altersgruppe: Gruppe;
  beginn: string;
  angebot?: { kitaId: string; bis: string };
  kitas: { id: string; status: string; rang?: number }[];
}

const STATUS: Record<string, string> = { wartend: "auf der Warteliste", angebot: "Platzangebot", zugesagt: "zugesagt", abgesagt: "abgesagt", zurueckgezogen: "zurückgezogen" };
const monat = (m: string) => new Intl.DateTimeFormat("de-DE", { month: "long", year: "numeric", timeZone: "UTC" }).format(new Date(m + "-01T12:00:00Z"));
const tag = (d: string) => new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeZone: "UTC" }).format(new Date(d + "T12:00:00Z"));

/** Altersgruppe wie auf dem Server (Stichtag: 1. des Beginn-Monats) */
function gruppe(geb: string, beginn: string): Gruppe | undefined {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(geb) || !/^\d{4}-\d{2}$/.test(beginn)) return undefined;
  const [gj, gm, gt] = geb.split("-").map(Number);
  const [bj, bm] = beginn.split("-").map(Number);
  const j = Math.max(0, bj - gj - (bm < gm || (bm === gm && 1 < gt) ? 1 : 0));
  return j < 3 ? "u3" : j < 6 ? "ue3" : "hort";
}

export function KitaBoerse({ kitas }: { kitas: { id: string; name: string; altersgruppen: Gruppe[] }[] }) {
  const { konto } = useTenant();
  const [liste, setListe] = useState<Wunsch[] | null>(null);
  const [form, setForm] = useState(false);
  const [f, setF] = useState({ vorname: "", geburtsdatum: "", beginn: "", stunden: 35, hinweis: "", wahl: [] as string[] });
  const [meldung, setMeldung] = useState<{ ok: boolean; text: string } | null>(null);

  const laden = useCallback(async () => {
    const r = await fetch("/api/kita", { cache: "no-store" });
    if (r.ok) setListe((await r.json()).wuensche);
  }, []);
  useEffect(() => {
    if (konto) void laden();
  }, [konto, laden]);

  const name = (id: string) => kitas.find((k) => k.id === id)?.name ?? id;
  const g = gruppe(f.geburtsdatum, f.beginn);
  const passend = kitas.filter((k) => g && k.altersgruppen.includes(g));

  const senden = async (e: React.FormEvent) => {
    e.preventDefault();
    setMeldung(null);
    const r = await fetch("/api/kita", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ vorname: f.vorname, geburtsdatum: f.geburtsdatum, beginn: f.beginn, stunden: f.stunden, hinweis: f.hinweis || undefined, kitas: f.wahl }) });
    if (!r.ok) return setMeldung({ ok: false, text: "Bitte prüfen Sie Ihre Angaben. Der Beginn darf nicht in der Vergangenheit liegen, und mindestens eine passende Kita muss gewählt sein." });
    setForm(false);
    setF({ vorname: "", geburtsdatum: "", beginn: "", stunden: 35, hinweis: "", wahl: [] });
    setMeldung({ ok: true, text: "Ihr Bedarf ist gemeldet. Sie sehen unten Ihren Platz auf der Warteliste." });
    void laden();
  };

  const aktion = async (id: string, aktion: "annehmen" | "ablehnen" | "zurueckziehen") => {
    if (aktion !== "annehmen" && !confirm(aktion === "ablehnen" ? "Platzangebot wirklich ablehnen?" : "Alle Wünsche für dieses Kind zurückziehen?")) return;
    const r = await fetch("/api/kita", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, aktion }) });
    setMeldung(r.ok ? { ok: true, text: aktion === "annehmen" ? "Zugesagt! Die Kita meldet sich wegen des Betreuungsvertrags bei Ihnen." : "Gespeichert." } : { ok: false, text: "Das hat nicht geklappt." });
    void laden();
  };

  if (!konto)
    return (
      <Glass className="rounded-[24px] p-6">
        <p className="text-[16px] font-medium">Für die Kita-Platz-Börse brauchen Sie ein Bürgerkonto.</p>
        <p className="mt-1 text-[14px] text-muted">So können wir Sie über Ihren Platz auf der Warteliste und über Angebote informieren.</p>
        <Link href="/konto/anmelden?weiter=/kita" className="mt-4 inline-flex min-h-11 items-center rounded-full bg-accent px-5 text-[15px] font-medium text-on-accent">
          Anmelden oder Konto erstellen
        </Link>
      </Glass>
    );

  return (
    <div className="space-y-4">
      {liste?.map((w) => (
        <Glass key={w.id} className="rounded-[24px] p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="text-[17px] font-semibold">{w.kind.vorname}</h2>
            <p className="text-[13px] text-subtle">
              ab {monat(w.beginn)} · {w.kind.stunden} Std./Woche
            </p>
          </div>
          {w.angebot && (
            <div className="mt-4 rounded-[18px] bg-[color-mix(in_srgb,var(--success)_12%,transparent)] p-4">
              <p className="text-[15px] font-semibold">Platzangebot: {name(w.angebot.kitaId)}</p>
              <p className="mt-1 text-[14px] text-muted">Bitte bis zum {tag(w.angebot.bis)} zu- oder absagen.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button className="!min-h-10 px-4 text-[14px]" onClick={() => aktion(w.id, "annehmen")}>
                  Platz annehmen
                </Button>
                <Button variant="glass" className="!min-h-10 px-4 text-[14px]" onClick={() => aktion(w.id, "ablehnen")}>
                  Ablehnen
                </Button>
              </div>
            </div>
          )}
          <ol className="mt-4 space-y-2">
            {w.kitas.map((k, i) => (
              <li key={k.id} className="flex flex-wrap items-center justify-between gap-2 rounded-[16px] bg-[var(--line)] px-4 py-3 text-[14px]">
                <span>
                  <span className="text-subtle">{i + 1}. Wunsch · </span>
                  <span className="font-medium">{name(k.id)}</span>
                </span>
                <span className={k.status === "zugesagt" ? "font-medium text-success" : k.status === "angebot" ? "font-medium" : "text-muted"}>
                  {k.rang ? `Platz ${k.rang} auf der Warteliste` : STATUS[k.status]}
                </span>
              </li>
            ))}
          </ol>
          {w.kitas.some((k) => k.status === "wartend" || k.status === "angebot") && (
            <button type="button" onClick={() => aktion(w.id, "zurueckziehen")} className="mt-3 text-[13px] text-muted underline underline-offset-2">
              Bedarf zurückziehen
            </button>
          )}
        </Glass>
      ))}

      {form ? (
        <Glass className="rounded-[24px] p-6">
          <form onSubmit={senden} className="space-y-4">
            <h2 className="text-[17px] font-semibold">Betreuungsbedarf melden</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[14px] font-medium">
                Vorname des Kindes
                <input className="field-input mt-1" required maxLength={60} value={f.vorname} onChange={(e) => setF({ ...f, vorname: e.target.value })} />
              </label>
              <label className="block text-[14px] font-medium">
                Geburtsdatum (auch voraussichtlich)
                <input className="field-input mt-1" type="date" required value={f.geburtsdatum} onChange={(e) => setF({ ...f, geburtsdatum: e.target.value, wahl: [] })} />
              </label>
              <label className="block text-[14px] font-medium">
                Betreuung ab
                <input className="field-input mt-1" type="month" required value={f.beginn} onChange={(e) => setF({ ...f, beginn: e.target.value, wahl: [] })} />
              </label>
              <label className="block text-[14px] font-medium">
                Stunden pro Woche
                <select className="field-input mt-1" value={f.stunden} onChange={(e) => setF({ ...f, stunden: Number(e.target.value) })}>
                  {[25, 30, 35, 40, 45].map((s) => (
                    <option key={s} value={s}>
                      {s} Stunden
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <fieldset>
              <legend className="text-[14px] font-medium">Wunsch-Kitas (bis zu drei, in Ihrer Reihenfolge)</legend>
              {!g ? (
                <p className="mt-2 text-[13px] text-subtle">Bitte zuerst Geburtsdatum und Beginn angeben – dann zeigen wir die passenden Kitas.</p>
              ) : passend.length ? (
                <ul className="mt-2 space-y-2">
                  {passend.map((k) => {
                    const pos = f.wahl.indexOf(k.id);
                    return (
                      <li key={k.id}>
                        <label className="flex cursor-pointer items-center gap-3 rounded-[16px] border border-[var(--line)] px-4 py-3 text-[15px]">
                          <input
                            type="checkbox"
                            className="checkbox"
                            checked={pos >= 0}
                            disabled={pos < 0 && f.wahl.length >= 3}
                            onChange={() => setF({ ...f, wahl: pos >= 0 ? f.wahl.filter((x) => x !== k.id) : [...f.wahl, k.id] })}
                          />
                          <span className="flex-1">{k.name}</span>
                          {pos >= 0 && <span className="rounded-full bg-fg px-2.5 py-0.5 text-[12px] font-semibold text-bg">{pos + 1}. Wunsch</span>}
                        </label>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="mt-2 text-[13px] text-danger">Für diese Altersgruppe gibt es keine passende Kita.</p>
              )}
            </fieldset>
            <label className="block text-[14px] font-medium">
              Hinweis an die Kita (freiwillig)
              <textarea className="field-input mt-1" rows={2} maxLength={500} value={f.hinweis} onChange={(e) => setF({ ...f, hinweis: e.target.value })} placeholder="z. B. Geschwisterkind in der Kita" />
            </label>
            <div className="flex gap-2">
              <Button type="submit" disabled={!f.wahl.length}>
                Bedarf melden
              </Button>
              <Button type="button" variant="quiet" onClick={() => setForm(false)}>
                Abbrechen
              </Button>
            </div>
          </form>
        </Glass>
      ) : (
        <Button onClick={() => setForm(true)}>
          <Icon name="plus" className="size-4" />
          {liste?.length ? "Weiteres Kind anmelden" : "Betreuungsbedarf melden"}
        </Button>
      )}
      <p role={meldung?.ok === false ? "alert" : "status"} className={`text-[14px] ${meldung?.ok === false ? "text-danger" : "text-success"}`}>
        {meldung?.text}
      </p>
    </div>
  );
}
