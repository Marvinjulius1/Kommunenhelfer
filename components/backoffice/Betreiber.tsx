"use client";

/** Betreiber: Gemeinde-Zeile (Paket ändern, Demo löschen) und Formular „Neue Gemeinde“. */
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";

const euro = (n: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR", maximumFractionDigits: 0 }).format(n);
const anfrage = (method: string, body: object) => fetch("/api/backoffice/betreiber", { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) });

export function BetreiberGemeinde(p: { slug: string; name: string; wappen: string; quelle: "datei" | "portal"; demo: boolean; paket?: string; einwohner?: number; preis?: number; loeschenAm?: string; vorschau: string; adresse?: string }) {
  const router = useRouter();
  return (
    <Glass className="flex flex-wrap items-center gap-4 rounded-[20px] px-5 py-4">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={p.wappen} alt="" width={36} height={42} className="h-10 w-auto" />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2 text-[15px] font-medium">
          {p.name}
          {p.demo && <span className="rounded-full bg-[var(--line)] px-2 py-0.5 text-[11px] font-normal">Demo{p.loeschenAm ? ` bis ${new Intl.DateTimeFormat("de-DE", { dateStyle: "short" }).format(new Date(p.loeschenAm))}` : ""}</span>}
          {p.quelle === "datei" && <span className="rounded-full bg-[var(--line)] px-2 py-0.5 text-[11px] font-normal">Konfigurationsdatei</span>}
        </p>
        <p className="text-[13px] text-subtle">
          {p.paket ? `Paket ${p.paket[0].toUpperCase()}${p.paket.slice(1)}` : "alle Funktionen"}
          {p.einwohner ? ` · ${new Intl.NumberFormat("de-DE").format(p.einwohner)} Einwohner` : ""}
          {p.preis !== undefined && !p.demo ? ` · ${euro(p.preis)}/Jahr` : ""}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-3 text-[13px]">
        {p.quelle === "portal" && (
          <select
            aria-label={`Paket für ${p.name}`}
            className="field-input !min-h-9 !w-auto !py-1 text-[13px]"
            value={p.paket}
            onChange={async (e) => {
              if ((await anfrage("PATCH", { slug: p.slug, paket: e.target.value })).ok) router.refresh();
            }}
          >
            <option value="basis">Basis</option>
            <option value="komfort">Komfort</option>
            <option value="premium">Premium</option>
          </select>
        )}
        <a href={p.vorschau} target="_blank" rel="noopener" className="inline-flex items-center gap-1 text-accent underline underline-offset-2">
          Ansehen <Icon name="external" className="size-3.5" />
        </a>
        {p.adresse && <span className="text-subtle">{p.adresse.replace(/^https?:\/\//, "")}</span>}
        {p.quelle === "portal" && (
          <button
            type="button"
            className="text-danger"
            onClick={async () => {
              if (confirm(`${p.name} wirklich löschen? Bürgerkonten und Vorgänge bleiben bis zu ihren Löschfristen gespeichert.`) && (await anfrage("DELETE", { slug: p.slug })).ok) router.refresh();
            }}
          >
            Löschen<span className="sr-only">: {p.name}</span>
          </button>
        )}
      </div>
    </Glass>
  );
}

export function NeueGemeindeFormular() {
  const router = useRouter();
  const [farbe, setFarbe] = useState("#1f6f8b");
  const [wappen, setWappen] = useState<{ typ: "image/svg+xml" | "image/png"; daten: string } | undefined>();
  const [meldung, setMeldung] = useState<{ ok: boolean; text: string; slug?: string } | null>(null);
  const [laedt, setLaedt] = useState(false);
  const feld = "field-input mt-1 !min-h-10 !py-2 text-[14px]";

  const datei = async (f: File | undefined) => {
    if (!f) return setWappen(undefined);
    if (f.size > 300_000) return setMeldung({ ok: false, text: "Das Wappen darf höchstens 300 KB groß sein." });
    if (f.type === "image/svg+xml") setWappen({ typ: "image/svg+xml", daten: await f.text() });
    else if (f.type === "image/png") {
      // In Stücken umwandeln – sehr lange Argumentlisten sprengen sonst den Stack
      const bytes = new Uint8Array(await f.arrayBuffer());
      let bin = "";
      for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
      setWappen({ typ: "image/png", daten: btoa(bin) });
    }
    else setMeldung({ ok: false, text: "Bitte SVG oder PNG verwenden." });
  };

  return (
    <form
      className="mt-4 grid gap-3 sm:grid-cols-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const f = new FormData(form);
        const s = (k: string) => String(f.get(k) ?? "").trim();
        setLaedt(true);
        setMeldung(null);
        const r = await anfrage("POST", {
          name: s("name"),
          art: s("art"),
          farbe,
          einwohner: s("einwohner") ? Number(s("einwohner")) : undefined,
          paket: s("paket"),
          demo: f.get("demo") === "on",
          email: s("email"),
          strasse: s("strasse"),
          plz: s("plz"),
          ort: s("ort") || undefined,
          wappen,
        });
        const d = await r.json().catch(() => ({}));
        setLaedt(false);
        if (r.ok) {
          setMeldung({ ok: true, text: "Angelegt.", slug: d.slug });
          form.reset();
          setWappen(undefined);
          router.refresh();
        } else setMeldung({ ok: false, text: d.fehler === "wappen_unsicher" ? "Das SVG enthält Skripte oder externe Verweise – bitte eine einfache Grafik verwenden." : d.probleme ? d.probleme.join("; ") : "Bitte Angaben prüfen." });
      }}
    >
      <label className="block text-[13px] font-medium">
        Name
        <input name="name" required minLength={2} maxLength={60} className={feld} placeholder="z. B. Bad Beispiel" />
      </label>
      <label className="block text-[13px] font-medium">
        Art
        <select name="art" className={feld} defaultValue="Gemeinde">
          {["Stadt", "Gemeinde", "Markt", "Samtgemeinde", "Verbandsgemeinde", "Landkreis"].map((a) => (
            <option key={a}>{a}</option>
          ))}
        </select>
      </label>
      <label className="block text-[13px] font-medium">
        Farbe
        <span className="mt-1 flex items-center gap-2">
          <input type="color" value={farbe} onChange={(e) => setFarbe(e.target.value)} className="h-10 w-14 cursor-pointer rounded-[10px] border border-[var(--line)] bg-transparent" aria-label="Farbe wählen" />
          <span className="font-mono text-[13px] text-muted">{farbe}</span>
        </span>
        <span className="mt-1 block text-[11px] font-normal text-subtle">wird bei Bedarf für ausreichenden Kontrast angepasst</span>
      </label>
      <label className="block text-[13px] font-medium">
        Wappen (SVG/PNG, freiwillig)
        <input type="file" accept="image/svg+xml,image/png" onChange={(e) => datei(e.target.files?.[0])} className="mt-2 block w-full text-[12px] text-muted file:mr-3 file:rounded-full file:border-0 file:bg-[var(--line)] file:px-3 file:py-1.5 file:text-[12px] file:text-fg" />
        <span className="mt-1 block text-[11px] font-normal text-subtle">ohne Datei: Schild mit Initiale in der Gemeindefarbe</span>
      </label>
      <label className="block text-[13px] font-medium">
        Einwohner
        <input name="einwohner" type="number" min={1} className={feld} />
      </label>
      <label className="block text-[13px] font-medium">
        Paket
        <select name="paket" className={feld} defaultValue="komfort">
          <option value="basis">Basis</option>
          <option value="komfort">Komfort</option>
          <option value="premium">Premium</option>
        </select>
      </label>
      <label className="block text-[13px] font-medium sm:col-span-2">
        E-Mail der Verwaltung
        <input name="email" type="email" required className={feld} placeholder="buergerservice@bad-beispiel.de" />
      </label>
      <label className="block text-[13px] font-medium sm:col-span-2">
        Anschrift Rathaus
        <input name="strasse" required className={feld} placeholder="Rathausplatz 1" />
      </label>
      <label className="block text-[13px] font-medium">
        PLZ
        <input name="plz" required inputMode="numeric" pattern="\d{5}" maxLength={5} className={feld} />
      </label>
      <label className="block text-[13px] font-medium">
        Ort (falls abweichend)
        <input name="ort" className={feld} />
      </label>
      <label className="flex items-center gap-2 text-[14px] sm:col-span-2">
        <input name="demo" type="checkbox" className="checkbox" defaultChecked /> Demo mit Beispieldaten (löscht sich nach 60 Tagen)
      </label>
      <div className="flex flex-wrap items-center gap-3 sm:col-span-2">
        <Button type="submit" disabled={laedt} className="!min-h-10 px-5 text-[14px]">
          {laedt ? "Wird angelegt …" : "Anlegen"}
        </Button>
        {meldung && (
          <p role={meldung.ok ? "status" : "alert"} className={`text-[13px] ${meldung.ok ? "text-success" : "text-danger"}`}>
            {meldung.text}{" "}
            {meldung.slug && (
              <a href={`/?gemeinde=${meldung.slug}`} target="_blank" rel="noopener" className="font-medium underline underline-offset-2">
                Jetzt ansehen
              </a>
            )}
          </p>
        )}
      </div>
    </form>
  );
}
