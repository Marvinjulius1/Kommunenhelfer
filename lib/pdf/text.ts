/**
 * Schlichte Text-PDFs ohne Bibliothek (A4, Helvetica, WinAnsi): Antragszusammenfassung
 * für die E-Akte, den Druck oder die Übergabe an ein Dokumentenmanagementsystem.
 */

export interface PdfAbschnitt {
  ueberschrift?: string;
  zeilen: [beschriftung: string, wert: string][] | string[];
}

const SONDER: Record<string, number> = { "€": 0x80, "‚": 0x82, "„": 0x84, "…": 0x85, "‘": 0x91, "’": 0x92, "“": 0x93, "”": 0x94, "•": 0x95, "–": 0x96, "—": 0x97 };

/** Text → Windows-1252-Bytes als PDF-String (Klammern und Backslash maskiert) */
function pdfText(s: string): string {
  let out = "";
  for (const ch of s.normalize("NFC")) {
    const c = ch.codePointAt(0)!;
    const b = SONDER[ch] ?? (c < 256 ? c : 0x3f);
    const z = String.fromCharCode(b);
    out += z === "(" || z === ")" || z === "\\" ? "\\" + z : b < 32 || b > 126 ? `\\${b.toString(8).padStart(3, "0")}` : z;
  }
  return out;
}

/** Grober Zeilenumbruch nach Zeichenzahl (Helvetica 10 pt ≈ 0,5 em je Zeichen) */
function umbrechen(text: string, max: number): string[] {
  const zeilen: string[] = [];
  for (const absatz of text.split("\n")) {
    let z = "";
    for (const wort of absatz.split(/\s+/)) {
      if ((z + " " + wort).trim().length > max) {
        if (z) zeilen.push(z);
        z = wort.length > max ? wort.slice(0, max) : wort;
      } else z = (z + " " + wort).trim();
    }
    zeilen.push(z);
  }
  return zeilen;
}

export function textPdf(titel: string, unterzeile: string, abschnitte: PdfAbschnitt[], fusszeile: string): Buffer {
  type Zeile = { text: string; x: number; groesse: number; fett?: boolean; abstand: number };
  const zeilen: Zeile[] = [
    { text: titel, x: 56, groesse: 16, fett: true, abstand: 22 },
    { text: unterzeile, x: 56, groesse: 9, abstand: 24 },
  ];
  for (const a of abschnitte) {
    if (a.ueberschrift) zeilen.push({ text: a.ueberschrift, x: 56, groesse: 11, fett: true, abstand: 18 });
    for (const z of a.zeilen) {
      if (typeof z === "string") for (const t of umbrechen(z, 95)) zeilen.push({ text: t, x: 56, groesse: 10, abstand: 14 });
      else {
        const wert = umbrechen(z[1] || "–", 62);
        zeilen.push({ text: z[0], x: 56, groesse: 9, abstand: 0 });
        wert.forEach((t, i) => zeilen.push({ text: t, x: 220, groesse: 10, abstand: 14 + (i === wert.length - 1 ? 2 : 0) }));
      }
    }
    zeilen.push({ text: "", x: 56, groesse: 10, abstand: 10 });
  }

  // Auf Seiten verteilen (A4 = 595 × 842 pt, Ränder 56/60)
  const seiten: string[] = [];
  let y = 782;
  let inhalt = "";
  const seiteFertig = () => {
    seiten.push(inhalt);
    inhalt = "";
    y = 782;
  };
  for (const z of zeilen) {
    if (y < 80) seiteFertig();
    if (z.text) inhalt += `BT /${z.fett ? "F2" : "F1"} ${z.groesse} Tf ${z.x} ${y} Td (${pdfText(z.text)}) Tj ET\n`;
    y -= z.abstand;
  }
  seiteFertig();

  const objekte: string[] = [];
  const n = seiten.length;
  // 1 Katalog, 2 Seitenbaum, 3/4 Schriften, dann je Seite: Seite + Inhalt
  objekte.push("<< /Type /Catalog /Pages 2 0 R >>");
  objekte.push(`<< /Type /Pages /Count ${n} /Kids [${seiten.map((_, i) => `${5 + i * 2} 0 R`).join(" ")}] >>`);
  objekte.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>");
  objekte.push("<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>");
  seiten.forEach((s, i) => {
    const fuss = `BT /F1 8 Tf 56 40 Td (${pdfText(`${fusszeile} · Seite ${i + 1} von ${n}`)}) Tj ET\n`;
    const stream = s + fuss;
    objekte.push(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${6 + i * 2} 0 R >>`);
    objekte.push(`<< /Length ${Buffer.byteLength(stream, "latin1")} >>\nstream\n${stream}endstream`);
  });

  let pdf = "%PDF-1.4\n%\xe2\xe3\xcf\xd3\n";
  const offsets: number[] = [];
  objekte.forEach((o, i) => {
    offsets.push(Buffer.byteLength(pdf, "latin1"));
    pdf += `${i + 1} 0 obj\n${o}\nendobj\n`;
  });
  const xref = Buffer.byteLength(pdf, "latin1");
  pdf += `xref\n0 ${objekte.length + 1}\n0000000000 65535 f \n${offsets.map((o) => `${String(o).padStart(10, "0")} 00000 n \n`).join("")}trailer\n<< /Size ${objekte.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return Buffer.from(pdf, "latin1");
}
