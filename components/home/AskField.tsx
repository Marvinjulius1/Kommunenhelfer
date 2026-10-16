"use client";

/**
 * Das zentrale Eingabefeld (Liquid Glass) – mit Dateiablage.
 * Enter sendet, Shift+Enter = neue Zeile. Büroklammer: Datei wählen oder
 * (auf Mobilgeräten) Dokument fotografieren.
 */
import { AnimatePresence, motion } from "framer-motion";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useTenant } from "@/components/TenantProvider";
import { Icon } from "@/components/ui/Icon";
import { AttachmentTray } from "@/components/upload/AttachmentTray";
import type { Anhang } from "@/lib/client/uploads";
import { feder } from "@/lib/motion";
import { ACCEPT } from "@/lib/uploads/formate";

export interface AskFieldHandle {
  focus: () => void;
}

interface Props {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  placeholder: string;
  size?: "hero" | "dock";
  describedBy?: string;
  uploads?: {
    anhaenge: Anhang[];
    laedt: boolean;
    onDateien: (f: File[]) => void;
    onScan: () => void;
    /** Nur mit Bürgerkonto: Auswahl aus dem Dokumentensafe */
    onSafe?: () => void;
    onEntfernen: (id: string) => void;
    onErneut: (id: string) => void;
  };
}

export const AskField = forwardRef<AskFieldHandle, Props>(function AskField({ onSubmit, disabled, placeholder, size = "hero", describedBy, uploads }, ref) {
  const { lang, t } = useTenant();
  const de = lang === "de";
  const [wert, setWert] = useState("");
  const [menue, setMenue] = useState(false);
  const [kameraGeraet, setKamera] = useState(false);
  // Menü statt direkter Dateiauswahl, sobald es mehr als eine Quelle gibt
  const kamera = kameraGeraet || !!uploads?.onSafe;
  const taRef = useRef<HTMLTextAreaElement>(null);
  const dateiRef = useRef<HTMLInputElement>(null);
  const menueRef = useRef<HTMLDivElement>(null);

  useImperativeHandle(ref, () => ({ focus: () => taRef.current?.focus({ preventScroll: true }) }));

  useEffect(() => setKamera(matchMedia("(pointer: coarse)").matches), []);

  // Höhe an den Inhalt anpassen (max. ca. 6 Zeilen)
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    // Leeres Feld: nichts messen (vermeidet einen erzwungenen Reflow beim Laden)
    if (!wert) {
      ta.style.height = "";
      return;
    }
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 168) + "px";
  }, [wert]);

  useEffect(() => {
    if (!menue) return;
    const zu = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === "Escape" : !menueRef.current?.contains(e.target as Node)) setMenue(false);
    };
    document.addEventListener("click", zu);
    document.addEventListener("keydown", zu);
    return () => {
      document.removeEventListener("click", zu);
      document.removeEventListener("keydown", zu);
    };
  }, [menue]);

  const fertige = uploads?.anhaenge.filter((a) => a.status === "fertig").length ?? 0;
  const kannSenden = (wert.trim().length > 0 || fertige > 0) && !disabled && !uploads?.laedt;

  const senden = () => {
    if (!kannSenden) return;
    onSubmit(wert.trim());
    setWert("");
  };

  const hero = size === "hero";

  return (
    <form
      role="search"
      aria-label={t.eingabeLabel}
      onSubmit={(e) => {
        e.preventDefault();
        senden();
      }}
      className={`glass glass-field w-full ${hero ? "rounded-[32px]" : "rounded-[28px]"}`}
    >
      {uploads && <AttachmentTray anhaenge={uploads.anhaenge} onEntfernen={uploads.onEntfernen} onErneut={uploads.onErneut} />}
      <div className={`flex items-end gap-1 ${hero ? "p-2" : "p-1.5"}`}>
        {uploads && (
          <div className="relative" ref={menueRef}>
            <button
              type="button"
              aria-label={de ? "Dokument hinzufügen" : "Add document"}
              aria-haspopup={kamera ? "menu" : undefined}
              aria-expanded={kamera ? menue : undefined}
              onClick={() => (kamera ? setMenue((m) => !m) : dateiRef.current?.click())}
              className={`pressable grid shrink-0 place-items-center rounded-full text-subtle hover:text-fg ${hero ? "size-12" : "size-10"}`}
            >
              <Icon name="paperclip" className="size-5" />
            </button>
            <AnimatePresence>
              {menue && (
                <motion.div
                  role="menu"
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 4 }}
                  transition={feder.klein}
                  className="glass absolute bottom-14 left-0 z-20 w-60 rounded-[24px] p-2"
                >
                  {kameraGeraet && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenue(false);
                        uploads.onScan();
                      }}
                      className="flex w-full items-center gap-4 rounded-[16px] px-4 py-4 text-left text-[15px]"
                    >
                      <Icon name="camera" className="size-5 text-muted" />
                      {de ? "Dokument fotografieren" : "Photograph document"}
                    </button>
                  )}
                  <button
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      setMenue(false);
                      dateiRef.current?.click();
                    }}
                    className="flex w-full items-center gap-4 rounded-[16px] px-4 py-4 text-left text-[15px]"
                  >
                    <Icon name="file" className="size-5 text-muted" />
                    {de ? "Datei auswählen" : "Choose file"}
                  </button>
                  {uploads.onSafe && (
                    <button
                      type="button"
                      role="menuitem"
                      onClick={() => {
                        setMenue(false);
                        uploads.onSafe?.();
                      }}
                      className="flex w-full items-center gap-4 rounded-[16px] px-4 py-4 text-left text-[15px]"
                    >
                      <Icon name="lock" className="size-5 text-muted" />
                      {de ? "Aus meinem Dokumentensafe" : "From my document safe"}
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            <input
              ref={dateiRef}
              type="file"
              multiple
              accept={ACCEPT}
              className="sr-only"
              tabIndex={-1}
              aria-hidden="true"
              onChange={(e) => {
                uploads.onDateien([...(e.target.files ?? [])]);
                e.target.value = "";
              }}
            />
          </div>
        )}
        <label htmlFor="anliegen" className="sr-only">
          {t.eingabeLabel}
        </label>
        <textarea
          id="anliegen"
          ref={taRef}
          rows={1}
          value={wert}
          maxLength={1000}
          onChange={(e) => setWert(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey && !e.nativeEvent.isComposing) {
              e.preventDefault();
              senden();
            }
          }}
          placeholder={placeholder}
          aria-describedby={describedBy}
          autoComplete="off"
          enterKeyHint="send"
          className={`min-w-0 flex-1 resize-none self-center bg-transparent leading-snug text-fg outline-none placeholder:text-subtle focus-visible:outline-none ${
            uploads ? "" : "pl-4"
          } ${hero ? "py-3 text-[17px] sm:text-[19px]" : "py-2 text-[16px]"}`}
          style={{ outline: "none" }}
        />
        <button
          type="submit"
          aria-label={uploads?.laedt ? (de ? "Senden – bitte warten, Dateien werden hochgeladen" : "Send – please wait, uploading") : t.senden}
          disabled={!kannSenden}
          className={`pressable grid shrink-0 place-items-center rounded-full bg-fg text-bg disabled:opacity-25 ${hero ? "size-12" : "size-10"}`}
        >
          <Icon name="arrowUp" className="size-5" />
        </button>
      </div>
    </form>
  );
});
