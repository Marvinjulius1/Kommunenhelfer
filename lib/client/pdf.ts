"use client";

/**
 * Fasst fotografierte Seiten zu EINEM PDF zusammen – komplett im Browser,
 * ohne Bibliothek. Bilder werden verkleinert (max. 2000 px) und als JPEG eingebettet.
 */

const MAX_KANTE = 2000;

async function alsJpeg(datei: File): Promise<{ bytes: Uint8Array; breite: number; hoehe: number }> {
  const bild = await createImageBitmap(datei).catch(() => {
    throw new Error("bild_nicht_lesbar");
  });
  const f = Math.min(1, MAX_KANTE / Math.max(bild.width, bild.height));
  const breite = Math.round(bild.width * f);
  const hoehe = Math.round(bild.height * f);
  const canvas = document.createElement("canvas");
  canvas.width = breite;
  canvas.height = hoehe;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = "#fff";
  ctx.fillRect(0, 0, breite, hoehe);
  ctx.drawImage(bild, 0, 0, breite, hoehe);
  bild.close();
  const blob = await new Promise<Blob>((res, rej) => canvas.toBlob((b) => (b ? res(b) : rej(new Error("bild_nicht_lesbar"))), "image/jpeg", 0.85));
  return { bytes: new Uint8Array(await blob.arrayBuffer()), breite, hoehe };
}

export async function bilderZuPdf(seiten: File[], dateiname: string): Promise<File> {
  const bilder = [];
  for (const s of seiten) bilder.push(await alsJpeg(s));

  const enc = new TextEncoder();
  const teile: Uint8Array[] = [];
  const offsets: number[] = [];
  let laenge = 0;
  const schreibe = (x: string | Uint8Array) => {
    const b = typeof x === "string" ? enc.encode(x) : x;
    teile.push(b);
    laenge += b.length;
  };
  const objekt = (nr: number, inhalt: () => void) => {
    offsets[nr] = laenge;
    schreibe(`${nr} 0 obj\n`);
    inhalt();
    schreibe("\nendobj\n");
  };

  schreibe("%PDF-1.4\n%âãÏÓ\n");
  const seitenNr = bilder.map((_, i) => 3 + i * 3);
  objekt(1, () => schreibe("<< /Type /Catalog /Pages 2 0 R >>"));
  objekt(2, () => schreibe(`<< /Type /Pages /Kids [${seitenNr.map((n) => `${n} 0 R`).join(" ")}] /Count ${bilder.length} >>`));

  bilder.forEach((b, i) => {
    const [seite, bildObj, inhaltObj] = [seitenNr[i], seitenNr[i] + 1, seitenNr[i] + 2];
    // A4, Ausrichtung nach Bild
    const quer = b.breite > b.hoehe;
    const W = quer ? 841.89 : 595.28;
    const H = quer ? 595.28 : 841.89;
    const s = Math.min(W / b.breite, H / b.hoehe);
    const w = b.breite * s;
    const h = b.hoehe * s;
    const inhalt = `q ${w.toFixed(2)} 0 0 ${h.toFixed(2)} ${((W - w) / 2).toFixed(2)} ${((H - h) / 2).toFixed(2)} cm /Im0 Do Q`;
    objekt(seite, () =>
      schreibe(`<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${bildObj} 0 R >> >> /Contents ${inhaltObj} 0 R >>`),
    );
    objekt(bildObj, () => {
      schreibe(`<< /Type /XObject /Subtype /Image /Width ${b.breite} /Height ${b.hoehe} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${b.bytes.length} >>\nstream\n`);
      schreibe(b.bytes);
      schreibe("\nendstream");
    });
    objekt(inhaltObj, () => schreibe(`<< /Length ${inhalt.length} >>\nstream\n${inhalt}\nendstream`));
  });

  const xref = laenge;
  const anzahl = 3 + bilder.length * 3;
  schreibe(`xref\n0 ${anzahl}\n0000000000 65535 f \n`);
  for (let i = 1; i < anzahl; i++) schreibe(`${String(offsets[i]).padStart(10, "0")} 00000 n \n`);
  schreibe(`trailer\n<< /Size ${anzahl} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF\n`);

  return new File(teile as BlobPart[], dateiname, { type: "application/pdf" });
}
