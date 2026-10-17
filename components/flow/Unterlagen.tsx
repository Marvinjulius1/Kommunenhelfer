"use client";

/**
 * Unterlagen im Online-Antrag: zeigt, was gebraucht wird, nimmt Dateien,
 * Fotos oder Dokumente aus dem Safe an und ordnet sie zu.
 * Die Erkennung schlägt nur vor – Bürger können jede Zuordnung ändern.
 */
import { useState } from "react";
import type { Leistung } from "@/config/types";
import { useTenant } from "@/components/TenantProvider";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { Vorschau } from "@/components/upload/AttachmentTray";
import { ConsentSheet } from "@/components/upload/ConsentSheet";
import { SafeSheet } from "@/components/upload/SafeSheet";
import { ScanSheet } from "@/components/upload/ScanSheet";
import type { Anhang, useUploads } from "@/lib/client/uploads";
import { deutsch, tx } from "@/lib/i18n";
import { dokumentarten } from "@/lib/uploads/dokumentarten";
import { ACCEPT, formatGroesse } from "@/lib/uploads/formate";
import { artLabel } from "@/lib/uploads/pruefung";

type Uploads = ReturnType<typeof useUploads>;

/** Zuordnung je Datei: manuelle Wahl > erkannte Art (falls gefragt) > erste noch fehlende Art */
export function zuordnung(leistung: Leistung, anhaenge: Anhang[], manuell: Record<string, string>): Record<string, string> {
  const gefragt = (leistung.dokumente ?? []).map((d) => d.art);
  const ergebnis: Record<string, string> = {};
  const belegt = new Set<string>();
  for (const a of anhaenge) {
    if (manuell[a.lokalId]) ergebnis[a.lokalId] = manuell[a.lokalId];
    else if (a.art && gefragt.includes(a.art)) ergebnis[a.lokalId] = a.art;
    if (ergebnis[a.lokalId]) belegt.add(ergebnis[a.lokalId]);
  }
  for (const a of anhaenge) {
    if (ergebnis[a.lokalId] || a.status !== "fertig") continue;
    const frei = gefragt.find((g) => !belegt.has(g));
    ergebnis[a.lokalId] = frei ?? a.art ?? "sonstiges";
    belegt.add(ergebnis[a.lokalId]);
  }
  return ergebnis;
}

export function abgedeckt(arten: string[]): Set<string> {
  const s = new Set(arten);
  // Personalausweis und Reisepass gelten wechselseitig als Identitätsnachweis
  if (s.has("reisepass")) s.add("personalausweis");
  if (s.has("personalausweis")) s.add("reisepass");
  return s;
}

