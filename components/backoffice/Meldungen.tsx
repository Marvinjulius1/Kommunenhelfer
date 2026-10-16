"use client";

/** Meldung verfassen (Straßensperrung, Wasserrohrbruch …) und optional per Push verteilen. */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function MeldungFormular({ ortsteile, pushAktiv }: { ortsteile: string[]; pushAktiv: boolean }) {
  const router = useRouter();
  const morgen = new Date(Date.now() + 7 * 86400_000).toISOString().slice(0, 10);
  const [titel, setTitel] = useState("");
  const [text, setText] = useState("");
  const [ortsteil, setOrtsteil] = useState("");
  const [bis, setBis] = useState(morgen);
  const [wichtig, setWichtig] = useState(false);
  const [push, setPush] = useState(pushAktiv);
  const [meldung, setMeldung] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);

  const senden = async (e: React.FormEvent) => {
    e.preventDefault();
    setLaedt(true);
    setMeldung(null);
    const r = await fetch("/api/backoffice/meldungen", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ titel, text, ortsteil: ortsteil || undefined, gueltigBis: bis, wichtig, push }),
    });
    setLaedt(false);
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return setMeldung(r.status === 403 ? "Dafür fehlt Ihnen die Berechtigung (Rolle „redaktion“)." : "Bitte Eingaben prüfen.");
    setTitel("");
    setText("");
    setMeldung(`Veröffentlicht.${push ? ` Push an ${d.gesendet} Gerät${d.gesendet === 1 ? "" : "e"} gesendet.` : ""}`);
    router.refresh();
  };

  return (
    <form onSubmit={senden} className="space-y-3">
      <input className="field-input" placeholder="Titel, z. B. Vollsperrung Hauptstraße" value={titel} onChange={(e) => setTitel(e.target.value)} required minLength={3} maxLength={120} aria-label="Titel" />
      <textarea className="field-input" rows={4} placeholder="Was ist los, wie lange, was sollen Bürgerinnen und Bürger tun?" value={text} onChange={(e) => setText(e.target.value)} required minLength={3} maxLength={2000} aria-label="Text" />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[13px] text-subtle">
          Ortsteil
          <select className="field-input" value={ortsteil} onChange={(e) => setOrtsteil(e.target.value)}>
            <option value="">Ganze Gemeinde</option>
            {ortsteile.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[13px] text-subtle">
          Sichtbar bis
          <input type="date" className="field-input" value={bis} onChange={(e) => setBis(e.target.value)} required />
        </label>
      </div>
      <label className="flex items-center gap-2 text-[14px]">
        <input type="checkbox" className="checkbox" checked={wichtig} onChange={(e) => setWichtig(e.target.checked)} /> Wichtig (oben anzeigen)
      </label>
      {pushAktiv && (
        <label className="flex items-center gap-2 text-[14px]">
          <input type="checkbox" className="checkbox" checked={push} onChange={(e) => setPush(e.target.checked)} /> Als Push-Nachricht an Abonnenten senden
        </label>
      )}
      <Button type="submit" disabled={laedt} className="!min-h-10 px-5 text-[14px]">
        Veröffentlichen
      </Button>
      <p aria-live="polite" className="text-[14px] text-muted">
        {meldung}
      </p>
    </form>
  );
}

export function MeldungEntfernen({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="pressable rounded-full px-3 py-1 text-[13px] text-muted hover:text-danger"
      onClick={async () => {
        if (!confirm("Meldung wirklich entfernen?")) return;
        await fetch("/api/backoffice/meldungen", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
        router.refresh();
      }}
    >
      Entfernen
    </button>
  );
}
