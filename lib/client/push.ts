"use client";

/** Push-Benachrichtigungen im Browser aktivieren/deaktivieren. */

export function pushMoeglich(): boolean {
  return typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
}

function base64ZuBytes(b64: string) {
  const s = atob(b64.replace(/-/g, "+").replace(/_/g, "/") + "===".slice((b64.length + 3) % 4));
  return Uint8Array.from(s, (c) => c.charCodeAt(0));
}

async function registrierung() {
  return (await navigator.serviceWorker.getRegistration("/")) ?? (await navigator.serviceWorker.register("/sw.js", { scope: "/" }));
}

export async function pushAbonnieren(themen: ("konto" | "abfall" | "meldungen")[], extra: { abfallBezirk?: string; ortsteil?: string } = {}): Promise<"ok" | "abgelehnt" | "nicht_moeglich" | "fehler"> {
  if (!pushMoeglich()) return "nicht_moeglich";
  try {
    const erlaubnis = await Notification.requestPermission();
    if (erlaubnis !== "granted") return "abgelehnt";
    const { aktiv, schluessel } = await fetch("/api/push/schluessel").then((r) => r.json());
    if (!aktiv) return "nicht_moeglich";
    const reg = await registrierung();
    await navigator.serviceWorker.ready;
    const abo = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64ZuBytes(schluessel) }));
    const res = await fetch("/api/push/abo", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ abo: abo.toJSON(), themen, ...extra }) });
    return res.ok ? "ok" : "fehler";
  } catch {
    return "fehler";
  }
}

export async function pushAbbestellen() {
  if (!pushMoeglich()) return;
  const reg = await navigator.serviceWorker.getRegistration("/");
  const abo = await reg?.pushManager.getSubscription();
  if (!abo) return;
  await fetch("/api/push/abo", { method: "DELETE", headers: { "content-type": "application/json" }, body: JSON.stringify({ endpoint: abo.endpoint }) });
  await abo.unsubscribe();
}
