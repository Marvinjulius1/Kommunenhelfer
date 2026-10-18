/** Web-Mercator-Rechnung für die Stadtkarte (gemeinsam für Browser und Server). */

export const KACHEL = 256;

export function zuPixel(lat: number, lng: number, z: number) {
  const n = KACHEL * 2 ** z;
  const s = Math.sin((lat * Math.PI) / 180);
  return { x: ((lng + 180) / 360) * n, y: (0.5 - Math.log((1 + s) / (1 - s)) / (4 * Math.PI)) * n };
}

export function zuGrad(x: number, y: number, z: number) {
  const n = KACHEL * 2 ** z;
  const lng = (x / n) * 360 - 180;
  const lat = (Math.atan(Math.sinh(Math.PI * (1 - (2 * y) / n))) * 180) / Math.PI;
  return { lat, lng };
}

/** Nur Kacheln im Umkreis von etwa 15 km um die Kartenmitte, Zoom 11–18. */
export function kachelErlaubt(mitte: [number, number], z: number, x: number, y: number) {
  if (![z, x, y].every(Number.isInteger) || z < 11 || z > 18) return false;
  const m = zuPixel(mitte[0], mitte[1], z);
  const radius = 15_000 / ((156543.03 * Math.cos((mitte[0] * Math.PI) / 180)) / 2 ** z); // Meter → Pixel
  const max = 2 ** z;
  return x >= 0 && y >= 0 && x < max && y < max && Math.abs((x + 0.5) * KACHEL - m.x) <= radius + KACHEL && Math.abs((y + 0.5) * KACHEL - m.y) <= radius + KACHEL;
}
