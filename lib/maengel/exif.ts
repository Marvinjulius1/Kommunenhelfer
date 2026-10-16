/**
 * Entfernt Metadaten aus Fotos, bevor sie gespeichert werden – vor allem
 * GPS-Position, Gerät und Aufnahmezeit (EXIF/XMP/IPTC). Bildinhalt und
 * Farbprofil bleiben unverändert.
 */

/** JPEG: APP1 (EXIF, XMP) und APP13 (IPTC) bis zum Bildbeginn verwerfen. null = Struktur unklar. */
function jpeg(b: Buffer): Buffer | null {
  const teile: Buffer[] = [b.subarray(0, 2)];
  let i = 2;
  while (i + 4 <= b.length) {
    if (b[i] !== 0xff) return null; // unerwartete Struktur: lieber ablehnen als Metadaten durchlassen
    const marker = b[i + 1];
    if (marker === 0xda) {
      teile.push(b.subarray(i)); // Start of Scan: Rest ist Bilddaten
      return Buffer.concat(teile);
    }
    const laenge = b.readUInt16BE(i + 2);
    if (laenge < 2 || i + 2 + laenge > b.length) return null;
    if (marker !== 0xe1 && marker !== 0xed) teile.push(b.subarray(i, i + 2 + laenge));
    i += 2 + laenge;
  }
  return null;
}

/** PNG: eXIf- und Text-Chunks verwerfen. */
function png(b: Buffer): Buffer | null {
  const weg = new Set(["eXIf", "tEXt", "iTXt", "zTXt", "tIME"]);
  const teile: Buffer[] = [b.subarray(0, 8)];
  let i = 8;
  while (i + 12 <= b.length) {
    const laenge = b.readUInt32BE(i);
    const typ = b.toString("latin1", i + 4, i + 8);
    const ende = i + 12 + laenge;
    if (ende > b.length) return null;
    if (!weg.has(typ)) teile.push(b.subarray(i, ende));
    i = ende;
    if (typ === "IEND") break;
  }
  return Buffer.concat(teile);
}

/** Foto ohne Metadaten – oder null, wenn die Datei nicht sauber gelesen werden kann (dann ablehnen). */
export function ohneMetadaten(daten: Buffer, typ: string): Buffer | null {
  if (typ === "image/jpeg") return jpeg(daten);
  if (typ === "image/png") return png(daten);
  return null;
}

/** Enthält das JPEG noch EXIF-Daten? (für Tests) */
export function hatExif(b: Buffer): boolean {
  return b.includes(Buffer.from("Exif\0\0", "latin1"));
}
