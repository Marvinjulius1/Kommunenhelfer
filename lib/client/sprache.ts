"use client";

/**
 * Sprachausgabe und Spracheingabe im Browser (Web Speech API).
 *
 * Vorlesen: Es werden bevorzugt Stimmen genutzt, die auf dem Gerät laufen
 * (voice.localService) – dann verlässt kein Text das Gerät.
 *
 * Spracheingabe: Die Erkennung übernimmt der Browser. In Chrome/Edge wird das
 * Audio dafür an Server des Browser-Herstellers gesendet. Deshalb ist die Funktion
 * standardmäßig AUS und die Gemeinde muss sie bewusst einschalten (funktionen.spracheingabe).
 */
import { useCallback, useEffect, useRef, useState } from "react";

export function kannVorlesen() {
  return typeof window !== "undefined" && "speechSynthesis" in window;
}

function stimme(locale: string): SpeechSynthesisVoice | undefined {
  const alle = window.speechSynthesis.getVoices();
  const sprache = locale.slice(0, 2);
  const passend = alle.filter((v) => v.lang.replace("_", "-").toLowerCase().startsWith(sprache));
  return passend.find((v) => v.localService && v.lang.replace("_", "-") === locale) ?? passend.find((v) => v.localService) ?? passend[0];
}

/** Markdown und Sonderzeichen entfernen, damit natürlich vorgelesen wird */
export function sprechbar(text: string) {
  return text
    .replace(/\*\*|__|`/g, "")
    .replace(/^\s*[-*]\s+/gm, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim();
}

export function useVorlesen(locale: string) {
  const [spricht, setSpricht] = useState(false);
  useEffect(() => () => void (kannVorlesen() && window.speechSynthesis.cancel()), []);
  const vorlesen = useCallback(
    (text: string) => {
      if (!kannVorlesen()) return;
      const synth = window.speechSynthesis;
      synth.cancel();
      const u = new SpeechSynthesisUtterance(sprechbar(text));
      u.lang = locale;
      const v = stimme(locale);
      if (v) u.voice = v;
      u.rate = 0.95;
      u.onend = () => setSpricht(false);
      u.onerror = () => setSpricht(false);
      setSpricht(true);
      synth.speak(u);
    },
    [locale],
  );
  const stopp = useCallback(() => {
    if (kannVorlesen()) window.speechSynthesis.cancel();
    setSpricht(false);
  }, []);
  return { spricht, vorlesen, stopp };
}

type Erkennung = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
};

function erkennungsKlasse(): (new () => Erkennung) | undefined {
  if (typeof window === "undefined") return undefined;
  const w = window as unknown as { SpeechRecognition?: new () => Erkennung; webkitSpeechRecognition?: new () => Erkennung };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition;
}

export function kannSpracheingabe() {
  return !!erkennungsKlasse();
}

export function useSpracheingabe(locale: string, onText: (text: string) => void) {
  const [hoert, setHoert] = useState(false);
  const [fehler, setFehler] = useState<string | null>(null);
  const ref = useRef<Erkennung | null>(null);
  useEffect(() => () => ref.current?.stop(), []);

  const start = useCallback(() => {
    const K = erkennungsKlasse();
    if (!K) return;
    setFehler(null);
    const r = new K();
    r.lang = locale;
    r.interimResults = true;
    r.continuous = false;
    r.onresult = (e) => onText(Array.from(e.results, (x) => x[0].transcript).join(" "));
    r.onend = () => setHoert(false);
    r.onerror = (e) => {
      setHoert(false);
      setFehler(e.error === "not-allowed" ? "mikrofon" : "allgemein");
    };
    ref.current = r;
    setHoert(true);
    r.start();
  }, [locale, onText]);

  const stopp = useCallback(() => {
    ref.current?.stop();
    setHoert(false);
  }, []);
  return { hoert, fehler, start, stopp };
}
