"use client";

/** Leistungen übernehmen: XZuFi-Datei wählen, Vorschau prüfen, auswählen, übernehmen. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

interface Vorschau {
  quelleId: string;
  titel: string;
  kurz: string;
  leistungsschluessel?: string;
  unterlagen: string[];
  gebuehren: { bezeichnung: string; betrag: number | null | string }[];
  vorhanden?: string;
}

const senden = (body: unknown) => fetch("/api/backoffice/import", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const betrag = (b: number | null | string) => (b === null ? "kostenfrei" : typeof b === "number" ? new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(b) : b);

export function LeistungsImport({ aemter }: { aemter: { id: string; name: string }[] }) {
  const router = useRouter();
  const [xml, setXml] = useState<string | null>(null);
  const [liste, setListe] = useState<Vorschau[] | null>(null);
  const [wahl, setWahl] = useState<Set<string>>(new Set());
  const [amtId, setAmtId] = useState(aemter[0]?.id ?? "");
  const [meldung, setMeldung] = useState<{ ok: boolean; text: string } | null>(null);
  const [laedt, setLaedt] = useState(false);

  const datei = async (f: File | undefined) => {
    setListe(null);
    setMeldung(null);
    if (!f) return;
    if (f.size > 5_000_000) return setMeldung({ ok: false, text: "Die Datei ist größer als 5 MB – bitte in Teilen exportieren." });
    const text = await f.text();
    setLaedt(true);
    const r = await senden({ aktion: "vorschau", xml: text });
    const d = await r.json().catch(() => ({}));
    setLaedt(false);
    if (!r.ok) return setMeldung({ ok: false, text: d.probleme?.join("; ") ?? "Die Datei konnte nicht gelesen werden." });
    setXml(text);
    setListe(d.leistungen);
    setWahl(new Set((d.leistungen as Vorschau[]).filter((x) => !x.vorhanden).map((x) => x.quelleId)));
    if (!d.leistungen.length) setMeldung({ ok: false, text: "In der Datei wurden keine Leistungen gefunden." });
  };

  return (
    <div className="space-y-5">
      <label className="block text-[14px] font-medium">
        XZuFi-Datei (XML)
        <input type="file" accept=".xml,application/xml,text/xml" onChange={(e) => datei(e.target.files?.[0])} className="mt-2 block w-full text-[13px] text-muted file:mr-3 file:rounded-full file:border-0 file:bg-[var(--line)] file:px-4 file:py-2 file:text-[13px] file:text-fg" />
      </label>
      {laedt && <p className="text-[14px] text-muted">Wird gelesen …</p>}
      {liste && liste.length > 0 && (
        <>
          <ul className="divide-y divide-[var(--line)] rounded-[20px] border border-[var(--line)]">
            {liste.map((x) => (
              <li key={x.quelleId} className="flex gap-3 p-4">
                <input
                  type="checkbox"
                  className="checkbox mt-1"
                  disabled={!!x.vorhanden}
                  checked={wahl.has(x.quelleId)}
                  aria-label={`${x.titel} übernehmen`}
                  onChange={() => setWahl((s) => (s.has(x.quelleId) ? new Set([...s].filter((y) => y !== x.quelleId)) : new Set([...s, x.quelleId])))}
                />
                <div className="min-w-0 text-[14px]">
                  <p className="font-medium">
                    {x.titel}
                    {x.leistungsschluessel && <span className="ms-2 font-mono text-[12px] text-subtle">{x.leistungsschluessel}</span>}
                  </p>
                  {x.kurz.replace(/\.$/, "") !== x.titel && <p className="mt-0.5 text-muted">{x.kurz}</p>}
                  <p className="mt-1 text-[12px] text-subtle">
                    {x.unterlagen.length} Unterlagen · {x.gebuehren.length ? x.gebuehren.map((g) => betrag(g.betrag)).join(", ") : "keine Kostenangabe"}
                    {x.vorhanden && <span className="text-[#8a5a00] dark:text-[#f5c46b]"> · schon vorhanden als „{x.vorhanden}“</span>}
                  </p>
                </div>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap items-end gap-3">
            <label className="block text-[13px] font-medium">
              Zuständiges Amt
              <select className="field-input mt-1 !min-h-10 !py-2 text-[14px]" value={amtId} onChange={(e) => setAmtId(e.target.value)}>
                {aemter.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            </label>
            <Button
              type="button"
              disabled={!wahl.size || laedt}
              className="!min-h-10 px-5 text-[14px]"
              onClick={async () => {
                setLaedt(true);
                const r = await senden({ aktion: "uebernehmen", xml, auswahl: [...wahl], amtId });
                const d = await r.json().catch(() => ({}));
                setLaedt(false);
                if (!r.ok) return setMeldung({ ok: false, text: d.probleme?.join("; ") ?? (d.fehler === "nichts_neu" ? "Alle ausgewählten Leistungen gibt es schon." : "Übernahme fehlgeschlagen.") });
                setMeldung({ ok: true, text: `${d.ids.length} Leistung${d.ids.length === 1 ? "" : "en"} übernommen – sofort im Portal und im Assistenten.` });
                setListe(null);
                setXml(null);
                router.refresh();
              }}
            >
              {wahl.size} übernehmen
            </Button>
          </div>
        </>
      )}
      {meldung && (
        <p role={meldung.ok ? "status" : "alert"} className={`text-[14px] ${meldung.ok ? "text-success" : "text-danger"}`}>
          {meldung.text}
        </p>
      )}
    </div>
  );
}

export function UebernommeneLeistung({ id, titel, onlineFormular }: { id: string; titel: string; onlineFormular: boolean }) {
  const router = useRouter();
  return (
    <li className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1 py-3 text-[14px]">
      <Link href={`/leistungen/${id}`} target="_blank" className="font-medium underline-offset-2 hover:underline">
        {titel}
      </Link>
      <span className="flex items-center gap-3">
        <span className="text-muted">{onlineFormular ? "mit Online-Formular" : "Info-Seite"}</span>
        <button
          type="button"
          className="text-[13px] text-danger"
          onClick={async () => {
            if (confirm(`„${titel}“ aus dem Portal entfernen?`) && (await senden({ aktion: "entfernen", id })).ok) router.refresh();
          }}
        >
          Entfernen<span className="sr-only">: {titel}</span>
        </button>
      </span>
    </li>
  );
}
