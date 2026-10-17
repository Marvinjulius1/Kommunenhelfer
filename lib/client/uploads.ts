"use client";

/**
 * Upload-Logik im Browser:
 *  - Vorprüfung (Format, Größe, Anzahl, Duplikate) mit ruhigen, klaren Hinweisen
 *  - Upload mit Fortschritt pro Datei (XHR), Abbrechen, Erneut versuchen
 *  - automatische Wiederaufnahme, sobald die Verbindung zurück ist
 *  - Vorschau-Thumbnails (nur lokal im Browser, werden nie übertragen)
 */
import { useCallback, useEffect, useRef, useState } from "react";
import type { GemeindeConfig, Sprache } from "@/config/types";
import { formatGroesse, typAusDatei, type Dateityp } from "@/lib/uploads/formate";
import { deutsch } from "@/lib/i18n";

export type AnhangStatus = "laedt" | "fertig" | "fehler";

export interface Anhang {
  lokalId: string;
  name: string;
  groesse: number;
  typ: Dateityp | null;
  vorschau?: string;
  status: AnhangStatus;
  fortschritt: number;
  fehler?: string;
  /** Fehler durch Verbindungsabbruch → automatisch erneut versuchen */
  netzFehler?: boolean;
  serverId?: string;
  art?: string;
  artSicher?: boolean;
  seiten?: number;
  hash: string;
  datei?: File;
}

export interface SafeDatei {
  id: string;
  name: string;
  typ: string;
  groesse: number;
}

const ENTWURF_KEY = "upload-entwurf.v1";
const EINWILLIGUNG_KEY = "upload-einwilligung.v1";