export function Unterlagen({ leistung, up, manuell, setManuell, fehlerAnzeigen }: { leistung: Leistung; up: Uploads; manuell: Record<string, string>; setManuell: (m: Record<string, string>) => void; fehlerAnzeigen: boolean }) {
  const { tenant, lang, konto } = useTenant();
  const de = deutsch(lang);
  const [scan, setScan] = useState(false);
  const [safe, setSafe] = useState(false);
  const gefragt = leistung.dokumente ?? [];
  const zu = zuordnung(leistung, up.anhaenge, manuell);
  const vorhanden = abgedeckt(up.anhaenge.filter((a) => a.status === "fertig").map((a) => zu[a.lokalId]));
  const artenAuswahl = [...new Set([...gefragt.map((d) => d.art), ...dokumentarten(tenant).map((d) => d.id)])];

  return (
    <div className="space-y-4">
      <ConsentSheet offen={up.einwilligungNoetig} onJa={up.einwilligen} onNein={up.ablehnen} />
      <ScanSheet offen={scan} onClose={() => setScan(false)} onFertig={(f) => up.hinzufuegen([f])} />
      {konto && <SafeSheet offen={safe} onClose={() => setSafe(false)} onWahl={up.ausSafe} />}

      <Glass className="rounded-[24px] p-6">
        <h2 className="text-[15px] font-semibold">{de ? "Das brauchen wir" : "What we need"}</h2>
        <ul className="mt-3 space-y-3">
          {gefragt.map((d) => {
            const ok = vorhanden.has(d.art);
            return (
              <li key={d.art} className="flex items-start gap-3 text-[15px]">
                <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${ok ? "bg-accent text-on-accent" : "border border-[var(--field-border)]"}`} aria-hidden="true">
                  {ok && <Icon name="check" className="size-3" />}
                </span>
                <span>
                  {artLabel(tenant, d.art, lang)}
                  <span className="text-subtle">{d.pflicht ? "" : de ? " (freiwillig)" : " (optional)"}</span>
                  {d.hinweis && <span className="block text-[13px] text-subtle">{tx(d.hinweis, lang)}</span>}
                  <span className="sr-only">{ok ? (de ? " – vorhanden" : " – provided") : de ? " – fehlt noch" : " – missing"}</span>
                  {!ok && d.pflicht && fehlerAnzeigen && <span className="block text-[13px] text-danger">{de ? "Bitte noch hinzufügen." : "Please add."}</span>}
                </span>
              </li>
            );
          })}
        </ul>
      </Glass>

      <div className="flex flex-wrap gap-2">
        <label className="glass pressable flex cursor-pointer items-center gap-2 rounded-full px-5 py-3 text-[15px] font-medium focus-within:ring-2 focus-within:ring-accent">
          <Icon name="paperclip" className="size-4" />
          {de ? "Datei auswählen" : "Choose file"}
          <input
            type="file"
            multiple
            accept={ACCEPT}
            className="sr-only"
            onChange={(e) => {
              up.hinzufuegen([...(e.target.files ?? [])]);
              e.target.value = "";
            }}
          />
        </label>
        <button type="button" onClick={() => setScan(true)} className="glass pressable flex items-center gap-2 rounded-full px-5 py-3 text-[15px] font-medium">
          <Icon name="camera" className="size-4" />
          {de ? "Fotografieren" : "Take photo"}
        </button>
        {konto && (
          <button type="button" onClick={() => setSafe(true)} className="glass pressable flex items-center gap-2 rounded-full px-5 py-3 text-[15px] font-medium">
            <Icon name="lock" className="size-4" />
            {de ? "Aus meinem Safe" : "From my safe"}
          </button>
        )}
      </div>

      <div aria-live="polite">{up.hinweis && <p className="text-[14px] text-muted">{up.hinweis}</p>}</div>

      {up.anhaenge.length > 0 && (
        <ul className="space-y-2" aria-label={de ? "Hinzugefügte Unterlagen" : "Added documents"}>
          {up.anhaenge.map((a) => (
            <li key={a.lokalId}>
              <Glass className="flex flex-wrap items-center gap-3 rounded-[20px] p-3">
                <Vorschau src={a.vorschau} typ={a.typ} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[14px] font-medium">{a.name}</p>
                  <p className="text-[12px] text-subtle">
                    {a.status === "laedt"
                      ? de
                        ? `Wird geprüft und hochgeladen … ${Math.round(a.fortschritt * 100)} %`
                        : `Checking and uploading … ${Math.round(a.fortschritt * 100)}%`
                      : a.status === "fehler"
                        ? a.fehler
                        : `${formatGroesse(a.groesse, lang)}${a.seiten ? ` · ${a.seiten} ${de ? (a.seiten === 1 ? "Seite" : "Seiten") : a.seiten === 1 ? "page" : "pages"}` : ""}`}
                  </p>
                </div>
                {a.status === "fertig" && (
                  <label className="text-[13px] text-subtle">
                    <span className="sr-only">{de ? `Art des Dokuments ${a.name}` : `Type of ${a.name}`}</span>
                    <select className="field-input !min-h-9 !py-1 text-[13px]" value={zu[a.lokalId]} onChange={(e) => setManuell({ ...manuell, [a.lokalId]: e.target.value })}>
                      {artenAuswahl.map((id) => (
                        <option key={id} value={id}>
                          {artLabel(tenant, id, lang)}
                        </option>
                      ))}
                    </select>
                  </label>
                )}
                {a.status === "fehler" && a.netzFehler && (
                  <button type="button" onClick={() => up.erneut(a.lokalId)} className="pressable rounded-full px-3 py-1 text-[13px]">
                    {de ? "Erneut" : "Retry"}
                  </button>
                )}
                <button type="button" onClick={() => up.entfernen(a.lokalId)} aria-label={de ? `${a.name} entfernen` : `Remove ${a.name}`} className="pressable grid size-9 place-items-center rounded-full text-subtle hover:text-fg">
                  <Icon name="close" className="size-4" />
                </button>
              </Glass>
            </li>
          ))}
        </ul>
      )}
      <p className="text-[13px] leading-relaxed text-subtle">
        {de
          ? `PDF, JPG, PNG oder HEIC, bis ${tenant.uploads.maxDateiMB} MB je Datei. Die Dateien werden auf Schadsoftware geprüft und verschlüsselt gespeichert.`
          : `PDF, JPG, PNG or HEIC, up to ${tenant.uploads.maxDateiMB} MB per file. Files are scanned for malware and stored encrypted.`}
      </p>
    </div>
  );
}
