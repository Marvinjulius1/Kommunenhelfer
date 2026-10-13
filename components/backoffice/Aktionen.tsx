"use client";

/** Interaktive Teile des Backoffice: Anmeldung, Abmeldung, Filter, Status, Rückfrage. */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

export function AnmeldeFormular() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [passwort, setPasswort] = useState("");
  const [fehler, setFehler] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);
  const senden = async (e: React.FormEvent) => {
    e.preventDefault();
    setLaedt(true);
    setFehler(null);
    const res = await fetch("/api/backoffice/anmelden", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, passwort }) });
    setLaedt(false);
    if (res.ok) {
      router.replace("/backoffice");
      router.refresh(); // Kopfzeile (Layout) mit Benutzer neu laden
    }
    else setFehler(res.status === 429 ? "Zu viele Versuche. Bitte warten Sie 15 Minuten." : "Benutzername oder Passwort ist nicht korrekt.");
  };
  return (
    <form onSubmit={senden} className="space-y-4">
      <div>
        <label htmlFor="bo-name" className="text-[14px] font-medium">
          Benutzername
        </label>
        <input id="bo-name" className="field-input mt-1" autoComplete="username" value={name} onChange={(e) => setName(e.target.value)} required />
      </div>
      <div>
        <label htmlFor="bo-pw" className="text-[14px] font-medium">
          Passwort
        </label>
        <input id="bo-pw" type="password" className="field-input mt-1" autoComplete="current-password" value={passwort} onChange={(e) => setPasswort(e.target.value)} required />
      </div>
      {fehler && (
        <p role="alert" className="text-[14px] text-danger">
          {fehler}
        </p>
      )}
      <Button type="submit" disabled={laedt} className="w-full">
        {laedt ? "Anmeldung …" : "Anmelden"}
      </Button>
    </form>
  );
}

export function AbmeldenButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="pressable rounded-full px-4 py-2 text-[14px] text-muted hover:text-fg"
      onClick={async () => {
        await fetch("/api/backoffice/abmelden", { method: "POST" });
        router.replace("/backoffice/anmelden");
        router.refresh();
      }}
    >
      Abmelden
    </button>
  );
}

export function FilterSelect({ name, wert, optionen, label }: { name: string; wert: string; optionen: { wert: string; label: string }[]; label: string }) {
  const router = useRouter();
  return (
    <label className="flex flex-col gap-1 text-[13px] text-subtle">
      {label}
      <select
        className="field-input !min-h-10 w-52 !py-2 text-[14px] text-fg"
        value={wert}
        onChange={(e) => {
          const p = new URLSearchParams(window.location.search);
          if (e.target.value) p.set(name, e.target.value);
          else p.delete(name);
          router.push(`/backoffice?${p.toString()}`);
        }}
      >
        {optionen.map((o) => (
          <option key={o.wert} value={o.wert}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function VorgangAktionen({ id, status, statusOptionen }: { id: string; status: string; statusOptionen: { wert: string; label: string }[] }) {
  const router = useRouter();
  const [neu, setNeu] = useState(status);
  const [text, setText] = useState("");
  const [meldung, setMeldung] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);

  const anfrage = async (method: "PATCH" | "POST", body: object, erfolg: string) => {
    setLaedt(true);
    setMeldung(null);
    const res = await fetch(`/api/backoffice/vorgang/${encodeURIComponent(id)}`, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setLaedt(false);
    setMeldung(res.ok ? erfolg : "Das hat nicht geklappt. Bitte erneut versuchen.");
    if (res.ok) router.refresh();
    return res.ok;
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-2">
        <label className="flex flex-col gap-1 text-[13px] text-subtle">
          Status
          <select className="field-input !min-h-10 w-52 !py-2 text-[14px] text-fg" value={neu} onChange={(e) => setNeu(e.target.value)}>
            {statusOptionen.map((o) => (
              <option key={o.wert} value={o.wert}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
        <Button className="!min-h-10 px-4 text-[14px]" disabled={laedt || neu === status} onClick={() => anfrage("PATCH", { status: neu }, "Status gespeichert.")}>
          Speichern
        </Button>
      </div>
      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await anfrage("POST", { rueckfrage: text }, "Rückfrage gesendet. Der Bürger wird per E-Mail informiert.")) setText("");
        }}
        className="space-y-2"
      >
        <label htmlFor="rueckfrage" className="text-[14px] font-medium">
          Rückfrage an den Bürger
        </label>
        <textarea id="rueckfrage" rows={3} className="field-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} placeholder="Zum Beispiel: Bitte senden Sie uns noch eine Kopie Ihres Versicherungsscheins." />
        <Button type="submit" variant="glass" className="!min-h-10 px-4 text-[14px]" disabled={laedt || text.trim().length < 3}>
          Rückfrage senden
        </Button>
      </form>
      <p aria-live="polite" className="text-[14px] text-muted">
        {meldung}
      </p>
    </div>
  );
}
