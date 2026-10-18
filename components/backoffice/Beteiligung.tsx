"use client";

/** Backoffice: Umfragen anlegen/beenden, Ideen prüfen und beantworten (Rolle „redaktion“). */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";

const senden = (method: "POST" | "PATCH", body: object) => fetch("/api/backoffice/beteiligung", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

export function UmfrageFormular({ ortsteile }: { ortsteile: string[] }) {
  const router = useRouter();
  const [titel, setTitel] = useState("");
  const [beschreibung, setBeschreibung] = useState("");
  const [optionen, setOptionen] = useState("");
  const [mehrfach, setMehrfach] = useState(false);
  const [bis, setBis] = useState(new Date(Date.now() + 21 * 86400_000).toISOString().slice(0, 10));
  const [ortsteil, setOrtsteil] = useState("");
  const [ergebnisSofort, setErgebnisSofort] = useState(true);
  const [nurOnlineAusweis, setNurOnlineAusweis] = useState(false);
  const [meldung, setMeldung] = useState<string | null>(null);
  const liste = optionen
    .split("\n")
    .map((o) => o.trim())
    .filter(Boolean);

  const anlegen = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await senden("POST", { titel, beschreibung, optionen: liste, mehrfach, bis, ortsteil: ortsteil || undefined, ergebnisSofort, nurOnlineAusweis });
    setMeldung(r.ok ? "Umfrage veröffentlicht." : r.status === 403 ? "Dafür fehlt die Rolle „redaktion“." : "Bitte Eingaben prüfen (mind. 2 Antworten, Enddatum in der Zukunft).");
    if (r.ok) {
      setTitel("");
      setBeschreibung("");
      setOptionen("");
      router.refresh();
    }
  };

  return (
    <form onSubmit={anlegen} className="space-y-3">
      <input className="field-input" placeholder="Frage, z. B. Wie soll der Marktplatz gestaltet werden?" aria-label="Frage" value={titel} onChange={(e) => setTitel(e.target.value)} required minLength={5} maxLength={140} />
      <textarea className="field-input" rows={2} placeholder="Hintergrund (freiwillig)" aria-label="Hintergrund" value={beschreibung} onChange={(e) => setBeschreibung(e.target.value)} maxLength={2000} />
      <textarea className="field-input" rows={4} placeholder={"Antwortmöglichkeiten – eine pro Zeile"} aria-label="Antwortmöglichkeiten" value={optionen} onChange={(e) => setOptionen(e.target.value)} required />
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="flex flex-col gap-1 text-[13px] text-subtle">
          Läuft bis
          <input type="date" className="field-input" value={bis} onChange={(e) => setBis(e.target.value)} required />
        </label>
        <label className="flex flex-col gap-1 text-[13px] text-subtle">
          Ortsteil
          <select className="field-input" value={ortsteil} onChange={(e) => setOrtsteil(e.target.value)}>
            <option value="">Ganze Gemeinde</option>
            {ortsteile.map((o) => (
              <option key={o}>{o}</option>
            ))}
          </select>
        </label>
      </div>
      <label className="flex items-center gap-2 text-[14px]">
        <input type="checkbox" className="checkbox" checked={mehrfach} onChange={(e) => setMehrfach(e.target.checked)} /> Mehrere Antworten erlaubt
      </label>
      <label className="flex items-center gap-2 text-[14px]">
        <input type="checkbox" className="checkbox" checked={ergebnisSofort} onChange={(e) => setErgebnisSofort(e.target.checked)} /> Zwischenergebnis sofort zeigen
      </label>
      <label className="flex items-center gap-2 text-[14px]">
        <input type="checkbox" className="checkbox" checked={nurOnlineAusweis} onChange={(e) => setNurOnlineAusweis(e.target.checked)} /> Nur mit Online-Ausweis (eine Person = eine Stimme, verlässlich)
      </label>
      <Button type="submit" className="!min-h-10 px-5 text-[14px]" disabled={liste.length < 2}>
        Veröffentlichen
      </Button>
      <p aria-live="polite" className="text-[14px] text-muted">
        {meldung}
      </p>
    </form>
  );
}

export function UmfrageBeenden({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="pressable rounded-full px-3 py-1 text-[13px] text-muted hover:text-fg"
      onClick={async () => {
        if (!confirm("Umfrage jetzt beenden?")) return;
        await senden("PATCH", { typ: "umfrage", id, beenden: true });
        router.refresh();
      }}
    >
      Beenden
    </button>
  );
}

