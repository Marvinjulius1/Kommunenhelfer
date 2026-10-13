/**
 * Erlaubte Dateiformate und Erkennung am INHALT (Magic Bytes), nicht an der Endung.
 * Gemeinsam für Browser (Vorprüfung) und Server (verbindlich).
 */
export const FORMATE = {
  "application/pdf": { endung: "pdf", label: "PDF" },
  "image/jpeg": { endung: "jpg", label: "JPG" },
  "image/png": { endung: "png", label: "PNG" },
  "image/heic": { endung: "heic", label: "HEIC" },
} as const;

export type Dateityp = keyof typeof FORMATE;

export const ACCEPT = "application/pdf,image/jpeg,image/png,image/heic,image/heif,.pdf,.jpg,.jpeg,.png,.heic,.heif";

/** Erkennt den Dateityp anhand der ersten Bytes. */
export function erkenneTyp(b: Uint8Array): Dateityp | null {
  const asc = (start: number, len: number) => String.fromCharCode(...b.subarray(start, start + len));
  if (b.length >= 5 && asc(0, 5) === "%PDF-") return "application/pdf";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 8 && b[0] === 0x89 && asc(1, 3) === "PNG" && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return "image/png";
  if (b.length >= 12 && asc(4, 4) === "ftyp" && ["heic", "heix", "hevc", "hevx", "heim", "heis", "mif1", "msf1"].includes(asc(8, 4))) return "image/heic";
  return null;
}

/** Vorprüfung im Browser anhand von MIME-Typ/Endung (der Server prüft den Inhalt). */
export function typAusDatei(name: string, mime: string): Dateityp | null {
  const m = mime.toLowerCase();
  if (m === "image/heif") return "image/heic";
  if (m in FORMATE) return m as Dateityp;
  const e = name.toLowerCase().split(".").pop();
  if (e === "pdf") return "application/pdf";
  if (e === "jpg" || e === "jpeg") return "image/jpeg";
  if (e === "png") return "image/png";
  if (e === "heic" || e === "heif") return "image/heic";
  return null;
}

/**
 * Bereinigt Dateinamen: keine Pfade, keine Steuerzeichen, begrenzte Länge,
 * Endung passend zum ERKANNTEN Typ.
 */
export function bereinigeDateiname(roh: string, typ: Dateityp): string {
  const ohnePfad = roh.split(/[\\/]/).pop() ?? "";
  const basis = ohnePfad
    .normalize("NFC")
    .replace(/\.[^.]*$/, "")
    .replace(/[\u0000-\u001f\u007f<>:"|?*%]/g, "")
    .replace(/\s+/g, " ")
    .replace(/^[.\s-]+/, "")
    .trim()
    .slice(0, 80);
  return `${basis || "Dokument"}.${FORMATE[typ].endung}`;
}

export function formatGroesse(bytes: number, lang: "de" | "en" = "de"): string {
  const mb = bytes / (1024 * 1024);
  const fmt = new Intl.NumberFormat(lang === "de" ? "de-DE" : "en-GB", { maximumFractionDigits: mb < 10 ? 1 : 0 });
  return mb >= 1 ? `${fmt.format(mb)} MB` : `${fmt.format(Math.max(1, Math.round(bytes / 1024)))} KB`;
}
