"use client";

/** Ein einzelnes Formularfeld – barrierefrei (Label, Hinweis, Fehler per aria-describedby). */
import type { Feld } from "@/config/types";
import { useTenant } from "@/components/TenantProvider";
import { deutsch, tx } from "@/lib/i18n";
import { Icon } from "@/components/ui/Icon";

interface Props {
  feld: Feld;
  wert: string;
  fehler?: string;
  onChange: (wert: string) => void;
  onBlur?: () => void;
}

function formatIban(v: string) {
  return v
    .replace(/[^a-zA-Z0-9]/g, "")
    .toUpperCase()
    .slice(0, 34)
    .replace(/(.{4})/g, "$1 ")
    .trim();
}

export function Field({ feld, wert, fehler, onChange, onBlur }: Props) {
  const { lang } = useTenant();
  const id = `feld-${feld.id}`;
  const hinweisId = feld.hinweis ? `${id}-hinweis` : undefined;
  const fehlerId = fehler ? `${id}-fehler` : undefined;
  const describedBy = [hinweisId, fehlerId].filter(Boolean).join(" ") || undefined;
  const label = tx(feld.label, lang);
  const pflicht = feld.pflicht ? <span className="sr-only"> (Pflichtfeld)</span> : null;

  const Hinweis = feld.hinweis ? (
    <p id={hinweisId} className="mt-1 text-[13px] leading-snug text-subtle">
      {tx(feld.hinweis, lang)}
    </p>
  ) : null;

  const Fehler = fehler ? (
    <p id={fehlerId} className="mt-2 flex items-start gap-2 text-[14px] text-danger">
      <Icon name="info" className="mt-[1px] size-4 shrink-0" />
      {fehler}
    </p>
  ) : null;

  if (feld.typ === "checkbox") {
    return (
      <div className="sm:col-span-2">
        <label htmlFor={id} className="choice">
          <input
            id={id}
            type="checkbox"
            className="checkbox"
            checked={wert === "true"}
            onChange={(e) => onChange(e.target.checked ? "true" : "")}
            aria-invalid={!!fehler}
            aria-describedby={describedBy}
            aria-required={feld.pflicht}
          />
          <span className="text-[15px] leading-relaxed">
            {label}
            {pflicht}
          </span>
        </label>
        {Hinweis}
        {Fehler}
      </div>
    );
  }

  if (feld.typ === "radio" && feld.optionen) {
    return (
      <fieldset className="sm:col-span-2" aria-describedby={describedBy}>
        <legend className="text-[15px] font-medium">
          {label}
          {pflicht}
        </legend>
        {Hinweis}
        <div className="mt-3 grid gap-2">
          {feld.optionen.map((o) => (
            <label key={o.wert} className="choice">
              <input
                type="radio"
                className="radio"
                name={feld.id}
                value={o.wert}
                checked={wert === o.wert}
                onChange={() => onChange(o.wert)}
                required={feld.pflicht}
              />
              <span className="flex flex-col">
                <span className="text-[15px]">{tx(o.label, lang)}</span>
                {o.hinweis && <span className="text-[13px] text-subtle">{tx(o.hinweis, lang)}</span>}
              </span>
            </label>
          ))}
        </div>
        {Fehler}
      </fieldset>
    );
  }

  const gemeinsam = {
    id,
    value: wert,
    onBlur,
    "aria-invalid": !!fehler,
    "aria-describedby": describedBy,
    "aria-required": feld.pflicht,
    className: "field-input mt-2",
    autoComplete: feld.autocomplete ?? "off",
  };

  let control: React.ReactNode;
  if (feld.typ === "textarea") {
    control = <textarea {...gemeinsam} rows={3} maxLength={feld.maxLaenge ?? 2000} onChange={(e) => onChange(e.target.value)} />;
  } else if (feld.typ === "select" && feld.optionen) {
    control = (
      <select {...gemeinsam} onChange={(e) => onChange(e.target.value)}>
        <option value="" disabled>
          {deutsch(lang) ? "Bitte auswählen" : "Please choose"}
        </option>
        {feld.optionen.map((o) => (
          <option key={o.wert} value={o.wert}>
            {tx(o.label, lang)}
          </option>
        ))}
      </select>
    );
  } else {
    const typ = { email: "email", tel: "tel", date: "date", number: "number" }[feld.typ as string] ?? "text";
    control = (
      <input
        {...gemeinsam}
        type={typ}
        inputMode={feld.typ === "plz" ? "numeric" : feld.typ === "iban" ? "text" : undefined}
        maxLength={feld.typ === "plz" ? 5 : feld.typ === "iban" ? 42 : feld.maxLaenge}
        min={feld.min}
        max={feld.max}
        spellCheck={feld.typ === "text" ? undefined : false}
        onChange={(e) => onChange(feld.typ === "iban" ? formatIban(e.target.value) : e.target.value)}
        className={`${gemeinsam.className} ${feld.typ === "iban" ? "font-mono tracking-wide" : ""}`}
      />
    );
  }

  return (
    <div className={feld.halb ? "" : "sm:col-span-2"}>
      <label htmlFor={id} className="text-[15px] font-medium">
        {label}
        {pflicht}
      </label>
      {Hinweis}
      {control}
      {Fehler}
    </div>
  );
}
