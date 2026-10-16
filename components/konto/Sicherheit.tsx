"use client";

/** Geräte, Passwort, Datenexport und Konto löschen. */
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Eingabe } from "./Formularfeld";

interface Sitzung {
  id: string;
  geraet: string;
  seit: string;
  diese: boolean;
}

export function Sicherheit({ hatPasswort }: { hatPasswort: boolean }) {
  const router = useRouter();
  const [sitzungen, setSitzungen] = useState<Sitzung[]>([]);
  const [alt, setAlt] = useState("");
  const [neu, setNeu] = useState("");
  const [pwMeldung, setPwMeldung] = useState<string | null>(null);
  const [loeschen, setLoeschen] = useState("");

  useEffect(() => {
    fetch("/api/konto/sitzungen")
      .then((r) => r.json())
      .then((d) => setSitzungen(d.sitzungen ?? []))
      .catch(() => undefined);
  }, []);

  const fmt = (iso: string) => new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeStyle: "short" }).format(new Date(iso));

  return (
    <div className="space-y-4">
      <Glass className="rounded-[24px] p-6">
        <h2 className="text-[17px] font-semibold">Angemeldete Geräte</h2>
        <ul className="mt-4 space-y-2">
          {sitzungen.map((s) => (
            <li key={s.id} className="flex justify-between gap-4 text-[15px]">
              <span>
                {s.geraet}
                {s.diese && <span className="ml-2 text-[13px] text-subtle">(dieses Gerät)</span>}
              </span>
              <span className="text-[13px] text-subtle">seit {fmt(s.seit)}</span>
            </li>
          ))}
        </ul>
        <Button
          variant="glass"
          className="mt-6 !min-h-10 px-4 text-[14px]"
          onClick={async () => {
            await fetch("/api/konto/abmelden", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ alle: true }) });
            router.replace("/konto/anmelden");
            router.refresh();
          }}
        >
          Auf allen Geräten abmelden
        </Button>
      </Glass>

      <Glass className="rounded-[24px] p-6">
        <h2 className="text-[17px] font-semibold">{hatPasswort ? "Passwort ändern" : "Passwort festlegen"}</h2>
        {!hatPasswort && <p className="mt-1 text-[14px] text-muted">Sie melden sich mit dem Online-Ausweis an. Optional können Sie zusätzlich ein Passwort festlegen.</p>}
        <form
          className="mt-4 grid gap-4 sm:grid-cols-2"
          onSubmit={async (e) => {
            e.preventDefault();
            const res = await fetch("/api/konto/passwort", { method: "PUT", headers: { "content-type": "application/json" }, body: JSON.stringify({ alt, neu }) });
            const d = await res.json().catch(() => ({}));
            setPwMeldung(res.ok ? "Ihr Passwort wurde geändert." : d.fehler === "altes_passwort" ? "Das bisherige Passwort stimmt nicht." : "Bitte wählen Sie mindestens 10 Zeichen.");
            if (res.ok) {
              setAlt("");
              setNeu("");
            }
          }}
        >
          {hatPasswort && <Eingabe id="s-alt" label="Bisheriges Passwort" type="password" autoComplete="current-password" value={alt} onChange={(e) => setAlt(e.target.value)} />}
          <Eingabe id="s-neu" label="Neues Passwort" type="password" autoComplete="new-password" hinweis="Mindestens 10 Zeichen" value={neu} onChange={(e) => setNeu(e.target.value)} />
          <div className="flex items-center gap-4 sm:col-span-2">
            <Button type="submit" className="!min-h-10 px-4 text-[14px]">
              Speichern
            </Button>
            <p role="status" className="text-[14px] text-muted">
              {pwMeldung}
            </p>
          </div>
        </form>
      </Glass>

      <Glass className="rounded-[24px] p-6">
        <h2 className="text-[17px] font-semibold">Meine Daten herunterladen</h2>
        <p className="mt-1 text-[14px] text-muted">Alle Daten, die wir zu Ihrem Konto speichern, als Datei (Art. 15 und 20 DSGVO).</p>
        <a href="/api/konto/export" className="pressable glass mt-4 inline-flex min-h-10 items-center rounded-full px-4 text-[14px] font-medium">
          Daten herunterladen
        </a>
      </Glass>

      <Glass className="rounded-[24px] p-6">
        <h2 className="text-[17px] font-semibold">Konto löschen</h2>
        <p className="mt-1 text-[14px] leading-relaxed text-muted">
          Ihr Konto, Ihre Einstellungen, Ihr Postfach und Ihr Dokumentensafe werden sofort gelöscht. Bereits eingereichte Anliegen bleiben bei der Verwaltung, solange es das Gesetz vorschreibt.
        </p>
        <div className="mt-4 flex flex-wrap items-end gap-2">
          <Eingabe id="s-loeschen" label="Zur Bestätigung „LÖSCHEN“ eingeben" value={loeschen} onChange={(e) => setLoeschen(e.target.value)} />
          <Button
            variant="glass"
            className="!min-h-12 text-danger"
            disabled={loeschen.trim().toUpperCase() !== "LÖSCHEN"}
            onClick={async () => {
              const res = await fetch("/api/konto", { method: "DELETE" });
              if (res.ok) {
                router.replace("/");
                router.refresh();
              }
            }}
          >
            Konto endgültig löschen
          </Button>
        </div>
      </Glass>
    </div>
  );
}
