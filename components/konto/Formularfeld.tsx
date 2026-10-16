/** Schlichtes Eingabefeld mit Label – für Konto-Formulare. */
export function Eingabe({
  id,
  label,
  hinweis,
  ...rest
}: React.InputHTMLAttributes<HTMLInputElement> & { id: string; label: string; hinweis?: string }) {
  return (
    <div>
      <label htmlFor={id} className="text-[14px] font-medium">
        {label}
      </label>
      {hinweis && (
        <p id={`${id}-h`} className="mt-1 text-[13px] text-subtle">
          {hinweis}
        </p>
      )}
      <input id={id} aria-describedby={hinweis ? `${id}-h` : undefined} className="field-input mt-1" {...rest} />
    </div>
  );
}

/** Sichere Weiterleitung nach der Anmeldung: nur relative Pfade innerhalb des Portals. */
export function sichererPfad(p: string | null | undefined, fallback = "/konto"): string {
  return p && /^\/(?!\/)[\w\-/?=&.%]*$/.test(p) ? p : fallback;
}
