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
      className="pressable rounded-full px-2 py-2 sm:px-4 text-[14px] text-muted hover:text-fg"
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

export function VorgangAktionen({
  id,
  status,
  statusOptionen,
  benutzer,
  zugewiesen,
  textbausteine,
  zahlungMoeglich,
  hatAntwort = false,
  entwurfMoeglich = true,
}: {
  id: string;
  status: string;
  statusOptionen: { wert: string; label: string }[];
  benutzer: { name: string; label: string }[];
  zugewiesen?: string;
  textbausteine: { titel: string; text: string }[];
  zahlungMoeglich: boolean;
  /** Letzte Nachricht stammt vom Bürger → Entwurf als Antwort */
  hatAntwort?: boolean;
  /** Entwürfe sind Teil des Pakets */
  entwurfMoeglich?: boolean;
}) {
  const router = useRouter();
  const [neu, setNeu] = useState(status);
  const [text, setText] = useState("");
  const [meldung, setMeldung] = useState<string | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [bescheidText, setBescheidText] = useState("");
  const [entwurfInfo, setEntwurfInfo] = useState<{ ziel: "rueckfrage" | "bescheid"; quelle: string; hinweise: string[] } | null>(null);
  const [entwirft, setEntwirft] = useState<string | null>(null);
  const [betrag, setBetrag] = useState("");
  const [zweck, setZweck] = useState("");
  const pfad = `/api/backoffice/vorgang/${encodeURIComponent(id)}`;

  const anfrage = async (url: string, method: "PATCH" | "POST", body: object | FormData, erfolg: string) => {
    setLaedt(true);
    setMeldung(null);
    const res = await fetch(url, {
      method,
      headers: body instanceof FormData ? undefined : { "content-type": "application/json" },
      body: body instanceof FormData ? body : JSON.stringify(body),
    });
    setLaedt(false);
    setMeldung(res.ok ? erfolg : "Das hat nicht geklappt. Bitte Eingaben prüfen und erneut versuchen.");
    if (res.ok) router.refresh();
    return res.ok;
  };

  const auswahl = "field-input !min-h-10 w-full !py-2 text-[14px] text-fg";

  /** Entwurf holen – ersetzt nur das Textfeld, gesendet wird erst mit dem eigenen Klick. */
  const entwerfen = async (art: "rueckfrage" | "antwort" | "bescheid") => {
    setEntwirft(art);
    setMeldung(null);
    const r = await fetch(`${pfad}/entwurf`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ art }) });
    setEntwirft(null);
    if (!r.ok) return setMeldung("Kein Entwurf möglich. Bitte selbst formulieren.");
    const d: { text: string; quelle: "vorlage" | "ki"; hinweise: string[] } = await r.json();
    if (art === "bescheid") setBescheidText(d.text);
    else setText(d.text);
    setEntwurfInfo({ ziel: art === "bescheid" ? "bescheid" : "rueckfrage", quelle: d.quelle === "ki" ? "Entwurf mit KI" : "Entwurf aus Vorlage", hinweise: d.hinweise });
  };

  const EntwurfHinweis = ({ ziel }: { ziel: "rueckfrage" | "bescheid" }) =>
    entwurfInfo?.ziel === ziel ? (
      <div className="rounded-[14px] bg-[var(--line)] px-4 py-3 text-[13px]" role="status">
        <p className="font-medium">{entwurfInfo.quelle} – bitte prüfen und anpassen. Gesendet wird erst mit Ihrem Klick.</p>
        {entwurfInfo.hinweise.map((h) => (
          <p key={h} className={`mt-1 ${h.startsWith("Achtung") ? "font-medium text-danger" : "text-muted"}`}>
            {h}
          </p>
        ))}
      </div>
    ) : null;

  return (
    <div className="space-y-8">
      <div className="grid gap-4">
        <label className="flex flex-col gap-1 text-[13px] text-subtle">
          Zuständig
          <select className={auswahl} value={zugewiesen ?? ""} onChange={(e) => anfrage(pfad, "PATCH", { zugewiesen: e.target.value || null }, "Zuweisung gespeichert.")}>
            <option value="">Nicht zugewiesen</option>
            {benutzer.map((b) => (
              <option key={b.name} value={b.name}>
                {b.label}
              </option>
            ))}
          </select>
        </label>
        <div className="flex items-end gap-2">
          <label className="flex flex-1 flex-col gap-1 text-[13px] text-subtle">
            Status
            <select className={auswahl} value={neu} onChange={(e) => setNeu(e.target.value)}>
              {statusOptionen.map((o) => (
                <option key={o.wert} value={o.wert}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <Button className="!min-h-10 px-4 text-[14px]" disabled={laedt || neu === status} onClick={() => anfrage(pfad, "PATCH", { status: neu }, "Status gespeichert.")}>
            Speichern
          </Button>
        </div>
      </div>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          if (await anfrage(pfad, "POST", { rueckfrage: text }, "Rückfrage gesendet. Der Bürger wird benachrichtigt.")) setText("");
        }}
        className="space-y-2"
      >
        <div className="flex flex-wrap items-end justify-between gap-2">
          <label htmlFor="rueckfrage" className="text-[14px] font-medium">
            Rückfrage an den Bürger
          </label>
          <span className={entwurfMoeglich ? "flex gap-1" : "hidden"}>
            <button type="button" disabled={!!entwirft} onClick={() => entwerfen(status === "rueckfrage" || hatAntwort ? "antwort" : "rueckfrage")} className="pressable rounded-full bg-[var(--line)] px-3 py-1 text-[13px] font-medium">
              {entwirft === "rueckfrage" || entwirft === "antwort" ? "Entwurf wird erstellt …" : "Entwurf vorschlagen"}
            </button>
          </span>
          {textbausteine.length > 0 && (
            <select aria-label="Textbaustein einfügen" className="field-input !min-h-9 w-48 !py-1 text-[13px]" value="" onChange={(e) => setText((t) => (t ? t + "\n\n" : "") + e.target.value)}>
              <option value="">Textbaustein …</option>
              {textbausteine.map((b) => (
                <option key={b.titel} value={b.text}>
                  {b.titel}
                </option>
              ))}
            </select>
          )}
        </div>
        <EntwurfHinweis ziel="rueckfrage" />
        <textarea id="rueckfrage" rows={text.length > 200 ? 9 : 3} className="field-input" value={text} onChange={(e) => setText(e.target.value)} maxLength={2000} />
        <Button type="submit" variant="glass" className="!min-h-10 px-4 text-[14px]" disabled={laedt || text.trim().length < 3}>
          Rückfrage senden
        </Button>
      </form>

      <form
        onSubmit={async (e) => {
          e.preventDefault();
          const f = e.currentTarget;
          if (await anfrage(`${pfad}/bescheid`, "POST", new FormData(f), "Bescheid digital zugestellt.")) {
            f.reset();
            setBescheidText("");
            setEntwurfInfo(null);
          }
        }}
        className="space-y-2"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[14px] font-medium">Bescheid digital zustellen</p>
          <button type="button" hidden={!entwurfMoeglich} disabled={!!entwirft} onClick={() => entwerfen("bescheid")} className="pressable rounded-full bg-[var(--line)] px-3 py-1 text-[13px] font-medium">
            {entwirft === "bescheid" ? "Entwurf wird erstellt …" : "Begleittext vorschlagen"}
          </button>
        </div>
        <input name="titel" required minLength={3} maxLength={140} placeholder="Titel, z. B. Hundesteuerbescheid 2026" className="field-input" />
        <EntwurfHinweis ziel="bescheid" />
        <textarea name="text" aria-label="Begleittext" rows={bescheidText.length > 200 ? 9 : 2} maxLength={5000} placeholder="Begleittext (optional)" className="field-input" value={bescheidText} onChange={(e) => setBescheidText(e.target.value)} />
        <input name="datei" type="file" accept="application/pdf" className="block text-[13px] text-muted file:mr-4 file:rounded-full file:border-0 file:bg-[var(--line)] file:px-4 file:py-2 file:text-[13px] file:text-fg" />
        <label className="flex items-center gap-2 text-[13px] text-muted">
          <input type="checkbox" name="erledigt" value="1" className="checkbox" /> Vorgang danach als erledigt markieren
        </label>
        <Button type="submit" variant="glass" className="!min-h-10 px-4 text-[14px]" disabled={laedt}>
          Zustellen
        </Button>
      </form>

      {zahlungMoeglich && (
        <form
          onSubmit={async (e) => {
            e.preventDefault();
            if (await anfrage(`${pfad}/zahlung`, "POST", { betrag: Number(betrag.replace(",", ".")), zweck }, "Zahlung angefordert.")) {
              setBetrag("");
              setZweck("");
            }
          }}
          className="space-y-2"
        >
          <p className="text-[14px] font-medium">Gebühr anfordern</p>
          <div className="grid grid-cols-[8rem_1fr] gap-2">
            <input aria-label="Betrag in Euro" inputMode="decimal" placeholder="Betrag €" className="field-input" value={betrag} onChange={(e) => setBetrag(e.target.value)} required />
            <input aria-label="Zweck" placeholder="Zweck, z. B. Gebühr Gewerbeanmeldung" className="field-input" value={zweck} onChange={(e) => setZweck(e.target.value)} required minLength={3} />
          </div>
          <Button type="submit" variant="glass" className="!min-h-10 px-4 text-[14px]" disabled={laedt}>
            Anfordern
          </Button>
        </form>
      )}

      <p aria-live="polite" className="text-[14px] text-muted">
        {meldung}
      </p>
    </div>
  );
}

