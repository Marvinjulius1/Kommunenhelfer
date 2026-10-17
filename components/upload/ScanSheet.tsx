"use client";

/**
 * Dokument mit der Kamera fotografieren – auch mehrere Seiten,
 * die zu EINEM PDF zusammengefasst werden.
 */
import { useEffect, useRef, useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { Button } from "@/components/ui/Button";
import { Icon } from "@/components/ui/Icon";
import { bilderZuPdf } from "@/lib/client/pdf";
import { Sheet } from "./Sheet";
import { deutsch } from "@/lib/i18n";

export function ScanSheet({ offen, onClose, onFertig }: { offen: boolean; onClose: () => void; onFertig: (f: File) => void }) {
  const { lang } = useTenant();
  const de = deutsch(lang);
  const [seiten, setSeiten] = useState<{ datei: File; url: string }[]>([]);
  const [arbeitet, setArbeitet] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!offen) {
      seiten.forEach((s) => URL.revokeObjectURL(s.url));
      setSeiten([]);
      setFehler(null);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [offen]);

  const fertig = async () => {
    setArbeitet(true);
    setFehler(null);
    try {
      const datum = new Date().toISOString().slice(0, 10);
      onFertig(await bilderZuPdf(seiten.map((s) => s.datei), `Scan ${datum}.pdf`));
      onClose();
    } catch {
      setFehler(de ? "Die Fotos konnten nicht verarbeitet werden. Bitte versuchen Sie es erneut oder laden Sie die Bilder einzeln hoch." : "The photos could not be processed. Please try again or upload them individually.");
    } finally {
      setArbeitet(false);
    }
  };

  return (
    <Sheet offen={offen} onClose={onClose} titel={de ? "Dokument fotografieren" : "Photograph document"}>
      <h2 className="text-[20px] font-semibold tracking-[-0.01em]">{de ? "Dokument fotografieren" : "Photograph document"}</h2>
      <p className="mt-2 text-[15px] text-muted">
        {de ? "Legen Sie das Dokument auf eine ruhige Fläche. Mehrere Seiten werden zu einem PDF zusammengefasst." : "Place the document on a flat surface. Multiple pages are combined into one PDF."}
      </p>

      <input
        ref={input}
        type="file"
        accept="image/*"
        capture="environment"
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) setSeiten((s) => [...s, { datei: f, url: URL.createObjectURL(f) }]);
          e.target.value = "";
        }}
      />

      {seiten.length > 0 && (
        <ul className="mt-6 grid grid-cols-3 gap-2" aria-label={de ? "Aufgenommene Seiten" : "Captured pages"}>
          {seiten.map((s, i) => (
            <li key={s.url} className="relative overflow-hidden rounded-[12px] border border-[var(--line)]">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={s.url} alt={de ? `Seite ${i + 1}` : `Page ${i + 1}`} className="aspect-[3/4] w-full object-cover" />
              <button
                type="button"
                onClick={() => setSeiten((x) => x.filter((_, j) => j !== i))}
                aria-label={de ? `Seite ${i + 1} entfernen` : `Remove page ${i + 1}`}
                className="glass absolute right-1 top-1 grid size-8 place-items-center rounded-full"
              >
                <Icon name="close" className="size-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
      {fehler && (
        <p role="alert" className="mt-4 text-[14px] text-danger">
          {fehler}
        </p>
      )}

      <div className="mt-6 flex flex-col gap-2">
        <Button variant={seiten.length ? "glass" : "primary"} onClick={() => input.current?.click()}>
          <Icon name="camera" className="size-5" />
          {seiten.length ? (de ? "Weitere Seite fotografieren" : "Add another page") : de ? "Kamera öffnen" : "Open camera"}
        </Button>
        {seiten.length > 0 && (
          <Button onClick={fertig} disabled={arbeitet} aria-busy={arbeitet}>
            {arbeitet
              ? de
                ? "PDF wird erstellt …"
                : "Creating PDF …"
              : de
                ? `Fertig – ${seiten.length === 1 ? "1 Seite" : `${seiten.length} Seiten`} hinzufügen`
                : `Done – add ${seiten.length} page(s)`}
          </Button>
        )}
        <Button variant="quiet" onClick={onClose}>
          {de ? "Abbrechen" : "Cancel"}
        </Button>
      </div>
    </Sheet>
  );
}
