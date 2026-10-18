"use client";

/** Briefwahl im Backoffice: Wahl anlegen, Anträge auswählen und als versandt markieren. */
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

const senden = (body: unknown) => fetch("/api/backoffice/briefwahl", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

export function NeueWahl() {
  const router = useRouter();
  const [fehler, setFehler] = useState<string | null>(null);
  const feld = "field-input mt-1 !min-h-10 !py-2 text-[14px]";
  return (
    <form
      className="grid gap-3 sm:grid-cols-[1fr_auto_auto] sm:items-end"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        const r = await senden({ aktion: "anlegen", titel: String(f.get("titel")).trim(), datum: String(f.get("datum")) });
        if (!r.ok) return setFehler("Bitte Titel und einen Wahltag in der Zukunft angeben.");
        setFehler(null);
        form.reset();
        router.refresh();
      }}
    >
      <label className="block text-[13px] font-medium">
        Wahl
        <input name="titel" required minLength={3} maxLength={120} className={feld} placeholder="z. B. Bürgermeisterwahl" />
      </label>
      <label className="block text-[13px] font-medium">
        Wahltag
        <input name="datum" type="date" required className={feld} />
      </label>
      <Button type="submit" className="!min-h-10 px-5 text-[14px]">
        Anlegen
      </Button>
      {fehler && (
        <p role="alert" className="text-[13px] text-danger sm:col-span-3">
          {fehler}
        </p>
      )}
      <p className="text-[12px] text-subtle sm:col-span-3">Antragsschluss: automatisch der zweite Tag vor der Wahl, 18 Uhr (§ 27 Abs. 4 BWO). Ab sofort ist der Online-Antrag im Portal und im Assistenten zu finden.</p>
    </form>
  );
}

export function WahlLoeschen({ id, titel }: { id: string; titel: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-[13px] text-danger"
      onClick={async () => {
        if (confirm(`„${titel}“ löschen?`) && (await senden({ aktion: "loeschen", id })).ok) router.refresh();
      }}
    >
      Löschen<span className="sr-only">: {titel}</span>
    </button>
  );
}

export interface Zeile {
  id: string;
  name: string;
  geburtsdatum: string;
  versand: string;
  eingang: string;
  status: string;
  erledigt: boolean;
  doppelt: boolean;
}

export function AntragsListe({ zeilen }: { zeilen: Zeile[] }) {
  const router = useRouter();
  const [wahl, setWahl] = useState<Set<string>>(new Set());
  const [status, setStatus] = useState<string | null>(null);
  const offen = zeilen.filter((z) => !z.erledigt);
  const alle = offen.length > 0 && offen.every((z) => wahl.has(z.id));
  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <Button
          type="button"
          disabled={!wahl.size}
          className="!min-h-10 px-5 text-[14px]"
          onClick={async () => {
            const r = await senden({ aktion: "versandt", ids: [...wahl] });
            const d = await r.json().catch(() => ({}));
            setStatus(r.ok ? `${d.anzahl} als versandt markiert – die Antragsteller werden benachrichtigt.` : "Das hat nicht geklappt.");
            setWahl(new Set());
            router.refresh();
          }}
        >
          Unterlagen versandt ({wahl.size})
        </Button>
        {status && (
          <p role="status" className="text-[13px] text-muted">
            {status}
          </p>
        )}
      </div>
      <div className="overflow-x-auto rounded-[20px] border border-[var(--line)]">
        <table className="w-full min-w-[640px] text-left text-[14px]">
          <thead className="text-[12px] text-subtle">
            <tr className="border-b border-[var(--line)]">
              <th className="p-3">
                <input type="checkbox" className="checkbox" aria-label="Alle offenen auswählen" checked={alle} onChange={() => setWahl(alle ? new Set() : new Set(offen.map((z) => z.id)))} />
              </th>
              <th className="p-3 font-medium">Name</th>
              <th className="p-3 font-medium">Geboren</th>
              <th className="p-3 font-medium">Versand</th>
              <th className="p-3 font-medium">Eingang</th>
              <th className="p-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {zeilen.map((z) => (
              <tr key={z.id} className="border-b border-[var(--line)] last:border-0">
                <td className="p-3">
                  {!z.erledigt && (
                    <input
                      type="checkbox"
                      className="checkbox"
                      aria-label={`${z.name} auswählen`}
                      checked={wahl.has(z.id)}
                      onChange={() => setWahl((s) => (s.has(z.id) ? new Set([...s].filter((x) => x !== z.id)) : new Set([...s, z.id])))}
                    />
                  )}
                </td>
                <td className="p-3">
                  <Link href={`/backoffice/vorgang/${z.id}`} className="font-medium underline-offset-2 hover:underline">
                    {z.name}
                  </Link>
                  {z.doppelt && <span className="ms-2 rounded-full bg-[#fef0c7] px-2 py-0.5 text-[11px] font-medium text-[#3a2a00]">Doppelantrag prüfen</span>}
                </td>
                <td className="p-3 tabular-nums">{z.geburtsdatum}</td>
                <td className="p-3">{z.versand}</td>
                <td className="p-3 tabular-nums text-muted">{z.eingang}</td>
                <td className="p-3">{z.status}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
