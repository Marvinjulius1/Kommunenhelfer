"use client";

/**
 * Krisenmodus im Backoffice: Vorlage wählen, anpassen, aktivieren – dann Lagemeldungen
 * nachschieben und am Ende beenden. Listen als eine Zeile je Eintrag (schnell im Krisenstab).
 */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { KRISEN_ARTEN, VORLAGEN, type KrisenArt, type Lage } from "@/lib/krise/vorlagen";

const senden = (body: unknown) => fetch("/api/backoffice/krise", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
const zeilen = (s: string) => s.split("\n").map((z) => z.trim()).filter(Boolean);

export function KrisenFormular({ start, aktiv, gemeinde, pushAktiv }: { start: Omit<Lage, "meldungen">; aktiv: boolean; gemeinde: string; pushAktiv: boolean }) {
  const router = useRouter();
  const [art, setArt] = useState<KrisenArt>(start.art);
  const [stufe, setStufe] = useState(start.stufe);
  const [titel, setTitel] = useState(start.titel);
  const [text, setText] = useState(start.text);
  const [tipps, setTipps] = useState(start.tipps.join("\n"));
  const [hotline, setHotline] = useState(start.hotline ?? "");
  const [notrufe, setNotrufe] = useState(start.notrufe.map((n) => `${n.label}: ${n.nummer}`).join("\n"));
  const [stellen, setStellen] = useState(start.anlaufstellen.map((a) => [a.name, a.adresse ?? "", a.info ?? ""].join(" | ").replace(/( \| )+$/, "")).join("\n"));
  const [push, setPush] = useState(pushAktiv && !aktiv);
  const [meldung, setMeldung] = useState<{ ok: boolean; text: string } | null>(null);
  const [laedt, setLaedt] = useState(false);
  const feld = "field-input mt-1 text-[14px]";

  const vorlage = (a: KrisenArt) => {
    setArt(a);
    const v = VORLAGEN[a];
    setStufe(v.stufe);
    setTitel(v.titel);
    setText(v.text.replace(/\{gemeinde\}/g, gemeinde));
    setTipps(v.tipps.join("\n"));
  };

  const speichern = async (e: React.FormEvent) => {
    e.preventDefault();
    const nr = zeilen(notrufe).map((z) => {
      const i = z.lastIndexOf(":");
      return { label: z.slice(0, i).trim(), nummer: z.slice(i + 1).trim() };
    });
    if (nr.some((n) => !n.label || !n.nummer)) return setMeldung({ ok: false, text: "Notrufe bitte als „Bezeichnung: Nummer“ eintragen." });
    const anlaufstellen = zeilen(stellen).map((z) => {
      const [name, adresse, info] = z.split("|").map((x) => x.trim());
      return { name, adresse: adresse || undefined, info: info || undefined };
    });
    setLaedt(true);
    setMeldung(null);
    const r = await senden({ aktion: "setzen", push, lage: { art, stufe, titel, text, tipps: zeilen(tipps), hotline: hotline || undefined, notrufe: nr, anlaufstellen } });
    const d = await r.json().catch(() => ({}));
    setLaedt(false);
    if (!r.ok) return setMeldung({ ok: false, text: r.status === 403 ? "Dafür fehlt die Rolle „redaktion“." : "Bitte Eingaben prüfen (Nummern nur aus Ziffern, Leerzeichen, + und -)." });
    setMeldung({ ok: true, text: `${aktiv ? "Gespeichert" : "Krisenmodus ist aktiv – die Startseite zeigt jetzt die Lage"}.${d.gesendet ? ` Push an ${d.gesendet} Geräte.` : ""}` });
    setPush(false);
    router.refresh();
  };

  return (
    <form onSubmit={speichern} className="grid gap-4">
      <fieldset>
        <legend className="text-[13px] font-medium">Vorlage</legend>
        <div className="mt-2 flex flex-wrap gap-2">
          {KRISEN_ARTEN.map((a) => (
            <button key={a} type="button" aria-pressed={art === a} onClick={() => vorlage(a)} className={`pressable rounded-full border px-3 py-1.5 text-[13px] ${art === a ? "border-accent bg-accent text-on-accent" : "border-[var(--line)]"}`}>
              {VORLAGEN[a].label}
            </button>
          ))}
        </div>
        <p className="mt-1 text-[12px] text-subtle">Füllt Titel, Text und Verhaltenstipps vor – bitte an die Lage anpassen.</p>
      </fieldset>
      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <label className="block text-[13px] font-medium">
          Titel
          <input className={feld} value={titel} onChange={(e) => setTitel(e.target.value)} required minLength={3} maxLength={100} />
        </label>
        <label className="block text-[13px] font-medium">
          Stufe
          <select className={feld} value={stufe} onChange={(e) => setStufe(e.target.value as typeof stufe)}>
            <option value="warnung">Warnung (gelb)</option>
            <option value="gefahr">Gefahr (rot)</option>
          </select>
        </label>
      </div>
      <label className="block text-[13px] font-medium">
        Was ist los, wo, was sollen die Menschen tun?
        <textarea className={feld} rows={4} value={text} onChange={(e) => setText(e.target.value)} required minLength={3} maxLength={3000} />
      </label>
      <label className="block text-[13px] font-medium">
        Verhaltenstipps <span className="font-normal text-subtle">(einer je Zeile)</span>
        <textarea className={feld} rows={5} value={tipps} onChange={(e) => setTipps(e.target.value)} />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-[13px] font-medium">
          Bürgertelefon / Hotline
          <input className={feld} value={hotline} onChange={(e) => setHotline(e.target.value)} maxLength={40} inputMode="tel" />
        </label>
        <label className="block text-[13px] font-medium">
          Notrufe <span className="font-normal text-subtle">(„Bezeichnung: Nummer“)</span>
          <textarea className={feld} rows={3} value={notrufe} onChange={(e) => setNotrufe(e.target.value)} />
        </label>
      </div>
      <label className="block text-[13px] font-medium">
        Anlaufstellen <span className="font-normal text-subtle">(„Name | Adresse | Info“, eine je Zeile – z. B. Sandsack-Ausgabe, Notunterkunft, Wasserausgabe)</span>
        <textarea className={feld} rows={3} value={stellen} onChange={(e) => setStellen(e.target.value)} placeholder="Sandsack-Ausgabe Bauhof | Industriestraße 4 | täglich 7–20 Uhr" />
      </label>
      {pushAktiv && (
        <label className="flex items-center gap-2 text-[14px]">
          <input type="checkbox" className="checkbox" checked={push} onChange={(e) => setPush(e.target.checked)} /> Push-Nachricht an alle, die Meldungen abonniert haben
        </label>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" disabled={laedt} className={aktiv ? "" : "!bg-[#b42318] !text-white"}>
          {laedt ? "Wird gespeichert …" : aktiv ? "Lage aktualisieren" : "Krisenmodus aktivieren"}
        </Button>
        {meldung && (
          <p role={meldung.ok ? "status" : "alert"} className={`text-[14px] ${meldung.ok ? "text-success" : "text-danger"}`}>
            {meldung.text}
          </p>
        )}
      </div>
    </form>
  );
}

export function Lagemeldung({ pushAktiv }: { pushAktiv: boolean }) {
  const router = useRouter();
  const [text, setText] = useState("");
  const [push, setPush] = useState(false);
  const [status, setStatus] = useState<string | null>(null);
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await senden({ aktion: "melden", text, push });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) return setStatus("Konnte nicht veröffentlicht werden.");
        setText("");
        setStatus(`Veröffentlicht.${d.gesendet ? ` Push an ${d.gesendet} Geräte.` : ""}`);
        router.refresh();
      }}
    >
      <label className="block text-[13px] font-medium">
        Neue Lagemeldung
        <textarea className="field-input mt-1 text-[14px]" rows={3} value={text} onChange={(e) => setText(e.target.value)} required minLength={3} maxLength={1000} placeholder="z. B. 14:30 Uhr: Pegel steigt nicht weiter. Sandsack-Ausgabe bis 22 Uhr verlängert." />
      </label>
      {pushAktiv && (
        <label className="flex items-center gap-2 text-[14px]">
          <input type="checkbox" className="checkbox" checked={push} onChange={(e) => setPush(e.target.checked)} /> auch als Push-Nachricht
        </label>
      )}
      <div className="flex flex-wrap items-center gap-3">
        <Button type="submit" className="!min-h-10 px-5 text-[14px]">
          Veröffentlichen
        </Button>
        {status && (
          <p role="status" className="text-[13px] text-muted">
            {status}
          </p>
        )}
      </div>
    </form>
  );
}

export function KriseBeenden() {
  const router = useRouter();
  return (
    <Button
      type="button"
      variant="glass"
      onClick={async () => {
        if (!confirm("Krisenmodus beenden? Die Startseite zeigt wieder das Bürgerportal.")) return;
        if ((await senden({ aktion: "beenden" })).ok) router.refresh();
      }}
    >
      Krisenmodus beenden
    </Button>
  );
}
