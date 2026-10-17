"use client";

/**
 * Admin-Bereich: Leistungen ein-/ausschalten, Kurztexte und Gebühren pflegen,
 * Texte der Startseite ändern – ohne Entwickler. Gespeichert wird nur die Abweichung.
 */
import { useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";

export interface AdminLeistung {
  id: string;
  titel: string;
  aktiv: boolean;
  kurz: string;
  beschreibung: string;
  gebuehren: { bezeichnung: string; betrag: number | null | string; hinweis?: string }[];
}

type Werte = Omit<AdminLeistung, "id" | "titel">;

export function AdminFormular({ basis, aktuell, texteBasis, texteAktuell }: { basis: AdminLeistung[]; aktuell: Record<string, Partial<Werte>>; texteBasis: Record<string, string>; texteAktuell: Record<string, string> }) {
  const [werte, setWerte] = useState<Record<string, Werte>>(() => Object.fromEntries(basis.map((l) => [l.id, { aktiv: l.aktiv, kurz: l.kurz, beschreibung: l.beschreibung, gebuehren: l.gebuehren, ...aktuell[l.id] }])));
  const [texte, setTexte] = useState({ ...texteBasis, ...texteAktuell });
  const [suche, setSuche] = useState("");
  const [offen, setOffen] = useState<string | null>(null);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);

  const geaendert = useMemo(() => {
    const out: Record<string, Partial<Werte>> = {};
    for (const l of basis) {
      const w = werte[l.id];
      const diff: Partial<Werte> = {};
      if (w.aktiv !== l.aktiv) diff.aktiv = w.aktiv;
      if (w.kurz !== l.kurz) diff.kurz = w.kurz;
      if (w.beschreibung !== l.beschreibung) diff.beschreibung = w.beschreibung;
      if (JSON.stringify(w.gebuehren) !== JSON.stringify(l.gebuehren)) diff.gebuehren = w.gebuehren;
      if (Object.keys(diff).length) out[l.id] = diff;
    }
    return out;
  }, [werte, basis]);

  const setze = (id: string, patch: Partial<Werte>) => setWerte((w) => ({ ...w, [id]: { ...w[id], ...patch } }));

  const speichern = async () => {
    setLaedt(true);
    setMeldung(null);
    const texteDiff = Object.fromEntries(Object.entries(texte).filter(([k, v]) => v && v !== texteBasis[k]));
    const r = await fetch("/api/backoffice/admin", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ leistungen: geaendert, texte: texteDiff }) });
    setLaedt(false);
    const d = await r.json().catch(() => ({}));
    setMeldung(r.ok ? "Gespeichert. Die Änderungen sind sofort im Portal sichtbar." : d.probleme ? `Nicht gespeichert: ${d.probleme.join("; ")}` : "Bitte Eingaben prüfen (Kurztext mind. 10 Zeichen).");
  };

  const liste = basis.filter((l) => l.titel.toLowerCase().includes(suche.toLowerCase()));
  const anzahl = Object.keys(geaendert).length;

  return (
    <div className="space-y-8">
      <Glass className="rounded-[24px] p-6">
        <h2 className="text-[17px] font-semibold">Texte der Startseite</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-[14px] font-medium">
            Schrift unter dem Wappen
            <input className="field-input mt-1" value={texte.untertitel ?? ""} onChange={(e) => setTexte({ ...texte, untertitel: e.target.value })} maxLength={60} />
          </label>
          <label className="text-[14px] font-medium">
            Platzhalter im Eingabefeld
            <input className="field-input mt-1" value={texte.platzhalter ?? ""} onChange={(e) => setTexte({ ...texte, platzhalter: e.target.value })} maxLength={80} />
          </label>
          <label className="text-[14px] font-medium sm:col-span-2">
            Begrüßung des Assistenten
            <textarea className="field-input mt-1" rows={2} value={texte.begruessung ?? ""} onChange={(e) => setTexte({ ...texte, begruessung: e.target.value })} maxLength={400} />
          </label>
        </div>
      </Glass>

      <div>
        <div className="flex flex-wrap items-end justify-between gap-3">
          <h2 className="text-[17px] font-semibold">Leistungen ({basis.length})</h2>
          <input className="field-input w-64" placeholder="Leistung suchen" aria-label="Leistung suchen" value={suche} onChange={(e) => setSuche(e.target.value)} />
        </div>
        <ul className="mt-4 space-y-2">
          {liste.map((l) => {
            const w = werte[l.id];
            const auf = offen === l.id;
            return (
              <li key={l.id}>
                <Glass className="rounded-[20px] px-5 py-4">
                  <div className="flex items-center justify-between gap-4">
                    <button type="button" aria-expanded={auf} onClick={() => setOffen(auf ? null : l.id)} className="min-w-0 flex-1 text-left">
                      <span className={`block truncate text-[15px] font-medium ${w.aktiv ? "" : "text-subtle line-through"}`}>{l.titel}</span>
                      {geaendert[l.id] && <span className="text-[12px] text-accent">geändert</span>}
                    </button>
                    <label className="flex items-center gap-2 text-[13px] text-muted">
                      <input type="checkbox" role="switch" className="checkbox" checked={w.aktiv} onChange={(e) => setze(l.id, { aktiv: e.target.checked })} />
                      {w.aktiv ? "aktiv" : "aus"}
                    </label>
                  </div>
                  {auf && (
                    <div className="mt-4 space-y-3">
                      <label className="block text-[13px] text-subtle">
                        Kurzbeschreibung (einfache Sprache)
                        <textarea className="field-input mt-1 text-[14px]" rows={2} value={w.kurz} onChange={(e) => setze(l.id, { kurz: e.target.value })} maxLength={400} />
                      </label>
                      <label className="block text-[13px] text-subtle">
                        Ausführlicher Hinweis (freiwillig)
                        <textarea className="field-input mt-1 text-[14px]" rows={2} value={w.beschreibung} onChange={(e) => setze(l.id, { beschreibung: e.target.value })} maxLength={2000} />
                      </label>
                      <fieldset>
                        <legend className="text-[13px] text-subtle">Gebühren (leer = kostenfrei, Text z. B. „nach Aufwand“)</legend>
                        <div className="mt-1 space-y-2">
                          {w.gebuehren.map((g, i) => (
                            <div key={i} className="grid grid-cols-[1fr_8rem_auto] gap-2">
                              <input
                                className="field-input text-[14px]"
                                aria-label="Bezeichnung"
                                value={g.bezeichnung}
                                onChange={(e) => setze(l.id, { gebuehren: w.gebuehren.map((x, j) => (j === i ? { ...x, bezeichnung: e.target.value } : x)) })}
                              />
                              <input
                                className="field-input text-[14px]"
                                aria-label="Betrag in Euro"
                                value={g.betrag === null ? "" : String(g.betrag).replace(".", ",")}
                                onChange={(e) => {
                                  const v = e.target.value.trim();
                                  const zahl = Number(v.replace(",", "."));
                                  setze(l.id, { gebuehren: w.gebuehren.map((x, j) => (j === i ? { ...x, betrag: v === "" ? null : Number.isFinite(zahl) ? zahl : v } : x)) });
                                }}
                              />
                              <button type="button" aria-label="Gebühr entfernen" className="pressable rounded-full px-3 text-[13px] text-muted" onClick={() => setze(l.id, { gebuehren: w.gebuehren.filter((_, j) => j !== i) })}>
                                ✕
                              </button>
                            </div>
                          ))}
                          <button type="button" className="pressable rounded-full px-3 py-1 text-[13px] text-accent" onClick={() => setze(l.id, { gebuehren: [...w.gebuehren, { bezeichnung: "Gebühr", betrag: null }] })}>
                            + Gebühr
                          </button>
                        </div>
                      </fieldset>
                      <button type="button" className="pressable rounded-full px-3 py-1 text-[13px] text-muted" onClick={() => setze(l.id, { aktiv: l.aktiv, kurz: l.kurz, beschreibung: l.beschreibung, gebuehren: l.gebuehren })}>
                        Auf Konfiguration zurücksetzen
                      </button>
                    </div>
                  )}
                </Glass>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="sticky bottom-4 z-10">
        <Glass className="flex flex-wrap items-center justify-between gap-3 rounded-[24px] px-5 py-3">
          <p aria-live="polite" className="text-[14px] text-muted">
            {meldung ?? (anzahl ? `${anzahl} Leistung${anzahl > 1 ? "en" : ""} geändert` : "Keine ungespeicherten Änderungen an Leistungen")}
          </p>
          <Button onClick={speichern} disabled={laedt} className="!min-h-10 px-6 text-[14px]">
            Speichern
          </Button>
        </Glass>
      </div>
    </div>
  );
}
