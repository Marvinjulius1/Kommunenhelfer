"use client";

/**
 * Das zentrale Eingabefeld im Liquid-Glass-Stil.
 * Wächst bei längeren Eingaben mit (Textarea), Enter sendet, Shift+Enter = neue Zeile.
 */
import { motion } from "framer-motion";
import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from "react";
import { useSpecular } from "@/components/ui/Glass";
import { Icon } from "@/components/ui/Icon";
import { useTenant } from "@/components/TenantProvider";
import { spring } from "@/lib/client/motion";

export interface AskFieldHandle {
  focus: () => void;
}

interface Props {
  onSubmit: (text: string) => void;
  disabled?: boolean;
  placeholder: string;
  size?: "hero" | "dock";
  describedBy?: string;
}

export const AskField = forwardRef<AskFieldHandle, Props>(function AskField(
  { onSubmit, disabled, placeholder, size = "hero", describedBy },
  ref,
) {
  const { t } = useTenant();
  const [wert, setWert] = useState("");
  const taRef = useRef<HTMLTextAreaElement>(null);
  const glassRef = useSpecular<HTMLFormElement>();

  useImperativeHandle(ref, () => ({ focus: () => taRef.current?.focus() }));

  // Höhe an den Inhalt anpassen
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 160) + "px";
  }, [wert]);

  const senden = () => {
    const text = wert.trim();
    if (!text || disabled) return;
    onSubmit(text);
    setWert("");
  };

  const hero = size === "hero";
  const kannSenden = wert.trim().length > 0 && !disabled;

  return (
    <motion.form
      ref={glassRef}
      layoutId="ask-field"
      transition={spring}
      role="search"
      onSubmit={(e) => {
        e.preventDefault();
        senden();
      }}
      className={`glass glass-field flex w-full items-end gap-2 ${
        hero ? "rounded-[30px] p-2 pl-6 sm:p-2.5 sm:pl-7" : "rounded-[26px] p-1.5 pl-5"
      }`}
    >
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
        className={`flex-1 resize-none self-center bg-transparent leading-snug text-fg outline-none placeholder:text-subtle focus-visible:outline-none ${
          hero ? "py-3 text-[18px] sm:text-[20px]" : "py-2.5 text-[16px]"
        }`}
        style={{ outline: "none" }}
      />
      <motion.button
        type="submit"
        aria-label={t.senden}
        disabled={!kannSenden}
        animate={{ scale: kannSenden ? 1 : 0.92, opacity: kannSenden ? 1 : 0.35 }}
        transition={spring}
        className={`grid shrink-0 place-items-center rounded-full bg-accent text-on-accent ${hero ? "size-12" : "size-10"}`}
      >
        <Icon name="arrowUp" className={hero ? "size-5" : "size-[18px]"} strokeWidth={2.2} />
      </motion.button>
    </motion.form>
  );
});
