import { describe, expect, it } from "vitest";
import musterstadt from "@/tenants/musterstadt/gemeinde.config";
import { abfuhren, ics, sucheStrasse } from "@/lib/abfall/kalender";
import { feiertage, istFeiertag, ostersonntag } from "@/lib/feiertage";
import { hatExif, ohneMetadaten } from "@/lib/maengel/exif";
import { abstand } from "@/lib/maengel/service";
import { schritte } from "@/lib/lebenslagen/service";

const cfg = musterstadt.abfall!;
const bezirk1 = cfg.bezirke[0];

describe("Feiertage", () => {
  it("berechnet Ostern korrekt", () => {
    expect(ostersonntag(2024)).toBe("2024-03-31");
    expect(ostersonntag(2025)).toBe("2025-04-20");
    expect(ostersonntag(2026)).toBe("2026-04-05");
    expect(ostersonntag(2027)).toBe("2027-03-28");
  });
  it("kennt bewegliche und feste Feiertage", () => {
    expect(istFeiertag("2026-04-03")).toBe("Karfreitag");
    expect(istFeiertag("2026-05-14")).toBe("Christi Himmelfahrt");
    expect(istFeiertag("2026-05-25")).toBe("Pfingstmontag");
    expect(istFeiertag("2026-10-03")).toBe("Tag der Deutschen Einheit");
    expect(istFeiertag("2026-10-05")).toBeUndefined();
    expect(feiertage(2026).size).toBe(9);
  });
});

describe("Abfallkalender", () => {
  it("liefert Termine im Rhythmus", () => {
    const rest = abfuhren(cfg, bezirk1, "2026-01-01", "2026-02-28").filter((a) => a.art === "rest");
    expect(rest.map((a) => a.datum)).toEqual(["2026-01-05", "2026-01-19", "2026-02-02", "2026-02-16"]);
  });
  it("verschiebt Abfuhren an Feiertagen auf den nächsten Werktag", () => {
    // Ostermontag 2026-04-06: Bioabfall Bezirk 1 (Montag, 14-tägig ab 12.01.)
    const l = abfuhren(cfg, bezirk1, "2026-04-01", "2026-04-10").filter((a) => a.art === "bio");
    expect(l).toEqual([{ datum: "2026-04-07", art: "bio", verschobenVon: "2026-04-06", feiertag: "Ostermontag" }]);
  });
  it("findet Straßen tolerant", () => {
    expect(sucheStrasse(cfg, "garten")[0]).toEqual({ strasse: "Gartenweg", bezirkId: "bezirk-2" });
    expect(sucheStrasse(cfg, "Hauptstr. 12")[0].strasse).toBe("Hauptstraße");
    expect(sucheStrasse(cfg, "x")).toEqual([]);
  });
  it("erzeugt gültiges iCalendar mit gefalteten Zeilen", () => {
    const text = ics(musterstadt, bezirk1, abfuhren(cfg, bezirk1, "2026-01-01", "2026-01-31"), (a) => a);
    expect(text.startsWith("BEGIN:VCALENDAR\r\n")).toBe(true);
    expect(text.trimEnd().endsWith("END:VCALENDAR")).toBe(true);
    expect(text).toContain("DTSTART;VALUE=DATE:20260105");
    for (const z of text.split("\r\n")) expect(Buffer.byteLength(z)).toBeLessThanOrEqual(75);
  });
});

describe("Mängelmelder", () => {
  it("entfernt EXIF/GPS aus JPEG und lässt Bilddaten unverändert", () => {
    const exif = Buffer.concat([Buffer.from([0xff, 0xe1, 0x00, 0x11]), Buffer.from("Exif\0\0GPS-DATEN", "latin1")]);
    const app0 = Buffer.from([0xff, 0xe0, 0x00, 0x04, 0x4a, 0x46]);
    const scan = Buffer.from([0xff, 0xda, 0x00, 0x02, 1, 2, 3, 0xff, 0xd9]);
    const jpg = Buffer.concat([Buffer.from([0xff, 0xd8]), app0, exif, scan]);
    expect(hatExif(jpg)).toBe(true);
    const sauber = ohneMetadaten(jpg, "image/jpeg")!;
    expect(hatExif(sauber)).toBe(false);
    expect(sauber.toString("latin1")).not.toContain("GPS");
    expect(ohneMetadaten(Buffer.from([0xff, 0xd8, 0x00, 0x01, 0x02, 0x03]), "image/jpeg")).toBeNull();
    expect(sauber).toEqual(Buffer.concat([Buffer.from([0xff, 0xd8]), app0, scan]));
  });
  it("misst Entfernungen", () => {
    const a = { lat: 52.52, lng: 13.405 };
    expect(Math.round(abstand(a, { lat: 52.5209, lng: 13.405 }))).toBe(100);
  });
});

describe("Lebenslagen", () => {
  it("berechnet Fristen ab Stichtag und verlinkt Leistungen", () => {
    const umzug = musterstadt.lebenslagen!.find((l) => l.id === "umzug")!;
    const s = schritte(musterstadt, umzug, "2026-11-01", ["geber"]);
    const anmelden = s.find((x) => x.id === "anmelden")!;
    expect(anmelden.frist).toBe("2026-11-15");
    expect(anmelden.href).toBe("/termine?leistung=wohnsitz-anmelden");
    expect(s.find((x) => x.id === "geber")!.erledigt).toBe(true);
    expect(s.find((x) => x.id === "abfall")!.href).toBe("/abfall");
  });
});
