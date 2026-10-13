"use client";

import { useEffect } from "react";

/** Registriert den Service Worker (PWA, Offline-Hinweis). Nur in Produktion. */
export function ServiceWorker() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production" || !("serviceWorker" in navigator)) return;
    navigator.serviceWorker.register("/sw.js", { scope: "/" }).catch(() => undefined);
  }, []);
  return null;
}
