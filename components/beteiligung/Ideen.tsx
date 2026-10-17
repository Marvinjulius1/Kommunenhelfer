"use client";

/** Ideen für die Gemeinde: einreichen (mit Konto), unterstützen, Stellungnahmen lesen. */
import Link from "next/link";
import { useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";

export interface IdeeDaten {
  id: string;
  titel: string;
  text: string;
  kategorie: string;
  ortsteil?: string;
  status: string;
  statusLabel: string;
  antwort?: string;
  unterstuetzer: number;
  unterstuetzt: boolean;
  eigene: boolean;
}

export function Ideen({ start, kategorien, ortsteile }: { start: IdeeDaten[]; kategorien: string[]; ortsteile: string[] }) {
  const { lang, konto } = useTenant();
  const de = lang === "de";
  const [liste, setListe] = useState(start);
  const [form, setForm] = useState(false);
  const [titel, setTitel] = useState("");
  const [text, setText] = useState("");
  const [kategorie, setKategorie] = useState(kategorien[0]);
  const [ortsteil, setOrtsteil] = useState("");
  const [meldung, setMeldung] = useState<string | null>(null);

  const einreichen = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await fetch("/api/beteiligung/ideen", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ titel, text, kategorie, ortsteil: ortsteil || undefined }) });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return setMeldung(r.status === 429 ? (de ? "Sie haben bereits mehrere Ideen in Prüfung." : "You already have several ideas under review.") : de ? "Bitte prüfen Sie Titel (mind. 5 Zeichen) und Beschreibung (mind. 20 Zeichen)." : "Please check your entries.");
    setListe([d, ...liste]);
    setForm(false);
    setTitel("");
    setText("");
    setMeldung(de ? "Danke! Wir prüfen Ihre Idee kurz und veröffentlichen sie dann. Sie bekommen eine Nachricht in Ihr Postfach." : "Thanks! We will review and publish your idea.");
  };

  const unterstuetzen = async (i: IdeeDaten) => {
    const r = await fetch(`/api/beteiligung/ideen/${encodeURIComponent(i.id)}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ an: !i.unterstuetzt }) });
    if (r.ok) {
      const d = await r.json();
      setListe((l) => l.map((x) => (x.id === d.id ? d : x)));
    }
  };

  return (
    <div className="space-y-4">
      {konto ? (
        !form && (
          <Button variant="glass" onClick={() => setForm(true)}>
            <Icon name="plus" className="size-4" />
            {de ? "Idee einreichen" : "Submit an idea"}
          </Button>
        )
      ) : (
        <p className="text-[14px] text-muted">
          {de ? "Eigene Ideen einreichen und unterstützen können Sie mit einem Bürgerkonto. " : "Submit and support ideas with an account. "}
          <Link href="/konto/anmelden?weiter=/beteiligung" className="font-medium text-accent underline underline-offset-4">
            {de ? "Anmelden" : "Sign in"}
          </Link>
        </p>
      )}
      {form && (
        <Glass className="rounded-[24px] p-6">
          <form onSubmit={einreichen} className="space-y-4">
            <label className="block text-[14px] font-medium">
              {de ? "Ihre Idee in einem Satz" : "Your idea in one sentence"}
              <input className="field-input mt-1" value={titel} onChange={(e) => setTitel(e.target.value)} required minLength={5} maxLength={100} />
            </label>
            <label className="block text-[14px] font-medium">
              {de ? "Beschreibung" : "Description"}
              <textarea className="field-input mt-1" rows={4} value={text} onChange={(e) => setText(e.target.value)} required minLength={20} maxLength={2000} />
              <span className="mt-1 block text-[12px] font-normal text-subtle">{de ? "Bitte keine Namen oder Daten anderer Personen. Ihre Idee wird ohne Ihren Namen veröffentlicht." : "No names or personal data please. Published without your name."}</span>
            </label>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[14px] font-medium">
                {de ? "Thema" : "Topic"}
                <select className="field-input mt-1" value={kategorie} onChange={(e) => setKategorie(e.target.value)}>
                  {kategorien.map((k) => (
                    <option key={k}>{k}</option>
                  ))}
                </select>
              </label>
              {ortsteile.length > 0 && (
                <label className="block text-[14px] font-medium">
                  {de ? "Ortsteil (freiwillig)" : "District (optional)"}
                  <select className="field-input mt-1" value={ortsteil} onChange={(e) => setOrtsteil(e.target.value)}>
                    <option value="">{de ? "Ganze Gemeinde" : "Everywhere"}</option>
                    {ortsteile.map((o) => (
                      <option key={o}>{o}</option>
                    ))}
                  </select>
                </label>
              )}
            </div>
            <div className="flex gap-3">
              <Button type="submit">{de ? "Einreichen" : "Submit"}</Button>
              <Button type="button" variant="glass" onClick={() => setForm(false)}>
                {de ? "Abbrechen" : "Cancel"}
              </Button>
            </div>
          </form>
        </Glass>
      )}
      <p role="status" className="text-[14px] text-muted">
        {meldung}
      </p>
      {liste.length === 0 && <p className="text-[15px] text-muted">{de ? "Noch keine Ideen – machen Sie den Anfang!" : "No ideas yet – be the first!"}</p>}
      <ul className="space-y-3">
        {liste.map((i) => (
          <li key={i.id}>
            <Glass className="rounded-[24px] p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <p className="text-[13px] text-subtle">
                    {i.kategorie}
                    {i.ortsteil ? ` · ${i.ortsteil}` : ""} · <span className={i.status === "umgesetzt" ? "text-success" : ""}>{i.statusLabel}</span>
                    {i.eigene ? (de ? " · Ihre Idee" : " · Your idea") : ""}
                  </p>
                  <h3 className="mt-1 text-[17px] font-semibold">{i.titel}</h3>
                  <p className="mt-2 whitespace-pre-wrap text-[15px] leading-relaxed text-muted">{i.text}</p>
                </div>
                <button
                  type="button"
                  onClick={() => unterstuetzen(i)}
                  disabled={!konto || i.eigene || !["veroeffentlicht", "in_pruefung"].includes(i.status)}
                  aria-pressed={i.unterstuetzt}
                  aria-label={de ? `Unterstützen (${i.unterstuetzer})` : `Support (${i.unterstuetzer})`}
                  className={`pressable flex shrink-0 flex-col items-center rounded-[16px] border px-3 py-2 text-[13px] ${i.unterstuetzt ? "border-accent text-accent" : "border-[var(--line)] text-muted"} disabled:cursor-default`}
                >
                  <Icon name="heart" className="size-5" />
                  <span className="tabular-nums">{i.unterstuetzer}</span>
                </button>
              </div>
              {i.antwort && (
                <div className="mt-4 rounded-[16px] bg-[var(--line)] p-4 text-[14px] leading-relaxed">
                  <p className="text-[12px] font-medium uppercase tracking-wide text-subtle">{de ? "Antwort der Verwaltung" : "Response"}</p>
                  <p className="mt-1 whitespace-pre-wrap">{i.antwort}</p>
                </div>
              )}
            </Glass>
          </li>
        ))}
      </ul>
    </div>
  );
}
