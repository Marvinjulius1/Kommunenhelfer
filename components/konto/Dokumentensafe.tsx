"use client";

/** Dokumentensafe: Unterlagen einmal ablegen, für spätere Anträge wiederverwenden. */
import { useEffect, useRef, useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { Button } from "@/components/ui/Button";
import { Glass } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { Vorschau } from "@/components/upload/AttachmentTray";
import { uploadFehlertext } from "@/lib/client/uploads";
import { tx } from "@/lib/i18n";
import { dokumentarten } from "@/lib/uploads/dokumentarten";
import { ACCEPT, formatGroesse } from "@/lib/uploads/formate";

interface Dok {
  id: string;
  art: string;
  typ: string;
  groesse: number;
  name: string;
  erstelltAm: string;
}

export function Dokumentensafe() {
  const { tenant, lang } = useTenant();
  const [liste, setListe] = useState<Dok[] | null>(null);
  const [laedt, setLaedt] = useState(false);
  const [meldung, setMeldung] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  const laden = () => fetch("/api/konto/safe").then((r) => r.json()).then((d) => setListe(d.dokumente ?? []));
  useEffect(() => {
    void laden();
  }, []);

  const hochladen = async (dateien: File[]) => {
    setLaedt(true);
    setMeldung(null);
    for (const f of dateien) {
      const res = await fetch("/api/konto/safe", { method: "POST", headers: { "x-dateiname": encodeURIComponent(f.name), "content-type": f.type || "application/octet-stream" }, body: f });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setMeldung(`${f.name}: ${uploadFehlertext(res.status === 413 ? "zu_gross" : (d.fehler ?? "allgemein"), tenant, lang)}`);
      }
    }
    setLaedt(false);
    void laden();
  };

  const label = (art: string) => tx(dokumentarten(tenant).find((d) => d.id === art)?.label ?? art, lang);

  return (
    <div className="space-y-4">
      <Glass className="flex flex-wrap items-center justify-between gap-4 rounded-[24px] p-6">
        <p className="max-w-md text-[14px] leading-relaxed text-muted">
          Legen Sie häufig benötigte Unterlagen hier ab, z. B. Ausweiskopie oder Versicherungsnachweis. Beim nächsten Antrag wählen Sie sie einfach aus. Verschlüsselt gespeichert.
        </p>
        <Button onClick={() => input.current?.click()} disabled={laedt}>
          <Icon name="upload" className="size-4" />
          {laedt ? "Wird hochgeladen …" : "Dokument hinzufügen"}
        </Button>
        <input
          ref={input}
          type="file"
          multiple
          accept={ACCEPT}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
          onChange={(e) => {
            void hochladen([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
      </Glass>
      <p aria-live="polite" className="text-[14px] text-danger">
        {meldung}
      </p>
      {liste && liste.length === 0 && <p className="text-[15px] text-muted">Noch keine Dokumente im Safe.</p>}
      <ul className="space-y-2">
        {liste?.map((d) => (
          <li key={d.id}>
            <Glass className="flex items-center gap-4 rounded-[24px] p-4">
              <Vorschau typ={d.typ} />
              <div className="min-w-0 flex-1">
                <a href={`/api/konto/safe/${d.id}`} target="_blank" rel="noopener" className="block truncate text-[15px] font-medium hover:underline">
                  {d.name}
                </a>
                <p className="text-[13px] text-subtle">
                  {label(d.art)} · {formatGroesse(d.groesse, lang)}
                </p>
              </div>
              <button
                type="button"
                aria-label={`${d.name} löschen`}
                className="pressable grid size-10 place-items-center rounded-full text-muted hover:text-danger"
                onClick={async () => {
                  if (!confirm(`„${d.name}“ endgültig löschen?`)) return;
                  await fetch(`/api/konto/safe/${d.id}`, { method: "DELETE" });
                  void laden();
                }}
              >
                <Icon name="trash" className="size-5" />
              </button>
            </Glass>
          </li>
        ))}
      </ul>
    </div>
  );
}
