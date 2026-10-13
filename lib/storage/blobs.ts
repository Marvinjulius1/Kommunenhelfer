/**
 * Ablage hochgeladener Dokumente – ausschließlich verschlüsselt (AES-256-GCM).
 * Für den Produktivbetrieb mit mehreren Instanzen durch einen S3-kompatiblen
 * Objektspeicher in der EU ersetzen (gleiche Schnittstelle).
 */
import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";
import { decryptBuffer, encryptBuffer } from "@/lib/crypto";
import { DATA_DIR } from "./store";

const DIR = path.join(DATA_DIR, "blobs");

function datei(id: string) {
  if (!/^[A-Za-z0-9_-]{16,64}$/.test(id)) throw new Error("Ungültige Dokument-ID");
  return path.join(DIR, `${id}.bin`);
}

export const blobs = {
  async put(id: string, daten: Buffer) {
    await fs.mkdir(DIR, { recursive: true, mode: 0o700 });
    await fs.writeFile(datei(id), encryptBuffer(daten), { mode: 0o600 });
  },
  async get(id: string): Promise<Buffer | null> {
    try {
      return decryptBuffer(await fs.readFile(datei(id)));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return null;
      throw e;
    }
  },
  async delete(id: string) {
    await fs.rm(datei(id), { force: true });
  },
};