export function IdeeModeration({ id, status, antwort }: { id: string; status: string; antwort?: string }) {
  const router = useRouter();
  const [s, setS] = useState(status);
  const [a, setA] = useState(antwort ?? "");
  const [meldung, setMeldung] = useState<string | null>(null);
  const speichern = async () => {
    const r = await senden("PATCH", { typ: "idee", id, status: s, antwort: a || undefined });
    setMeldung(r.ok ? "Gespeichert – die Person wird benachrichtigt." : "Das hat nicht geklappt.");
    if (r.ok) router.refresh();
  };
  return (
    <div className="mt-3 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <select className="field-input !min-h-9 w-56 !py-1 text-[13px]" value={s} onChange={(e) => setS(e.target.value)} aria-label="Status">
          <option value="eingereicht">Wird geprüft</option>
          <option value="veroeffentlicht">Veröffentlichen</option>
          <option value="abgelehnt">Nicht veröffentlichen</option>
          <option value="in_pruefung">Verwaltung prüft</option>
          <option value="umgesetzt">Umgesetzt</option>
        </select>
        <Button className="!min-h-9 px-4 text-[13px]" onClick={speichern}>
          Speichern
        </Button>
      </div>
      <textarea className="field-input text-[14px]" rows={2} placeholder="Antwort der Verwaltung (öffentlich, freiwillig)" aria-label="Antwort der Verwaltung" value={a} onChange={(e) => setA(e.target.value)} maxLength={2000} />
      <p aria-live="polite" className="text-[13px] text-muted">
        {meldung}
      </p>
    </div>
  );
}

/** Bürgerhaushalt anlegen: Projekte zeilenweise „Titel | Kosten | Beschreibung“. */
export function HaushaltFormular({ ortsteile }: { ortsteile: string[] }) {
  const router = useRouter();
  const [meldung, setMeldung] = useState<string | null>(null);
  const feld = "field-input mt-1 !min-h-10 !py-2 text-[14px]";
  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const f = new FormData(e.currentTarget);
        const projekte = String(f.get("projekte") ?? "")
          .split("\n")
          .map((z) => z.split("|").map((x) => x.trim()))
          .filter((t) => t[0])
          .map(([titel, kosten, text, ortsteil]) => ({ titel, kostenEuro: Math.round(Number((kosten ?? "").replace(/[^\d,]/g, "").replace(",", "."))), text: text ?? "", ...(ortsteil && ortsteile.includes(ortsteil) ? { ortsteil } : {}) }));
        if (projekte.some((p) => !p.kostenEuro)) return setMeldung("Bitte bei jedem Projekt Kosten angeben: Titel | Kosten | Beschreibung");
        const r = await fetch("/api/backoffice/haushalt", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ titel: f.get("titel"), text: f.get("text"), budgetEuro: Number(f.get("budget")), bis: f.get("bis"), nurOnlineAusweis: f.get("eid") === "on", projekte }),
        });
        const d = await r.json().catch(() => ({}));
        setMeldung(r.ok ? "Bürgerhaushalt veröffentlicht." : d.fehler === "projekt_teurer_als_budget" ? "Ein Projekt ist teurer als das Budget." : "Bitte Angaben prüfen (mind. 2 Projekte, Ende in der Zukunft).");
        if (r.ok) {
          e.currentTarget.reset();
          router.refresh();
        }
      }}
    >
      <label className="block text-[13px] font-medium">
        Titel
        <input name="titel" required minLength={5} maxLength={140} className={feld} placeholder="z. B. Bürgerhaushalt 2027" />
      </label>
      <label className="block text-[13px] font-medium">
        Erklärung
        <textarea name="text" rows={2} maxLength={2000} className="field-input mt-1 text-[14px]" />
      </label>
      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-[13px] font-medium">
          Budget in Euro
          <input name="budget" type="number" min={100} required className={feld} />
        </label>
        <label className="block text-[13px] font-medium">
          Abstimmung bis
          <input name="bis" type="date" required className={feld} />
        </label>
      </div>
      <label className="block text-[13px] font-medium">
        Projekte (eine Zeile je Projekt: Titel | Kosten | Beschreibung | Ortsteil)
        <textarea name="projekte" rows={5} required className="field-input mt-1 font-mono text-[13px]" placeholder={"Neue Bänke am Stadtpark | 12000 | Zehn Bänke mit Lehne\nTrinkbrunnen Marktplatz | 25000 | | Altstadt"} />
      </label>
      <label className="flex items-center gap-2 text-[14px]">
        <input name="eid" type="checkbox" className="checkbox" /> Nur mit Online-Ausweis (verhindert Mehrfachkonten)
      </label>
      <div className="flex items-center gap-3">
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

export function HaushaltBeenden({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button
      type="button"
      className="shrink-0 text-[13px] text-accent"
      onClick={async () => {
        if (!confirm("Abstimmung jetzt beenden und Ergebnis veröffentlichen?")) return;
        const r = await fetch("/api/backoffice/haushalt", { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ id, beenden: true }) });
        if (r.ok) router.refresh();
      }}
    >
      Beenden
    </button>
  );
}
