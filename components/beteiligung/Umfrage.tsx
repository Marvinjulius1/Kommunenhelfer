"use client";

/** Eine Umfrage: abstimmen (mit Konto) und Ergebnis als Balken. */
import Link from "next/link";
import { useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { deutsch } from "@/lib/i18n";

export interface UmfrageDaten {
  id: string;
  titel: string;
  beschreibung: string;
  optionen: { id: string; label: string }[];
  mehrfach: boolean;
  bis: string;
  ortsteil?: string;
  offen: boolean;
  nurOnlineAusweis: boolean;
  teilgenommen: boolean;
  teilnehmer: number;
  ergebnis?: { id: string; label: string; stimmen: number }[];
}

export function Umfrage({ start }: { start: UmfrageDaten }) {
  const { lang, konto } = useTenant();
  const de = deutsch(lang);
  const [u, setU] = useState(start);
  const [wahl, setWahl] = useState<string[]>([]);
  const [fehler, setFehler] = useState<string | null>(null);
  const [sendet, setSendet] = useState(false);
  const bis = new Intl.DateTimeFormat(de ? "de-DE" : "en-GB", { day: "numeric", month: "long", timeZone: "Europe/Berlin" }).format(new Date(u.bis));
  const summe = u.ergebnis?.reduce((s, o) => s + o.stimmen, 0) ?? 0;
  const kannAbstimmen = u.offen && !!konto && !u.teilgenommen && !(u.nurOnlineAusweis && konto.vertrauensniveau !== "hoch");

  const abstimmen = async () => {
    setSendet(true);
    setFehler(null);
    const r = await fetch(`/api/beteiligung/umfrage/${encodeURIComponent(u.id)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ wahl }) });
    setSendet(false);
    const d = await r.json().catch(() => ({}));
    if (r.ok) return setU(d);
    setFehler(d.fehler === "schon_abgestimmt" ? (de ? "Sie haben bereits teilgenommen." : "You have already voted.") : d.fehler === "beendet" ? (de ? "Die Umfrage ist beendet." : "The survey has ended.") : de ? "Das hat nicht geklappt." : "That did not work.");
  };

  return (
    <Glass className="rounded-[24px] p-6">
      <p className="text-[13px] text-subtle">
        {u.offen ? (de ? `läuft bis ${bis}` : `open until ${bis}`) : de ? "beendet" : "closed"}
        {u.ortsteil ? ` · ${u.ortsteil}` : ""} · {u.teilnehmer} {de ? (u.teilnehmer === 1 ? "Teilnahme" : "Teilnahmen") : "votes"}
      </p>
      <h2 className="mt-1 text-[19px] font-semibold tracking-tight">{u.titel}</h2>
      {u.beschreibung && <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-muted">{u.beschreibung}</p>}

      {kannAbstimmen ? (
        <fieldset className="mt-5">
          <legend className="text-[14px] font-medium">{u.mehrfach ? (de ? "Mehrere Antworten möglich" : "Multiple answers possible") : de ? "Eine Antwort" : "One answer"}</legend>
          <div className="mt-2 space-y-2">
            {u.optionen.map((o) => (
              <label key={o.id} className="choice">
                <input
                  type={u.mehrfach ? "checkbox" : "radio"}
                  name={`u-${u.id}`}
                  className={u.mehrfach ? "checkbox" : "radio"}
                  checked={wahl.includes(o.id)}
                  onChange={(e) => setWahl(u.mehrfach ? (e.target.checked ? [...wahl, o.id] : wahl.filter((x) => x !== o.id)) : [o.id])}
                />
                <span className="text-[15px]">{o.label}</span>
              </label>
            ))}
          </div>
          <Button className="mt-4" onClick={abstimmen} disabled={!wahl.length || sendet}>
            {de ? "Abstimmen" : "Vote"}
          </Button>
          <p className="mt-2 text-[12px] text-subtle">{de ? "Ihre Stimme wird anonym gezählt – gespeichert wird nur, dass Sie teilgenommen haben." : "Your vote is counted anonymously."}</p>
        </fieldset>
      ) : (
        u.offen &&
        !u.teilgenommen && (
          <p className="mt-5 text-[14px] text-muted">
            {!konto ? (
              <>
                {de ? "Zum Abstimmen bitte " : "To vote, please "}
                <Link href="/konto/anmelden?weiter=/beteiligung" className="font-medium text-accent underline underline-offset-4">
                  {de ? "anmelden" : "sign in"}
                </Link>{" "}
                {de ? "– so zählt jede Stimme nur einmal." : "– so every vote counts once."}
              </>
            ) : (
              <>
                {de ? "Für diese Umfrage ist eine Anmeldung mit dem Online-Ausweis nötig. " : "This survey requires the online ID. "}
                <Link href="/konto/ausweis?weiter=/beteiligung" className="font-medium text-accent underline underline-offset-4">
                  {de ? "Jetzt bestätigen" : "Verify now"}
                </Link>
              </>
            )}
          </p>
        )
      )}

      {u.teilgenommen && <p className="mt-5 text-[14px] text-success">{de ? "Danke – Ihre Stimme ist gezählt." : "Thanks – your vote has been counted."}</p>}

      {u.ergebnis && (u.teilgenommen || !u.offen || !kannAbstimmen) && (
        <ul className="mt-5 space-y-3" aria-label={de ? "Ergebnis" : "Result"}>
          {u.ergebnis.map((o) => {
            const anteil = summe ? Math.round((o.stimmen / summe) * 100) : 0;
            return (
              <li key={o.id}>
                <div className="flex justify-between gap-4 text-[14px]">
                  <span>{o.label}</span>
                  <span className="tabular-nums text-muted">
                    {anteil} % <span className="text-subtle">({o.stimmen})</span>
                  </span>
                </div>
                <div className="mt-1 h-2 overflow-hidden rounded-full bg-[var(--line)]" aria-hidden="true">
                  <div className="h-full origin-left rounded-full bg-accent transition-transform duration-500" style={{ transform: `scaleX(${anteil / 100})` }} />
                </div>
              </li>
            );
          })}
        </ul>
      )}
      {!u.ergebnis && u.teilgenommen && <p className="mt-2 text-[13px] text-subtle">{de ? "Das Ergebnis wird nach Ende der Umfrage veröffentlicht." : "Results are published after the survey ends."}</p>}
      {fehler && (
        <p role="alert" className="mt-3 text-[14px] text-danger">
          {fehler}
        </p>
      )}
    </Glass>
  );
}
