"use client";

/** Backoffice: Wartenummern aufrufen, Ausweis-Status setzen, Fundsachen erfassen. */
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";

interface Eintrag {
  id: string;
  nummer: string;
  status: "wartend" | "aufgerufen";
  schalter?: string;
  seit: string;
  konto: boolean;
}

export function Aufruf({ aemter }: { aemter: { id: string; name: string }[] }) {
  const [amtId, setAmtId] = useState(aemter[0]?.id ?? "");
  const [schalter, setSchalter] = useState("Schalter 1");
  const [liste, setListe] = useState<Eintrag[]>([]);
  const [info, setInfo] = useState({ wartend: 0, minuten: 0, erledigt: 0 });
  const [meldung, setMeldung] = useState<string | null>(null);

  useEffect(() => {
    try {
      const s = localStorage.getItem("bo-schalter");
      if (s) setSchalter(s);
    } catch {}
  }, []);

  const laden = useCallback(async () => {
    if (!amtId) return;
    const r = await fetch(`/api/backoffice/wartezeit?amt=${encodeURIComponent(amtId)}`, { cache: "no-store" });
    if (!r.ok) return;
    const d = await r.json();
    setListe(d.liste);
    setInfo({ wartend: d.stand.wartend, minuten: d.stand.minuten, erledigt: d.erledigt });
  }, [amtId]);

  useEffect(() => {
    void laden();
    const iv = setInterval(laden, 10_000);
    return () => clearInterval(iv);
  }, [laden]);

  const aufrufen = async () => {
    setMeldung(null);
    try {
      localStorage.setItem("bo-schalter", schalter);
    } catch {}
    const r = await fetch("/api/backoffice/wartezeit", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ amtId, schalter }) });
    const d = await r.json().catch(() => ({}));
    setMeldung(r.ok ? `${d.nummer} aufgerufen.` : r.status === 404 ? "Niemand wartet." : "Das hat nicht geklappt.");
    void laden();
  };

  const abschliessen = async (id: string, status: "erledigt" | "nicht_erschienen") => {
    await fetch("/api/backoffice/wartezeit", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ amtId, id, status }) });
    void laden();
  };

  const fmt = (iso: string) => new Intl.DateTimeFormat("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" }).format(new Date(iso));

  return (
    <div className="space-y-6">
      <Glass className="flex flex-wrap items-end gap-3 rounded-[24px] p-5">
        <label className="flex flex-col gap-1 text-[13px] text-subtle">
          Amt
          <select className="field-input" value={amtId} onChange={(e) => setAmtId(e.target.value)}>
            {aemter.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[13px] text-subtle">
          Mein Platz
          <input className="field-input w-40" value={schalter} onChange={(e) => setSchalter(e.target.value)} maxLength={30} />
        </label>
        <Button onClick={aufrufen} className="min-h-12 px-6" disabled={!info.wartend}>
          Nächste Nummer aufrufen
        </Button>
        <p className="ml-auto text-[14px] text-muted" aria-live="polite">
          {info.wartend} wartend · ca. {info.minuten} min · {info.erledigt} erledigt
        </p>
      </Glass>
      <p aria-live="polite" className="text-[14px] text-muted">
        {meldung}
      </p>
      <ul className="space-y-2">
        {liste.length === 0 && <li className="text-[14px] text-muted">Zurzeit wartet niemand.</li>}
        {liste.map((w) => (
          <li key={w.id}>
            <Glass className="flex flex-wrap items-center justify-between gap-3 rounded-[18px] px-5 py-3">
              <span className="flex items-center gap-4">
                <span className="font-mono text-[20px] font-semibold">{w.nummer}</span>
                <span className="text-[13px] text-subtle">
                  seit {fmt(w.seit)}
                  {w.konto ? " · mit Konto" : ""}
                </span>
              </span>
              {w.status === "aufgerufen" ? (
                <span className="flex items-center gap-2">
                  <span className="text-[13px] font-medium">{w.schalter}</span>
                  <button type="button" onClick={() => abschliessen(w.id, "erledigt")} className="pressable rounded-full bg-[var(--line)] px-3 py-1 text-[13px]">
                    Erledigt
                  </button>
                  <button type="button" onClick={() => abschliessen(w.id, "nicht_erschienen")} className="pressable rounded-full px-3 py-1 text-[13px] text-muted">
                    Nicht erschienen
                  </button>
                </span>
              ) : (
                <span className="text-[13px] text-subtle">wartet</span>
              )}
            </Glass>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AusweisFormular() {
  const [nummer, setNummer] = useState("");
  const [art, setArt] = useState("personalausweis");
  const [meldung, setMeldung] = useState<string | null>(null);
  const setzen = async (status: "in_produktion" | "abholbereit" | "abgeholt") => {
    setMeldung(null);
    const r = await fetch("/api/backoffice/ausweise", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ nummer, status, art }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return setMeldung("Bitte die Antragsnummer prüfen (9–14 Zeichen).");
    setMeldung(
      status === "abholbereit" ? `Als abholbereit markiert.${d.benachrichtigt ? ` ${d.benachrichtigt} Person${d.benachrichtigt > 1 ? "en" : ""} benachrichtigt.` : ""}` : status === "abgeholt" ? "Als abgeholt markiert." : "Als „in Herstellung“ eingetragen.",
    );
    setNummer("");
  };
  return (
    <div className="space-y-3">
      <div className="grid gap-3 sm:grid-cols-[1fr_12rem]">
        <input className="field-input font-mono tracking-wider" placeholder="Antragsnummer scannen oder eingeben" value={nummer} onChange={(e) => setNummer(e.target.value.toUpperCase())} aria-label="Antragsnummer" autoFocus />
        <select className="field-input" value={art} onChange={(e) => setArt(e.target.value)} aria-label="Dokument">
          <option value="personalausweis">Personalausweis</option>
          <option value="reisepass">Reisepass</option>
          <option value="kinderreisepass">Kinderreisepass</option>
          <option value="eat">Aufenthaltstitel</option>
        </select>
      </div>
      <div className="flex flex-wrap gap-2">
        <Button variant="glass" className="!min-h-10 px-4 text-[14px]" onClick={() => setzen("in_produktion")} disabled={nummer.length < 9}>
          In Herstellung
        </Button>
        <Button className="!min-h-10 px-4 text-[14px]" onClick={() => setzen("abholbereit")} disabled={nummer.length < 9}>
          Abholbereit
        </Button>
        <Button variant="glass" className="!min-h-10 px-4 text-[14px]" onClick={() => setzen("abgeholt")} disabled={nummer.length < 9}>
          Abgeholt
        </Button>
      </div>
      <p aria-live="polite" className="text-[14px] text-muted">
        {meldung}
      </p>
    </div>
  );
}

export function FundFormular({ kategorien }: { kategorien: string[] }) {
  const router = useRouter();
  const heute = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
  const leer = { bezeichnung: "", kategorie: kategorien[0], beschreibung: "", fundort: "", funddatum: heute, intern: "" };
  const [f, setF] = useState(leer);
  const [meldung, setMeldung] = useState<string | null>(null);
  const senden = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("/api/backoffice/fundbuero", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...f, intern: f.intern || undefined }) });
    setMeldung(r.ok ? "Erfasst und veröffentlicht." : "Bitte Eingaben prüfen.");
    if (r.ok) {
      setF(leer);
      router.refresh();
    }
  };
  const feld = (k: keyof typeof leer) => ({ value: f[k], onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => setF({ ...f, [k]: e.target.value }) });
  return (
    <form onSubmit={senden} className="space-y-3">
      <input className="field-input" placeholder="Bezeichnung, z. B. Schlüsselbund" required minLength={2} maxLength={80} aria-label="Bezeichnung" {...feld("bezeichnung")} />
      <div className="grid gap-3 sm:grid-cols-2">
        <select className="field-input" aria-label="Kategorie" {...feld("kategorie")}>
          {kategorien.map((k) => (
            <option key={k}>{k}</option>
          ))}
        </select>
        <input type="date" className="field-input" aria-label="Funddatum" required {...feld("funddatum")} />
      </div>
      <input className="field-input" placeholder="Fundort, z. B. Marktplatz" required minLength={2} maxLength={120} aria-label="Fundort" {...feld("fundort")} />
      <input className="field-input" placeholder="Öffentliche Beschreibung (ohne Erkennungsmerkmale)" maxLength={300} aria-label="Öffentliche Beschreibung" {...feld("beschreibung")} />
      <textarea className="field-input" rows={2} placeholder="Interne Merkmale (nur für das Fundbüro), z. B. Gravur, Inhalt" maxLength={1000} aria-label="Interne Merkmale" {...feld("intern")} />
      <Button type="submit" className="!min-h-10 px-5 text-[14px]">
        Erfassen
      </Button>
      <p aria-live="polite" className="text-[14px] text-muted">
        {meldung}
      </p>
    </form>
  );
}

export function FundStatus({ id, status }: { id: string; status: "offen" | "abgeholt" }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="pressable rounded-full px-3 py-1 text-[13px] text-muted hover:text-fg"
      onClick={async () => {
        await fetch("/api/backoffice/fundbuero", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, status: status === "offen" ? "abgeholt" : "offen" }) });
        router.refresh();
      }}
    >
      {status === "offen" ? "Als abgeholt markieren" : "Wieder öffnen"}
    </button>
  );
}
