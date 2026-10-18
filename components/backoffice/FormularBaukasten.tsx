"use client";

/**
 * Formular-Baukasten: eigene Online-Anträge zusammenstellen – mit Live-Vorschau.
 * Felder und Schritte werden hier nur beschrieben; die Leistung baut der Server
 * (lib/formulare/baukasten.ts) und prüft sie wie die Konfigurationsdatei.
 */
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { Field } from "@/components/flow/Field";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { BAU_TYPEN, baueLeistung, type BauFeld, type BauLeistung, type BauSchritt } from "@/lib/formulare/baukasten";
import { tx } from "@/lib/i18n";

interface Eintrag {
  id: string;
  titel: string;
  aktiv: boolean;
  bau: BauLeistung;
}

const LEER = (amtId: string): BauLeistung => ({
  aktiv: false,
  titel: "",
  kurz: "",
  amtId,
  stichworte: [],
  unterlagen: [],
  ablauf: [],
  gebuehr: undefined,
  onlineBezahlen: false,
  kontakt: "kurz",
  aufbewahrungTage: 180,
  schritte: [{ titel: "Ihr Anliegen", felder: [{ label: "Worum geht es?", typ: "textarea", pflicht: true }] }],
});

const verschiebe = <T,>(liste: T[], i: number, d: -1 | 1) => {
  const j = i + d;
  if (j < 0 || j >= liste.length) return liste;
  const neu = [...liste];
  [neu[i], neu[j]] = [neu[j], neu[i]];
  return neu;
};

