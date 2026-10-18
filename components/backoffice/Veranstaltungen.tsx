"use client";

/** Redaktion: Veranstaltungen und Ehrenamts-Gesuche anlegen. */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

const feld = "field-input mt-1 !min-h-10 !py-2 text-[14px]";

function useSenden() {
  const router = useRouter();
  const [meldung, setMeldung] = useState<string | null>(null);
  const senden = async (body: object, erfolg: string) => {
    const r = await fetch("/api/backoffice/veranstaltungen", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
    setMeldung(r.ok ? erfolg : "Bitte alle Pflichtangaben prüfen.");
    if (r.ok) router.refresh();
    return r.ok;
  };
  return { meldung, senden };
}

export function VeranstaltungFormular() {
  const { meldung, senden } = useSenden();
  const [anmeldung, setAnmeldung] = useState(false);
  return (
    <form
      className="mt-4 grid gap-3 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const s = (k: string) => String(f.get(k) ?? "").trim() || undefined;
        const ok = await senden(
          {
            art: "veranstaltung",
            titel: s("titel"),
            text: s("text"),
            beginn: s("beginn"),
            ende: s("ende"),
            ort: s("ort"),
            kategorie: s("kategorie") ?? "Sonstiges",
            ferienprogramm: f.get("ferien") === "on",
            anmeldung,
            plaetze: anmeldung && s("plaetze") ? Number(s("plaetze")) : undefined,
            kosten: s("kosten"),
            alter: s("alter"),
          },
          "Veröffentlicht.",
        );
        if (ok) e.currentTarget.reset();
      }}
    >
      <label className="block text-[13px] font-medium sm:col-span-2">
        Titel
        <input name="titel" required maxLength={120} className={feld} />
      </label>
      <label className="block text-[13px] font-medium sm:col-span-2">
        Beschreibung
        <textarea name="text" required maxLength={2000} rows={3} className="field-input mt-1 text-[14px]" />
      </label>
      <label className="block text-[13px] font-medium">
        Beginn
        <input name="beginn" type="datetime-local" required className={feld} />
      </label>
      <label className="block text-[13px] font-medium">
        Ende (freiwillig)
        <input name="ende" type="datetime-local" className={feld} />
      </label>
      <label className="block text-[13px] font-medium">
        Ort
        <input name="ort" required maxLength={160} className={feld} />
      </label>
      <label className="block text-[13px] font-medium">
        Kategorie
        <input name="kategorie" maxLength={40} list="kategorien" className={feld} placeholder="z. B. Kurs" />
        <datalist id="kategorien">
          {["Fest", "Kultur", "Kurs", "Sport", "Markt", "Sitzung"].map((k) => (
            <option key={k} value={k} />
          ))}
        </datalist>
      </label>
      <label className="block text-[13px] font-medium">
        Kosten (freiwillig)
        <input name="kosten" maxLength={60} className={feld} placeholder="kostenfrei" />
      </label>
      <label className="block text-[13px] font-medium">
        Alter (freiwillig)
        <input name="alter" maxLength={40} className={feld} placeholder="z. B. 6–10 Jahre" />
      </label>
      <label className="flex items-center gap-2 text-[14px]">
        <input name="ferien" type="checkbox" className="checkbox" /> Ferienprogramm
      </label>
      <label className="flex items-center gap-2 text-[14px]">
        <input type="checkbox" className="checkbox" checked={anmeldung} onChange={(e) => setAnmeldung(e.target.checked)} /> Mit Anmeldung
      </label>
      {anmeldung && (
        <label className="block text-[13px] font-medium">
          Plätze (leer = unbegrenzt)
          <input name="plaetze" type="number" min={1} max={5000} className={feld} />
        </label>
      )}
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" className="!min-h-10 px-5 text-[14px]">
          Veröffentlichen
        </Button>
        <p role="status" className="text-[13px] text-muted">
          {meldung}
        </p>
      </div>
    </form>
  );
}

export function EhrenamtFormular() {
  const { meldung, senden } = useSenden();
  return (
    <form
      className="mt-4 grid gap-3 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const s = (k: string) => String(f.get(k) ?? "").trim() || undefined;
        const ok = await senden({ art: "ehrenamt", titel: s("titel"), organisation: s("organisation"), text: s("text"), ort: s("ort"), zeit: s("zeit"), kategorie: s("kategorie") ?? "Sonstiges", kontaktEmail: s("kontaktEmail"), bis: s("bis") }, "Gesuch veröffentlicht.");
        if (ok) e.currentTarget.reset();
      }}
    >
      <label className="block text-[13px] font-medium sm:col-span-2">
        Wer wird gesucht?
        <input name="titel" required maxLength={120} className={feld} placeholder="z. B. Helfer/innen für das Stadtfest" />
      </label>
      <label className="block text-[13px] font-medium">
        Organisation
        <input name="organisation" required maxLength={120} className={feld} />
      </label>
      <label className="block text-[13px] font-medium">
        Kategorie
        <input name="kategorie" maxLength={40} className={feld} placeholder="z. B. Soziales" />
      </label>
      <label className="block text-[13px] font-medium sm:col-span-2">
        Beschreibung
        <textarea name="text" required maxLength={2000} rows={3} className="field-input mt-1 text-[14px]" />
      </label>
      <label className="block text-[13px] font-medium">
        Ort
        <input name="ort" required maxLength={160} className={feld} />
      </label>
      <label className="block text-[13px] font-medium">
        Zeitaufwand
        <input name="zeit" required maxLength={120} className={feld} placeholder="z. B. 2 Stunden im Juni" />
      </label>
      <label className="block text-[13px] font-medium">
        E-Mail für Rückmeldungen (nicht öffentlich)
        <input name="kontaktEmail" type="email" className={feld} />
      </label>
      <label className="block text-[13px] font-medium">
        Sichtbar bis (freiwillig)
        <input name="bis" type="date" className={feld} />
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <Button type="submit" className="!min-h-10 px-5 text-[14px]">
          Veröffentlichen
        </Button>
        <p role="status" className="text-[13px] text-muted">
          {meldung}
        </p>
      </div>
    </form>
  );
}

export function VeranstaltungLoeschen({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="text-danger"
      onClick={async () => {
        if (!confirm("Veranstaltung entfernen? Angemeldete Personen werden nicht automatisch benachrichtigt.")) return;
        const r = await fetch("/api/backoffice/veranstaltungen", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ id }) });
        if (r.ok) router.refresh();
      }}
    >
      Entfernen
    </button>
  );
}