/** Wiedervorlage: Datum + kurze Notiz. Fällige Vorgänge erscheinen oben in der Liste. */
export function Wiedervorlage({ id, am, notiz, frist }: { id: string; am?: string; notiz?: string; frist?: { datum: string; text: string; ueberfaellig: boolean } }) {
  const router = useRouter();
  const [datum, setDatum] = useState(am ?? "");
  const [text, setText] = useState(notiz ?? "");
  const [meldung, setMeldung] = useState<string | null>(null);
  const pfad = `/api/backoffice/vorgang/${encodeURIComponent(id)}`;
  const heute = new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" });
  const schnell = [
    ["Morgen", 1],
    ["In 3 Tagen", 3],
    ["In 1 Woche", 7],
  ] as const;

  const speichern = async (wv: { am: string; notiz?: string } | null) => {
    const r = await fetch(pfad, { method: "PATCH", headers: { "content-type": "application/json" }, body: JSON.stringify({ wiedervorlage: wv }) });
    setMeldung(r.ok ? (wv ? "Wiedervorlage gespeichert." : "Wiedervorlage entfernt.") : "Das hat nicht geklappt.");
    if (r.ok) router.refresh();
  };

  return (
    <div className="space-y-4">
      {frist && (
        <p className={`text-[14px] ${frist.ueberfaellig ? "font-medium text-danger" : "text-muted"}`}>
          Bearbeitungsfrist: {new Intl.DateTimeFormat("de-DE", { dateStyle: "medium", timeZone: "UTC" }).format(new Date(frist.datum + "T12:00:00Z"))} · {frist.text}
        </p>
      )}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (datum) void speichern({ am: datum, notiz: text || undefined });
        }}
        className="space-y-2"
      >
        <label htmlFor="wv-datum" className="text-[14px] font-medium">
          Wiedervorlage am
        </label>
        <input id="wv-datum" type="date" min={heute} className="field-input !min-h-10 !py-2 text-[14px]" value={datum} onChange={(e) => setDatum(e.target.value)} />
        <div className="flex flex-wrap gap-1">
          {schnell.map(([l, t]) => (
            <button
              key={l}
              type="button"
              onClick={() => setDatum(new Date(Date.now() + t * 86400_000).toLocaleDateString("sv-SE", { timeZone: "Europe/Berlin" }))}
              className="pressable rounded-full bg-[var(--line)] px-3 py-1 text-[13px]"
            >
              {l}
            </button>
          ))}
        </div>
        <label htmlFor="wv-notiz" className="block pt-2 text-[14px] font-medium">
          Notiz (intern)
        </label>
        <input id="wv-notiz" className="field-input !min-h-10 !py-2 text-[14px]" maxLength={500} value={text} onChange={(e) => setText(e.target.value)} placeholder="z. B. Rückruf Bauamt abwarten" />
        <div className="flex gap-2">
          <Button type="submit" variant="glass" className="!min-h-10 px-4 text-[14px]" disabled={!datum}>
            Speichern
          </Button>
          {am && (
            <Button type="button" variant="quiet" className="!min-h-10 px-4 text-[14px]" onClick={() => speichern(null)}>
              Entfernen
            </Button>
          )}
        </div>
      </form>
      <p role="status" className="text-[13px] text-muted">
        {meldung}
      </p>
    </div>
  );
}
