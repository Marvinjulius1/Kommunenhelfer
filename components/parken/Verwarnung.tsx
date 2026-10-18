"use client";

/** Verwarnungsgeld nachsehen → bezahlen oder Stellung nehmen. */
import { useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { speichereAnliegen } from "@/lib/client/anliegen";

interface Fall {
  aktenzeichen: string;
  betragCent: number;
  tatbestand: string;
  tatzeit: string;
  tatort: string;
  status: "offen" | "bezahlt" | "stellungnahme";
}

const euro = (c: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(c / 100);

export function Verwarnung() {
  const { konto } = useTenant();
  const [az, setAz] = useState("");
  const [kz, setKz] = useState("");
  const [fall, setFall] = useState<Fall | null>(null);
  const [fehler, setFehler] = useState<string | null>(null);
  const [modus, setModus] = useState<"" | "stellungnahme">("");
  const [st, setSt] = useState({ name: konto ? `${konto.vorname} ${konto.nachname}` : "", email: konto?.email ?? "", text: "", ok: false });
  const [nummer, setNummer] = useState<string | null>(null);

  const post = (body: object) => fetch("/api/parken", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ aktenzeichen: az, kennzeichen: kz, ...body }) });

  const suchen = async (e: React.FormEvent) => {
    e.preventDefault();
    setFehler(null);
    setFall(null);
    const r = await post({ aktion: "suchen" });
    if (r.status === 429) return setFehler("Zu viele Versuche. Bitte versuchen Sie es später erneut.");
    if (!r.ok) return setFehler("Wir haben keinen passenden Fall gefunden. Bitte prüfen Sie Aktenzeichen und Kennzeichen. Neue Fälle erscheinen oft erst nach einigen Tagen.");
    setFall(await r.json());
  };

  const bezahlen = async () => {
    const r = await post({ aktion: "bezahlen" });
    if (r.ok) window.location.href = (await r.json()).url;
    else setFehler("Die Zahlung konnte nicht gestartet werden.");
  };

  const stellungnahme = async (e: React.FormEvent) => {
    e.preventDefault();
    const r = await post({ aktion: "stellungnahme", name: st.name, email: st.email, text: st.text, einwilligung: st.ok });
    if (!r.ok) return setFehler("Bitte prüfen Sie Ihre Angaben.");
    const d = await r.json();
    if (!konto) speichereAnliegen({ id: d.vorgangsnummer, code: d.zugangscode, typ: "antrag", titel: `Stellungnahme Verwarnungsgeld ${d.aktenzeichen}`, erstelltAm: new Date().toISOString() });
    setNummer(d.vorgangsnummer);
    setFall({ ...fall!, status: "stellungnahme" });
    setModus("");
  };

  return (
    <div className="space-y-4">
      <form onSubmit={suchen} className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end">
        <label className="block text-[14px] font-medium">
          Aktenzeichen
          <input className="field-input mt-1 font-mono uppercase" required minLength={4} maxLength={30} value={az} onChange={(e) => setAz(e.target.value)} autoComplete="off" />
        </label>
        <label className="block text-[14px] font-medium">
          Kennzeichen
          <input className="field-input mt-1 font-mono uppercase" required minLength={3} maxLength={15} value={kz} onChange={(e) => setKz(e.target.value)} autoComplete="off" placeholder="z. B. MS-AB 123" />
        </label>
        <Button type="submit">Nachsehen</Button>
      </form>
      {fehler && (
        <p role="alert" className="text-[14px] text-danger">
          {fehler}
        </p>
      )}
      <div aria-live="polite">
        {fall && (
          <Glass className="rounded-[24px] p-6">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-mono text-[13px] text-subtle">{fall.aktenzeichen}</p>
                <p className="mt-1 text-[17px] font-semibold">{fall.tatbestand}</p>
                <p className="mt-1 text-[14px] text-muted">
                  {fall.tatort} · {new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(fall.tatzeit.slice(0, 10) + "T12:00:00Z"))}, {fall.tatzeit.slice(11)} Uhr
                </p>
              </div>
              <p className="text-[26px] font-semibold tabular-nums">{euro(fall.betragCent)}</p>
            </div>
            {fall.status === "bezahlt" ? (
              <p className="mt-5 flex items-center gap-2 text-[15px] text-success">
                <Icon name="check" className="size-4" /> Bezahlt – der Fall ist erledigt.
              </p>
            ) : fall.status === "stellungnahme" ? (
              <p className="mt-5 text-[15px]">
                Ihre Stellungnahme liegt beim Ordnungsamt{nummer ? ` (Vorgang ${nummer})` : ""}. Den Stand sehen Sie unter „Meine Anliegen“. Bis zur Entscheidung müssen Sie nicht zahlen.
              </p>
            ) : modus === "stellungnahme" ? (
              <form onSubmit={stellungnahme} className="mt-5 space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <label className="block text-[14px] font-medium">
                    Name
                    <input className="field-input mt-1" required value={st.name} onChange={(e) => setSt({ ...st, name: e.target.value })} />
                  </label>
                  <label className="block text-[14px] font-medium">
                    E-Mail-Adresse
                    <input className="field-input mt-1" type="email" required value={st.email} onChange={(e) => setSt({ ...st, email: e.target.value })} />
                  </label>
                </div>
                <label className="block text-[14px] font-medium">
                  Ihre Stellungnahme
                  <textarea className="field-input mt-1" rows={4} required minLength={10} maxLength={3000} value={st.text} onChange={(e) => setSt({ ...st, text: e.target.value })} placeholder="Was ist aus Ihrer Sicht passiert? Fotos können Sie später unter „Meine Anliegen“ nachreichen." />
                </label>
                <label className="flex items-start gap-3 text-[14px] text-muted">
                  <input type="checkbox" className="checkbox mt-0.5" checked={st.ok} onChange={(e) => setSt({ ...st, ok: e.target.checked })} required />
                  Meine Angaben werden für die Prüfung durch das Ordnungsamt verwendet.
                </label>
                <div className="flex gap-2">
                  <Button type="submit" disabled={!st.ok}>
                    Stellungnahme senden
                  </Button>
                  <Button type="button" variant="quiet" onClick={() => setModus("")}>
                    Abbrechen
                  </Button>
                </div>
              </form>
            ) : (
              <div className="mt-5 flex flex-wrap gap-2">
                <Button onClick={bezahlen}>
                  <Icon name="card" className="size-4" />
                  Jetzt bezahlen
                </Button>
                <Button variant="glass" onClick={() => setModus("stellungnahme")}>
                  Stellung nehmen
                </Button>
              </div>
            )}
          </Glass>
        )}
      </div>
    </div>
  );
}
