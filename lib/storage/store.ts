/**
 * Speicher-Abstraktion.
 *
 * MVP: JSON-Dateien im Verzeichnis DATA_DIR (Standard: ./.data).
 * Personenbezogene Inhalte liegen ausschließlich verschlüsselt vor
 * (siehe lib/crypto.ts), Metadaten (Status, Datum) im Klartext.
 *
 * Für den Produktivbetrieb mehrerer Instanzen dieses Interface durch
 * eine Datenbank-Implementierung (z. B. PostgreSQL in einem EU-Rechenzentrum)
 * ersetzen – der Rest der Anwendung bleibt unverändert.
 */
import "server-only";
import { promises as fs } from "node:fs";
import path from "node:path";

export interface StoredRecord {
  id: string;
  tenant: string;
  erstelltAm: string;
  /** Löschkonzept: Nach diesem Zeitpunkt wird der Datensatz automatisch entfernt. */
  loeschenAm: string;
  [key: string]: unknown;
}

export interface Store {
  put<T extends StoredRecord>(collection: string, record: T): Promise<void>;
  get<T extends StoredRecord>(collection: string, id: string): Promise<T | undefined>;
  list<T extends StoredRecord>(collection: string, filter?: (r: T) => boolean): Promise<T[]>;
  delete(collection: string, id: string): Promise<void>;
  /** Entfernt abgelaufene Datensätze. Gibt die Anzahl gelöschter Einträge zurück. */
  purgeExpired(collection: string): Promise<number>;
}

const DATA_DIR = process.env.DATA_DIR || path.join(process.cwd(), ".data");

/** Einfache Sperre, damit gleichzeitige Schreibvorgänge sich nicht überschreiben. */
const locks = new Map<string, Promise<unknown>>();
async function withLock<T>(name: string, fn: () => Promise<T>): Promise<T> {
  const prev = locks.get(name) ?? Promise.resolve();
  const next = prev.then(fn, fn);
  locks.set(name, next.catch(() => undefined));
  return next;
}

class FileStore implements Store {
  private file(collection: string) {
    if (!/^[a-z0-9-]+$/.test(collection)) throw new Error("Ungültiger Collection-Name");
    return path.join(DATA_DIR, `${collection}.json`);
  }

  private async read<T>(collection: string): Promise<Record<string, T>> {
    try {
      return JSON.parse(await fs.readFile(this.file(collection), "utf8"));
    } catch (e) {
      if ((e as NodeJS.ErrnoException).code === "ENOENT") return {};
      throw e;
    }
  }

  private async write(collection: string, data: Record<string, unknown>) {
    await fs.mkdir(DATA_DIR, { recursive: true, mode: 0o700 });
    const tmp = this.file(collection) + ".tmp";
    await fs.writeFile(tmp, JSON.stringify(data), { mode: 0o600 });
    await fs.rename(tmp, this.file(collection));
  }

  async put<T extends StoredRecord>(collection: string, record: T) {
    await withLock(collection, async () => {
      const all = await this.read<T>(collection);
      all[record.id] = record;
      await this.write(collection, all);
    });
  }

  async get<T extends StoredRecord>(collection: string, id: string) {
    const all = await this.read<T>(collection);
    const r = all[id];
    if (r && new Date(r.loeschenAm) < new Date()) return undefined;
    return r;
  }

  async list<T extends StoredRecord>(collection: string, filter?: (r: T) => boolean) {
    const now = new Date();
    const all = Object.values(await this.read<T>(collection)).filter((r) => new Date(r.loeschenAm) >= now);
    return filter ? all.filter(filter) : all;
  }

  async delete(collection: string, id: string) {
    await withLock(collection, async () => {
      const all = await this.read(collection);
      delete all[id];
      await this.write(collection, all);
    });
  }

  async purgeExpired(collection: string) {
    return withLock(collection, async () => {
      const all = await this.read<StoredRecord>(collection);
      const now = new Date();
      let n = 0;
      for (const [id, r] of Object.entries(all)) {
        if (new Date(r.loeschenAm) < now) {
          delete all[id];
          n++;
        }
      }
      if (n) await this.write(collection, all);
      return n;
    });
  }
}

let instance: Store | null = null;
export function store(): Store {
  if (!instance) instance = new FileStore();
  return instance;
}

export function inTagen(tage: number, ab = new Date()): string {
  return new Date(ab.getTime() + tage * 86_400_000).toISOString();
}
