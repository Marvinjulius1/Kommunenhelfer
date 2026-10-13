/**
 * Virenscan hochgeladener Dateien.
 *
 * VIRUS_SCAN=clamav  → ClamAV-Daemon (clamd) über TCP: CLAMAV_HOST, CLAMAV_PORT (Standard 3310)
 * VIRUS_SCAN=off     → kein Scan (nur für Entwicklung/Demo, Warnung im Log)
 * nicht gesetzt      → Entwicklung: aus; Produktion: Uploads werden ABGELEHNT (fail closed)
 *
 * Zusätzlich wird die EICAR-Testsignatur immer erkannt (zum Testen der Abläufe).
 */
import "server-only";
import net from "node:net";

export type ScanErgebnis = { ok: true } | { ok: false; grund: "virus" | "scanner_fehlt" | "scanner_fehler" };

const EICAR = "X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*";
let gewarnt = false;

export function modus(): "clamav" | "off" | "fehlt" {
  const v = process.env.VIRUS_SCAN;
  if (v === "clamav" || v === "off") return v;
  return process.env.NODE_ENV === "production" ? "fehlt" : "off";
}

export async function scanne(daten: Buffer): Promise<ScanErgebnis> {
  if (daten.includes(EICAR)) return { ok: false, grund: "virus" };
  const m = modus();
  if (m === "fehlt") return { ok: false, grund: "scanner_fehlt" };
  if (m === "off") {
    if (!gewarnt) console.warn("[virenscan] Kein Virenscanner aktiv (VIRUS_SCAN=off). Nicht für den Produktivbetrieb!");
    gewarnt = true;
    return { ok: true };
  }
  return clamd(daten);
}

/** clamd INSTREAM-Protokoll */
function clamd(daten: Buffer): Promise<ScanErgebnis> {
  return new Promise((resolve) => {
    const sock = net.createConnection({ host: process.env.CLAMAV_HOST || "127.0.0.1", port: Number(process.env.CLAMAV_PORT || 3310) });
    let antwort = "";
    const fertig = (r: ScanErgebnis) => {
      sock.destroy();
      resolve(r);
    };
    sock.setTimeout(30_000, () => fertig({ ok: false, grund: "scanner_fehler" }));
    sock.on("error", () => fertig({ ok: false, grund: "scanner_fehler" }));
    sock.on("data", (d) => (antwort += d.toString()));
    sock.on("end", () => {
      if (/: OK\0?$/.test(antwort.trim())) fertig({ ok: true });
      else if (/FOUND/.test(antwort)) fertig({ ok: false, grund: "virus" });
      else fertig({ ok: false, grund: "scanner_fehler" });
    });
    sock.on("connect", () => {
      sock.write("zINSTREAM\0");
      for (let i = 0; i < daten.length; i += 64 * 1024) {
        const chunk = daten.subarray(i, i + 64 * 1024);
        const len = Buffer.alloc(4);
        len.writeUInt32BE(chunk.length);
        sock.write(len);
        sock.write(chunk);
      }
      sock.write(Buffer.alloc(4));
    });
  });
}
