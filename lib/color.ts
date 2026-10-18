/** Farb-Hilfsfunktionen für WCAG-Kontrastprüfung und Theme-Variablen. */

export function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map((c) => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function channel(c: number): number {
  const s = c / 255;
  return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
}

export function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

export function contrast(a: string, b: string): number {
  const [l1, l2] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (l1 + 0.05) / (l2 + 0.05);
}

/** Lesbare Textfarbe (weiß oder fast schwarz) auf einer Akzentfläche. */
export function onColor(hex: string): string {
  return contrast(hex, "#ffffff") >= contrast(hex, "#111111") ? "#ffffff" : "#111111";
}

export function rgbTriplet(hex: string): string {
  return hexToRgb(hex).join(" ");
}

function mische(hex: string, ziel: [number, number, number], anteil: number) {
  const [r, g, b] = hexToRgb(hex);
  const m = (a: number, z: number) => Math.round(a + (z - a) * anteil);
  return "#" + [m(r, ziel[0]), m(g, ziel[1]), m(b, ziel[2])].map((x) => x.toString(16).padStart(2, "0")).join("");
}

/** Dunkelt eine Farbe ab, bis sie auf hellem Grund 4.5:1 erreicht (WCAG AA). */
export function barrierefreiHell(hex: string): string {
  let f = hex;
  for (let i = 1; i <= 20 && Math.min(contrast(f, "#ffffff"), contrast(f, "#f5f7f9")) < 4.5; i++) f = mische(hex, [0, 0, 0], i * 0.05);
  return f;
}

/** Hellt eine Farbe auf, bis sie auf dunklem Grund und dunklen Karten 4.5:1 erreicht. */
export function barrierefreiDunkel(hex: string): string {
  let f = hex;
  for (let i = 1; i <= 20 && Math.min(contrast(f, "#07090b"), contrast(f, "#12161a")) < 4.5; i++) f = mische(hex, [255, 255, 255], i * 0.05);
  return f;
}
