"use client";

/**
 * "Meine Anliegen" ohne Benutzerkonto:
 * Vorgangsnummer + Zugangscode werden NUR auf diesem Gerät gespeichert
 * (localStorage). Der Server kennt lediglich einen Hash des Codes.
 * Später ersetzbar durch BundID-Anmeldung.
 */
export interface LokalesAnliegen {
  id: string;
  code: string;
  typ: "antrag" | "termin";
  titel: string;
  erstelltAm: string;
}

const KEY = "anliegen.v1";
const EVENT = "anliegen-change";

export function ladeAnliegen(): LokalesAnliegen[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function speichereAnliegen(a: LokalesAnliegen) {
  const alle = ladeAnliegen().filter((x) => x.id !== a.id);
  alle.unshift(a);
  try {
    localStorage.setItem(KEY, JSON.stringify(alle.slice(0, 50)));
    window.dispatchEvent(new Event(EVENT));
  } catch {}
}

export function entferneAnliegen(id: string) {
  try {
    localStorage.setItem(KEY, JSON.stringify(ladeAnliegen().filter((x) => x.id !== id)));
    window.dispatchEvent(new Event(EVENT));
  } catch {}
}

export function onAnliegenChange(cb: () => void) {
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