export function FormularBaukasten({ eigene, vorlagen, aemter }: { eigene: Eintrag[]; vorlagen: { id: string; titel: string; bau: BauLeistung }[]; aemter: { id: string; name: string }[] }) {
  const router = useRouter();
  const [bau, setBau] = useState<BauLeistung | null>(null);
  const [vorlage, setVorlage] = useState("");
  const [meldung, setMeldung] = useState<{ ok: boolean; text: string; probleme?: string[] } | null>(null);
  const [laedt, setLaedt] = useState(false);

  const setze = (patch: Partial<BauLeistung>) => setBau((b) => (b ? { ...b, ...patch } : b));
  const setzeSchritt = (i: number, patch: Partial<BauSchritt>) => setBau((b) => (b ? { ...b, schritte: b.schritte.map((s, j) => (j === i ? { ...s, ...patch } : s)) } : b));
  const setzeFeld = (si: number, fi: number, patch: Partial<BauFeld>) => setBau((b) => (b ? { ...b, schritte: b.schritte.map((s, j) => (j === si ? { ...s, felder: s.felder.map((f, k) => (k === fi ? { ...f, ...patch } : f)) } : s)) } : b));

  const speichern = async () => {
    if (!bau) return;
    setLaedt(true);
    setMeldung(null);
    const r = await fetch("/api/backoffice/formulare", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ formular: bau }) });
    const d = await r.json().catch(() => ({}));
    setLaedt(false);
    if (!r.ok) return setMeldung({ ok: false, text: "Nicht gespeichert. Bitte prüfen:", probleme: d.probleme ?? ["Titel, Kurzbeschreibung (mind. 10 Zeichen) und alle Feldbezeichnungen ausfüllen."] });
    setBau({ ...bau, id: d.id });
    setMeldung({ ok: true, text: bau.aktiv ? `Gespeichert und veröffentlicht unter /antrag/${d.id}.` : "Gespeichert (noch nicht veröffentlicht)." });
    router.refresh();
  };

  const loeschen = async () => {
    if (!bau?.id || !confirm(`Formular „${bau.titel}“ wirklich löschen? Bereits eingegangene Anträge bleiben erhalten.`)) return;
    const r = await fetch("/api/backoffice/formulare", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id: bau.id }) });
    if (r.ok) {
      setBau(null);
      router.refresh();
    } else setMeldung({ ok: false, text: "Löschen nicht möglich – das Formular wird noch verwendet." });
  };

  if (!bau)
    return (
      <div className="grid gap-6 lg:grid-cols-[1fr_1fr]">
        <Glass className="rounded-[24px] p-6">
          <h2 className="text-[17px] font-semibold">Eigene Formulare</h2>
          {eigene.length ? (
            <ul className="mt-4 space-y-2">
              {eigene.map((e) => (
                <li key={e.id}>
                  <button type="button" onClick={() => setBau(e.bau)} className="pressable flex w-full items-center justify-between gap-4 rounded-[16px] bg-[var(--line)] px-4 py-3 text-left text-[15px]">
                    <span>
                      <span className="block font-medium">{e.titel}</span>
                      <span className="text-[12px] text-subtle">/antrag/{e.id}</span>
                    </span>
                    <span className={`shrink-0 rounded-full px-3 py-1 text-[12px] ${e.aktiv ? "bg-[color-mix(in_srgb,var(--success)_14%,transparent)] text-success" : "bg-surface text-muted"}`}>{e.aktiv ? "Veröffentlicht" : "Entwurf"}</span>
                  </button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-[14px] text-muted">Noch keine eigenen Formulare.</p>
          )}
        </Glass>
        <Glass className="rounded-[24px] p-6">
          <h2 className="text-[17px] font-semibold">Neues Formular</h2>
          <label className="mt-4 block text-[14px] font-medium">
            Ausgehen von
            <select className="field-input mt-1" value={vorlage} onChange={(e) => setVorlage(e.target.value)}>
              <option value="">Leeres Formular</option>
              {vorlagen.map((v) => (
                <option key={v.id} value={v.id}>
                  Kopie von: {v.titel}
                </option>
              ))}
            </select>
          </label>
          <Button
            className="mt-4"
            onClick={() => {
              const v = vorlagen.find((x) => x.id === vorlage);
              setMeldung(null);
              setBau(v ? { ...v.bau, titel: `${v.bau.titel} (Kopie)` } : LEER(aemter[0]?.id ?? ""));
            }}
          >
            <Icon name="plus" className="size-4" />
            Formular erstellen
          </Button>
        </Glass>
      </div>
    );

  return (
    <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
      <div className="min-w-0 space-y-4">
        <button type="button" onClick={() => setBau(null)} className="inline-flex items-center gap-1 text-[14px] text-muted hover:text-fg">
          <Icon name="chevronLeft" className="size-4" />
          Alle Formulare
        </button>

        <Glass className="space-y-4 rounded-[24px] p-6">
          <h2 className="text-[17px] font-semibold">Grunddaten</h2>
          <label className="block text-[14px] font-medium">
            Titel
            <input className="field-input mt-1" maxLength={100} value={bau.titel} onChange={(e) => setze({ titel: e.target.value })} placeholder="z. B. Osterfeuer anmelden" />
          </label>
          <label className="block text-[14px] font-medium">
            Kurzbeschreibung (ein Satz, einfache Sprache)
            <textarea className="field-input mt-1" rows={2} maxLength={400} value={bau.kurz} onChange={(e) => setze({ kurz: e.target.value })} />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-[14px] font-medium">
              Zuständiges Amt
              <select className="field-input mt-1" value={bau.amtId} onChange={(e) => setze({ amtId: e.target.value })}>
                {aemter.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-[14px] font-medium">
              Suchbegriffe (mit Komma)
              <input className="field-input mt-1" value={bau.stichworte.join(", ")} onChange={(e) => setze({ stichworte: e.target.value.split(",") })} placeholder="osterfeuer, feuer, brauchtum" />
            </label>
            <label className="block text-[14px] font-medium">
              Gebühr in Euro
              <input
                className="field-input mt-1"
                inputMode="decimal"
                placeholder="leer = keine Angabe, 0 = kostenfrei"
                value={bau.gebuehr === undefined ? "" : bau.gebuehr === null ? "0" : String(bau.gebuehr).replace(".", ",")}
                onChange={(e) => {
                  const v = e.target.value.trim().replace(",", ".");
                  setze({ gebuehr: v === "" ? undefined : Number(v) === 0 ? null : Number.isFinite(Number(v)) ? Number(v) : bau.gebuehr });
                }}
              />
            </label>
            <label className="block text-[14px] font-medium">
              Aufbewahrung der Anträge
              <select className="field-input mt-1" value={bau.aufbewahrungTage} onChange={(e) => setze({ aufbewahrungTage: Number(e.target.value) })}>
                {[90, 180, 365, 730, 1825].map((t) => (
                  <option key={t} value={t}>
                    {t < 365 ? `${t} Tage` : `${t / 365} Jahr${t === 365 ? "" : "e"}`}
                  </option>
                ))}
              </select>
            </label>
          </div>
          <fieldset>
            <legend className="text-[14px] font-medium">Kontaktangaben</legend>
            <div className="mt-2 flex flex-wrap gap-2">
              {(
                [
                  ["kurz", "Name, E-Mail, Telefon"],
                  ["voll", "zusätzlich Geburtsdatum und Anschrift"],
                ] as const
              ).map(([k, l]) => (
                <label key={k} className={`pressable cursor-pointer rounded-full border px-4 py-2 text-[14px] ${bau.kontakt === k ? "border-fg font-medium" : "border-[var(--line)] text-muted"}`}>
                  <input type="radio" name="kontakt" className="sr-only" checked={bau.kontakt === k} onChange={() => setze({ kontakt: k })} />
                  {l}
                </label>
              ))}
            </div>
          </fieldset>
          {typeof bau.gebuehr === "number" && bau.gebuehr > 0 && (
            <label className="flex items-center gap-2 text-[14px]">
              <input type="checkbox" className="checkbox" checked={bau.onlineBezahlen} onChange={(e) => setze({ onlineBezahlen: e.target.checked })} />
              Gebühr direkt nach dem Absenden online bezahlen
            </label>
          )}
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-[14px] font-medium">
              Benötigte Unterlagen (eine je Zeile)
              <textarea className="field-input mt-1" rows={3} value={bau.unterlagen.join("\n")} onChange={(e) => setze({ unterlagen: e.target.value.split("\n") })} />
            </label>
            <label className="block text-[14px] font-medium">
              So geht es weiter (eine je Zeile, leer = Standard)
              <textarea className="field-input mt-1" rows={3} value={bau.ablauf.join("\n")} onChange={(e) => setze({ ablauf: e.target.value.split("\n") })} />
            </label>
          </div>
        </Glass>

        <p className="px-2 text-[13px] text-subtle">Schritt 1 „Ihre Angaben“ (Name, E-Mail …) fügt das Portal automatisch hinzu.</p>

        {bau.schritte.map((s, si) => (
          <Glass key={si} className="space-y-4 rounded-[24px] p-6">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[17px] font-semibold">Schritt {si + 2}</h2>
              <span className="flex gap-1">
                <button type="button" aria-label={`Schritt ${si + 2} nach oben`} disabled={si === 0} onClick={() => setze({ schritte: verschiebe(bau.schritte, si, -1) })} className="pressable grid size-9 place-items-center rounded-full disabled:opacity-30">
                  <Icon name="arrowUp" className="size-4" />
                </button>
                <button type="button" aria-label={`Schritt ${si + 2} nach unten`} disabled={si === bau.schritte.length - 1} onClick={() => setze({ schritte: verschiebe(bau.schritte, si, 1) })} className="pressable grid size-9 place-items-center rounded-full disabled:opacity-30">
                  <Icon name="arrowUp" className="size-4 rotate-180" />
                </button>
                <button type="button" aria-label={`Schritt ${si + 2} entfernen`} disabled={bau.schritte.length === 1} onClick={() => setze({ schritte: bau.schritte.filter((_, j) => j !== si) })} className="pressable grid size-9 place-items-center rounded-full disabled:opacity-30">
                  <Icon name="trash" className="size-4" />
                </button>
              </span>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <label className="block text-[14px] font-medium">
                Überschrift
                <input className="field-input mt-1" maxLength={100} value={s.titel} onChange={(e) => setzeSchritt(si, { titel: e.target.value })} />
              </label>
              <label className="block text-[14px] font-medium">
                Erklärung (freiwillig)
                <input className="field-input mt-1" maxLength={300} value={s.beschreibung ?? ""} onChange={(e) => setzeSchritt(si, { beschreibung: e.target.value || undefined })} />
              </label>
            </div>
            <ol className="space-y-3">
              {s.felder.map((f, fi) => (
                <li key={fi} className="rounded-[18px] border border-[var(--line)] p-4">
                  <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_12rem]">
                    <label className="block text-[13px] font-medium">
                      Feldbezeichnung
                      <input className="field-input mt-1 !min-h-10 !py-2 text-[14px]" maxLength={120} value={f.label} onChange={(e) => setzeFeld(si, fi, { label: e.target.value })} />
                    </label>
                    <label className="block text-[13px] font-medium">
                      Art
                      <select className="field-input mt-1 !min-h-10 !py-2 text-[14px]" value={f.typ} onChange={(e) => setzeFeld(si, fi, { typ: e.target.value as BauFeld["typ"] })}>
                        {BAU_TYPEN.map((t) => (
                          <option key={t.typ} value={t.typ}>
                            {t.label}
                          </option>
                        ))}
                      </select>
                    </label>
                    <label className="block text-[13px] font-medium sm:col-span-2">
                      Hilfetext (freiwillig)
                      <input className="field-input mt-1 !min-h-10 !py-2 text-[14px]" maxLength={200} value={f.hinweis ?? ""} onChange={(e) => setzeFeld(si, fi, { hinweis: e.target.value || undefined })} />
                    </label>
                    {(f.typ === "radio" || f.typ === "select") && (
                      <label className="block text-[13px] font-medium sm:col-span-2">
                        Antwortmöglichkeiten (eine je Zeile)
                        <textarea className="field-input mt-1 text-[14px]" rows={3} value={(f.optionen ?? []).join("\n")} onChange={(e) => setzeFeld(si, fi, { optionen: e.target.value.split("\n") })} />
                      </label>
                    )}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                    <label className="flex items-center gap-2 text-[13px]">
                      <input type="checkbox" className="checkbox" checked={f.pflicht} onChange={(e) => setzeFeld(si, fi, { pflicht: e.target.checked })} />
                      Pflichtfeld
                    </label>
                    <span className="flex gap-1">
                      <button type="button" aria-label={`„${f.label || "Feld"}“ nach oben`} disabled={fi === 0} onClick={() => setzeSchritt(si, { felder: verschiebe(s.felder, fi, -1) })} className="pressable grid size-8 place-items-center rounded-full disabled:opacity-30">
                        <Icon name="arrowUp" className="size-4" />
                      </button>
                      <button type="button" aria-label={`„${f.label || "Feld"}“ nach unten`} disabled={fi === s.felder.length - 1} onClick={() => setzeSchritt(si, { felder: verschiebe(s.felder, fi, 1) })} className="pressable grid size-8 place-items-center rounded-full disabled:opacity-30">
                        <Icon name="arrowUp" className="size-4 rotate-180" />
                      </button>
                      <button type="button" aria-label={`„${f.label || "Feld"}“ entfernen`} disabled={s.felder.length === 1} onClick={() => setzeSchritt(si, { felder: s.felder.filter((_, k) => k !== fi) })} className="pressable grid size-8 place-items-center rounded-full disabled:opacity-30">
                        <Icon name="trash" className="size-4" />
                      </button>
                    </span>
                  </div>
                </li>
              ))}
            </ol>
            <button type="button" onClick={() => setzeSchritt(si, { felder: [...s.felder, { label: "", typ: "text", pflicht: false }] })} className="pressable inline-flex items-center gap-2 rounded-full text-[14px] font-medium text-accent">
              <Icon name="plus" className="size-4" />
              Feld hinzufügen
            </button>
          </Glass>
        ))}
        {bau.schritte.length < 8 && (
          <button type="button" onClick={() => setze({ schritte: [...bau.schritte, { titel: "Weitere Angaben", felder: [{ label: "", typ: "text", pflicht: false }] }] })} className="pressable inline-flex items-center gap-2 rounded-full px-2 text-[14px] font-medium text-accent">
            <Icon name="plus" className="size-4" />
            Schritt hinzufügen
          </button>
        )}

        <Glass className="sticky bottom-4 z-10 flex flex-wrap items-center gap-3 rounded-[24px] p-4">
          <label className="flex items-center gap-2 text-[14px] font-medium">
            <input type="checkbox" role="switch" className="checkbox" checked={bau.aktiv} onChange={(e) => setze({ aktiv: e.target.checked })} />
            Veröffentlicht
          </label>
          <Button onClick={speichern} disabled={laedt} className="!min-h-10 px-5 text-[14px]">
            {laedt ? "Wird geprüft …" : "Speichern"}
          </Button>
          {bau.id && bau.aktiv && (
            <a href={`/antrag/${bau.id}`} target="_blank" rel="noopener" className="text-[14px] text-accent underline underline-offset-4">
              Im Portal ansehen
            </a>
          )}
          {bau.id && (
            <button type="button" onClick={loeschen} className="ml-auto text-[14px] text-danger">
              Löschen
            </button>
          )}
        </Glass>
        {meldung && (
          <div role={meldung.ok ? "status" : "alert"} className={`px-2 text-[14px] ${meldung.ok ? "text-success" : "text-danger"}`}>
            <p>{meldung.text}</p>
            {meldung.probleme && (
              <ul className="mt-1 list-disc pl-5">
                {meldung.probleme.map((p) => (
                  <li key={p}>{p}</li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>

      <Vorschau bau={bau} />
    </div>
  );
}

/** Live-Vorschau mit den echten Formularfeldern des Portals. */
function Vorschau({ bau }: { bau: BauLeistung }) {
  const [werte, setWerte] = useState<Record<string, string>>({});
  const leistung = useMemo(() => {
    try {
      return baueLeistung({ ...bau, titel: bau.titel || "Ohne Titel" }, new Set());
    } catch {
      return null;
    }
  }, [bau]);
  if (!leistung?.formular) return null;
  return (
    <aside aria-label="Vorschau" className="min-w-0 xl:sticky xl:top-6">
      <p className="mb-2 px-2 text-[13px] font-medium uppercase tracking-[0.06em] text-subtle">Vorschau</p>
      <Glass className="max-h-[calc(100dvh-6rem)] space-y-8 overflow-y-auto rounded-[24px] p-6">
        <div>
          <h2 className="text-[24px] font-semibold tracking-tight">{tx(leistung.titel, "de")}</h2>
          {bau.kurz && <p className="mt-2 text-[15px] text-muted">{bau.kurz}</p>}
          {leistung.gebuehren.length > 0 && (
            <p className="mt-2 text-[14px]">
              Gebühr: {leistung.gebuehren[0].betrag === null ? "kostenfrei" : new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(leistung.gebuehren[0].betrag as number)}
            </p>
          )}
        </div>
        {leistung.formular.schritte.map((s, i) => (
          <section key={s.id}>
            <p className="text-[12px] text-subtle">
              Schritt {i + 1} von {leistung.formular!.schritte.length}
            </p>
            <h3 className="text-[19px] font-semibold">{tx(s.titel, "de")}</h3>
            {s.beschreibung && <p className="mt-1 text-[14px] text-muted">{tx(s.beschreibung, "de")}</p>}
            <div className="mt-4 grid gap-5 sm:grid-cols-2">
              {s.felder.map((f) => (
                <div key={f.id} className={f.halb ? "" : "sm:col-span-2"}>
                  <Field feld={{ ...f, id: `vorschau-${f.id}`, label: f.label || "(ohne Bezeichnung)" }} wert={werte[f.id] ?? ""} onChange={(v) => setWerte((w) => ({ ...w, [f.id]: v }))} />
                </div>
              ))}
            </div>
          </section>
        ))}
      </Glass>
    </aside>
  );
}
