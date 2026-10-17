"use client";

/** Eigene Abwesenheit mit Vertretung eintragen. */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function VertretungFormular({ kollegen }: { kollegen: string[] }) {
  const router = useRouter();
  const heute = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
  const [von, setVon] = useState(heute);
  const [bis, setBis] = useState(heute);
  const [vertreter, setVertreter] = useState(kollegen[0] ?? "");
  const [meldung, setMeldung] = useState<string | null>(null);
  if (!kollegen.length) return <p className="text-[14px] text-muted">Es gibt keine weiteren Backoffice-Benutzer, die vertreten könnten.</p>;
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const r = await fetch("/api/backoffice/vertretung", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ vertreter, von, bis }) });
        setMeldung(r.ok ? "Eingetragen." : "Bitte Zeitraum prüfen.");
        if (r.ok) router.refresh();
      }}
    >
      <div className="grid gap-3 sm:grid-cols-3">
        <label className="flex flex-col gap-1 text-[13px] text-subtle">
          Abwesend ab
          <input type="date" className="field-input" value={von} onChange={(e) => setVon(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1 text-[13px] text-subtle">
          bis einschließlich
          <input type="date" className="field-input" value={bis} min={von} onChange={(e) => setBis(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1 text-[13px] text-subtle">
          Vertretung
          <select className="field-input" value={vertreter} onChange={(e) => setVertreter(e.target.value)}>
            {kollegen.map((k) => (
              <option key={k}>{k}</option>
            ))}
          </select>
        </label>
      </div>
      <Button type="submit" className="!min-h-10 px-5 text-[14px]">
        Abwesenheit eintragen
      </Button>
      <p aria-live="polite" className="text-[14px] text-muted">
        {meldung}
      </p>
    </form>
  );
}

export function VertretungEntfernen({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="pressable rounded-full px-3 py-1 text-[13px] text-muted hover:text-fg"
      onClick={async () => {
        await fetch("/api/backoffice/vertretung", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
        router.refresh();
      }}
    >
      Entfernen
    </button>
  );
}
