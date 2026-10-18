"use client";

/** „Mein Haushalt“: freiwillige Angaben für persönliche Hinweise. */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { Eingabe } from "./Formularfeld";

interface Haushalt {
  kinder: { vorname: string; geburtsdatum: string }[];
  hund: boolean;
  grundbesitz: boolean;
  ausweisGueltigBis: string;
  reisepassGueltigBis: string;
}

export function HaushaltFormular({ start }: { start: Haushalt }) {
  const router = useRouter();
  const [h, setH] = useState(start);
  const [meldung, setMeldung] = useState<{ ok: boolean; text: string } | null>(null);
  const [laedt, setLaedt] = useState(false);

  const kind = (i: number, k: Partial<Haushalt["kinder"][number]>) => setH((x) => ({ ...x, kinder: x.kinder.map((c, j) => (j === i ? { ...c, ...k } : c)) }));

  const speichern = async (e: React.FormEvent) => {
    e.preventDefault();
    const kinder = h.kinder.filter((k) => k.geburtsdatum);
    setLaedt(true);
    setMeldung(null);
    const r = await fetch("/api/konto/profil", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ ...h, kinder }) });
    setLaedt(false);
    setMeldung(r.ok ? { ok: true, text: "Gespeichert. Passende Hinweise sehen Sie jetzt in Ihrem Konto." } : { ok: false, text: "Bitte prüfen Sie Ihre Eingaben." });
    if (r.ok) router.refresh();
  };

  const Schalter = ({ id, label, hinweis, an, onChange }: { id: string; label: string; hinweis: string; an: boolean; onChange: (v: boolean) => void }) => (
    <label htmlFor={id} className="flex cursor-pointer items-start justify-between gap-4 py-4">
      <span>
        <span className="block text-[15px] font-medium">{label}</span>
        <span className="mt-1 block text-[13px] text-subtle">{hinweis}</span>
      </span>
      <input id={id} type="checkbox" role="switch" className="checkbox mt-1" checked={an} onChange={(e) => onChange(e.target.checked)} />
    </label>
  );

  return (
    <form onSubmit={speichern} noValidate className="space-y-4">
      <Glass className="rounded-[24px] p-6">
        <h2 className="text-[17px] font-semibold">Kinder</h2>
        <p className="mt-1 text-[13px] text-subtle">Für Hinweise zu Kita-Platz, Einschulung und Ausweispflicht ab 16.</p>
        <ul className="mt-4 space-y-4">
          {h.kinder.map((k, i) => (
            <li key={i} className="grid items-end gap-4 sm:grid-cols-[1fr_1fr_auto]">
              <Eingabe id={`k-${i}-name`} label="Vorname (freiwillig)" value={k.vorname} maxLength={40} onChange={(e) => kind(i, { vorname: e.target.value })} />
              <Eingabe id={`k-${i}-geb`} label="Geburtsdatum" type="date" value={k.geburtsdatum} onChange={(e) => kind(i, { geburtsdatum: e.target.value })} />
              <button type="button" onClick={() => setH((x) => ({ ...x, kinder: x.kinder.filter((_, j) => j !== i) }))} className="pressable flex min-h-11 items-center gap-2 rounded-full px-4 text-[14px] text-muted">
                <Icon name="trash" className="size-4" />
                Entfernen<span className="sr-only"> (Kind {i + 1})</span>
              </button>
            </li>
          ))}
        </ul>
        {h.kinder.length < 12 && (
          <button type="button" onClick={() => setH((x) => ({ ...x, kinder: [...x.kinder, { vorname: "", geburtsdatum: "" }] }))} className="pressable mt-4 flex items-center gap-2 rounded-full px-4 py-2 text-[14px] font-medium text-accent">
            <Icon name="plus" className="size-4" />
            Kind hinzufügen
          </button>
        )}
      </Glass>

      <Glass className="divide-y divide-[var(--line)] rounded-[24px] px-6">
        <Schalter id="h-hund" label="Wir haben einen Hund" hinweis="Erinnerung an die Hundesteuer." an={h.hund} onChange={(v) => setH((x) => ({ ...x, hund: v }))} />
        <Schalter id="h-grund" label="Ich besitze ein Grundstück oder eine Wohnung" hinweis="Erinnerung an die Grundsteuer-Termine." an={h.grundbesitz} onChange={(v) => setH((x) => ({ ...x, grundbesitz: v }))} />
      </Glass>

      <Glass className="rounded-[24px] p-6">
        <h2 className="text-[17px] font-semibold">Ausweisdokumente</h2>
        <p className="mt-1 text-[13px] text-subtle">Wir erinnern Sie rechtzeitig, bevor ein Dokument abläuft.</p>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Eingabe id="h-ausweis" label="Personalausweis gültig bis" type="date" value={h.ausweisGueltigBis} onChange={(e) => setH((x) => ({ ...x, ausweisGueltigBis: e.target.value }))} />
          <Eingabe id="h-pass" label="Reisepass gültig bis" type="date" value={h.reisepassGueltigBis} onChange={(e) => setH((x) => ({ ...x, reisepassGueltigBis: e.target.value }))} />
        </div>
      </Glass>

      <div className="flex flex-wrap items-center gap-4">
        <Button type="submit" disabled={laedt}>
          {laedt ? "Wird gespeichert …" : "Speichern"}
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