function neueId(bytes = 18) {
  const a = crypto.getRandomValues(new Uint8Array(bytes));
  return btoa(String.fromCharCode(...a)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function entwurfId(neu = false): string {
  try {
    let id = sessionStorage.getItem(ENTWURF_KEY);
    if (!id || neu) {
      id = neueId();
      sessionStorage.setItem(ENTWURF_KEY, id);
    }
    return id;
  } catch {
    return neueId();
  }
}

async function hashDatei(f: File): Promise<string> {
  const buf = await crypto.subtle.digest("SHA-256", await f.arrayBuffer());
  return Array.from(new Uint8Array(buf), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Ruhige, verständliche Fehlertexte – nie technisch. */
export function uploadFehlertext(code: string, tenant: GemeindeConfig, lang: Sprache): string {
  const u = tenant.uploads;
  const de = deutsch(lang);
  const t: Record<string, [string, string]> = {
    zu_gross: [`Das Dokument ist zu groß. Maximal ${u.maxDateiMB} MB pro Datei.`, `The document is too large. Maximum ${u.maxDateiMB} MB per file.`],
    gesamt_zu_gross: [`Zusammen dürfen die Dateien höchstens ${u.maxGesamtMB} MB groß sein.`, `Together the files may be at most ${u.maxGesamtMB} MB.`],
    zu_viele: [`Sie können höchstens ${u.maxDateien} Dateien pro Anliegen senden.`, `You can send at most ${u.maxDateien} files per request.`],
    format: ["Dieses Format können wir leider nicht annehmen. Bitte verwenden Sie PDF, JPG, PNG oder HEIC.", "We cannot accept this format. Please use PDF, JPG, PNG or HEIC."],
    aktiver_inhalt: [
      "Dieses PDF enthält aktive Inhalte und kann aus Sicherheitsgründen nicht angenommen werden. Bitte speichern Sie es neu als PDF oder fotografieren Sie das Dokument.",
      "This PDF contains active content and cannot be accepted for security reasons. Please save it again as a PDF or take a photo of the document.",
    ],
    virus: ["In dieser Datei wurde Schadsoftware gefunden. Sie wurde nicht angenommen.", "Malware was found in this file. It was not accepted."],
    scanner: ["Die Sicherheitsprüfung ist gerade nicht erreichbar. Bitte versuchen Sie es in einigen Minuten erneut.", "The security check is currently unavailable. Please try again in a few minutes."],
    leer: ["Die Datei ist leer.", "The file is empty."],
    netz: ["Die Verbindung wurde unterbrochen. Wir versuchen es automatisch erneut.", "The connection was interrupted. We will retry automatically."],
    zu_viele_anfragen: ["Sie haben sehr viele Dateien gesendet. Bitte warten Sie einen Moment.", "You have sent many files. Please wait a moment."],
    einwilligung_fehlt: ["Bitte stimmen Sie zuerst dem Datenschutzhinweis zu.", "Please accept the privacy notice first."],
    duplikat: ["Diese Datei haben Sie bereits hinzugefügt.", "You have already added this file."],
    allgemein: ["Das hat leider nicht geklappt. Bitte versuchen Sie es noch einmal.", "Unfortunately that did not work. Please try again."],
  };
  return (t[code] ?? t.allgemein)[de ? 0 : 1];
}

export function useUploads(tenant: GemeindeConfig, lang: Sprache) {
  const [anhaenge, setAnhaenge] = useState<Anhang[]>([]);
  const [hinweis, setHinweis] = useState<string | null>(null);
  const [einwilligung, setEinwilligung] = useState(false);
  const [wartend, setWartend] = useState<(() => void) | null>(null);
  const xhrs = useRef(new Map<string, XMLHttpRequest>());
  const stand = useRef<Anhang[]>([]);
  stand.current = anhaenge;

  useEffect(() => {
    try {
      setEinwilligung(sessionStorage.getItem(EINWILLIGUNG_KEY) === "1");
    } catch {}
  }, []);

  const aendern = useCallback((lokalId: string, patch: Partial<Anhang>) => {
    setAnhaenge((liste) => liste.map((a) => (a.lokalId === lokalId ? { ...a, ...patch } : a)));
  }, []);

  const hochladen = useCallback(
    (a: Anhang) => {
      if (!a.datei) return;
      const xhr = new XMLHttpRequest();
      xhrs.current.set(a.lokalId, xhr);
      aendern(a.lokalId, { status: "laedt", fortschritt: 0, fehler: undefined, netzFehler: false });
      xhr.open("POST", `/api/upload?entwurf=${encodeURIComponent(entwurfId())}`);
      xhr.setRequestHeader("x-dateiname", encodeURIComponent(a.name));
      xhr.setRequestHeader("x-einwilligung", "1");
      xhr.setRequestHeader("content-type", a.datei.type || "application/octet-stream");
      xhr.upload.onprogress = (e) => e.lengthComputable && aendern(a.lokalId, { fortschritt: e.loaded / e.total });
      xhr.onload = () => {
        xhrs.current.delete(a.lokalId);
        let d: Record<string, unknown> = {};
        try {
          d = JSON.parse(xhr.responseText);
        } catch {}
        if (xhr.status === 200 || xhr.status === 201) {
          if (d.duplikat) {
            setAnhaenge((l) => l.filter((x) => x.lokalId !== a.lokalId));
            setHinweis(uploadFehlertext("duplikat", tenant, lang));
            return;
          }
          aendern(a.lokalId, {
            status: "fertig",
            fortschritt: 1,
            serverId: d.id as string,
            art: d.art as string,
            artSicher: d.artSicher as boolean,
            seiten: d.seiten as number | undefined,
            datei: undefined, // Datei wird nicht länger im Speicher gehalten
          });
        } else {
          const code = xhr.status === 429 ? "zu_viele_anfragen" : xhr.status === 413 ? "zu_gross" : ((d.fehler as string) ?? "allgemein");
          aendern(a.lokalId, { status: "fehler", fehler: uploadFehlertext(code, tenant, lang) });
        }
      };
      xhr.onerror = () => {
        xhrs.current.delete(a.lokalId);
        aendern(a.lokalId, { status: "fehler", fehler: uploadFehlertext("netz", tenant, lang), netzFehler: true });
      };
      xhr.send(a.datei);
    },
    [aendern, tenant, lang],
  );

  // Wiederaufnahme: sobald das Gerät wieder online ist, abgebrochene Uploads erneut senden
  useEffect(() => {
    const online = () => stand.current.filter((a) => a.netzFehler && a.datei).forEach(hochladen);
    window.addEventListener("online", online);
    return () => window.removeEventListener("online", online);
  }, [hochladen]);

  const verarbeiten = useCallback(
    async (dateien: File[]) => {
      const u = tenant.uploads;
      let liste = stand.current.filter((a) => a.status !== "fehler");
      for (const datei of dateien) {
        const typ = typAusDatei(datei.name, datei.type);
        if (!typ) {
          setHinweis(`${datei.name}: ${uploadFehlertext("format", tenant, lang)}`);
          continue;
        }
        if (datei.size > u.maxDateiMB * 1024 * 1024) {
          setHinweis(`${datei.name} (${formatGroesse(datei.size, lang)}): ${uploadFehlertext("zu_gross", tenant, lang)}`);
          continue;
        }
        if (liste.length >= u.maxDateien) {
          setHinweis(uploadFehlertext("zu_viele", tenant, lang));
          break;
        }
        if (liste.reduce((s, a) => s + a.groesse, 0) + datei.size > u.maxGesamtMB * 1024 * 1024) {
          setHinweis(uploadFehlertext("gesamt_zu_gross", tenant, lang));
          break;
        }
        const hash = await hashDatei(datei);
        if (liste.some((a) => a.hash === hash)) {
          setHinweis(uploadFehlertext("duplikat", tenant, lang));
          continue;
        }
        const neu: Anhang = {
          lokalId: neueId(9),
          name: datei.name,
          groesse: datei.size,
          typ,
          vorschau: typ === "image/jpeg" || typ === "image/png" ? URL.createObjectURL(datei) : undefined,
          status: "laedt",
          fortschritt: 0,
          hash,
          datei,
        };
        liste = [...liste, neu];
        setAnhaenge((l) => [...l, neu]);
        hochladen(neu);
      }
    },
    [tenant, lang, hochladen],
  );

  /** Dateien hinzufügen. Ohne Einwilligung wird zuerst der Datenschutzhinweis gezeigt. */
  const hinzufuegen = useCallback(
    (dateien: File[]) => {
      if (!dateien.length) return;
      setHinweis(null);
      if (!einwilligung) setWartend(() => () => void verarbeiten(dateien));
      else void verarbeiten(dateien);
    },
    [einwilligung, verarbeiten],
  );

  const einwilligen = useCallback(() => {
    try {
      sessionStorage.setItem(EINWILLIGUNG_KEY, "1");
    } catch {}
    setEinwilligung(true);
    wartend?.();
    setWartend(null);
  }, [wartend]);

  const ablehnen = useCallback(() => setWartend(null), []);

  const entfernen = useCallback((lokalId: string) => {
    const a = stand.current.find((x) => x.lokalId === lokalId);
    if (!a) return;
    xhrs.current.get(lokalId)?.abort();
    xhrs.current.delete(lokalId);
    if (a.serverId) {
      void fetch("/api/upload", {
        method: "DELETE",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ entwurf: entwurfId(), id: a.serverId }),
      }).catch(() => undefined);
    }
    // Vorschau erst später freigeben – sie wird ggf. noch in der Zusammenfassung angezeigt
    setAnhaenge((l) => l.filter((x) => x.lokalId !== lokalId));
  }, []);

  const erneut = useCallback((lokalId: string) => {
    const a = stand.current.find((x) => x.lokalId === lokalId);
    if (a?.datei) hochladen(a);
  }, [hochladen]);

  /** Datei aus dem Dokumentensafe übernehmen – sie liegt schon geprüft auf dem Server. */
  const uebernehmeAusSafe = useCallback(
    async (s: SafeDatei) => {
      const liste = stand.current.filter((a) => a.status !== "fehler");
      if (liste.length >= tenant.uploads.maxDateien) return setHinweis(uploadFehlertext("zu_viele", tenant, lang));
      if (liste.some((a) => a.hash === `safe:${s.id}`)) return setHinweis(uploadFehlertext("duplikat", tenant, lang));
      const lokalId = neueId(9);
      setAnhaenge((l) => [...l, { lokalId, name: s.name, groesse: s.groesse, typ: s.typ as Dateityp, status: "laedt", fortschritt: 0.5, hash: `safe:${s.id}` }]);
      try {
        const r = await fetch(`/api/konto/safe/${encodeURIComponent(s.id)}`, {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ entwurf: entwurfId() }),
        });
        const d = await r.json().catch(() => ({}));
        if (!r.ok) throw new Error(d.fehler ?? "allgemein");
        aendern(lokalId, { status: "fertig", fortschritt: 1, serverId: d.id, art: d.art, artSicher: d.artSicher, seiten: d.seiten });
      } catch (e) {
        aendern(lokalId, { status: "fehler", fehler: uploadFehlertext(e instanceof Error ? e.message : "allgemein", tenant, lang) });
      }
    },
    [aendern, tenant, lang],
  );

  const ausSafe = useCallback(
    (s: SafeDatei) => {
      setHinweis(null);
      if (!einwilligung) setWartend(() => () => void uebernehmeAusSafe(s));
      else void uebernehmeAusSafe(s);
    },
    [einwilligung, uebernehmeAusSafe],
  );

  /** Übergibt fertige Anhänge an die Nachricht und leert die Ablage. */
  const uebergeben = useCallback((): Anhang[] => {
    const fertig = stand.current.filter((a) => a.status === "fertig");
    setAnhaenge((l) => l.filter((a) => a.status !== "fertig"));
    return fertig;
  }, []);

  return {
    anhaenge,
    hinweis,
    setHinweis,
    einwilligungNoetig: wartend !== null,
    einwilligen,
    ablehnen,
    hinzufuegen,
    ausSafe,
    entfernen,
    erneut,
    uebergeben,
    laedt: anhaenge.some((a) => a.status === "laedt"),
  };
}
