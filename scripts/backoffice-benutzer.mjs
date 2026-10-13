/**
 * Erzeugt einen Eintrag für BACKOFFICE_USERS.
 *   npm run backoffice:benutzer -- <name> <gemeinde> <ämter, kommagetrennt oder *>
 * Das Passwort wird interaktiv abgefragt und nur als scrypt-Hash ausgegeben.
 */
import { randomBytes, scryptSync } from "node:crypto";
import { createInterface } from "node:readline";

const [name, gemeinde, aemter = "*"] = process.argv.slice(2);
if (!name || !gemeinde) {
  console.error("Aufruf: npm run backoffice:benutzer -- <name> <gemeinde> <ämter|*>");
  process.exit(1);
}
const rl = createInterface({ input: process.stdin, output: process.stdout });
rl.question("Passwort (mind. 12 Zeichen): ", (pw) => {
  rl.close();
  if (pw.length < 12) {
    console.error("Das Passwort ist zu kurz.");
    process.exit(1);
  }
  const salt = randomBytes(16);
  const hash = scryptSync(pw, salt, 32, { N: 16384, r: 8, p: 1 });
  const eintrag = { name, gemeinde, aemter: aemter.split(",").map((s) => s.trim()), hash: `scrypt$16384$8$1$${salt.toString("base64")}$${hash.toString("base64")}` };
  console.log("\nIn BACKOFFICE_USERS (JSON-Array) eintragen:\n");
  console.log(JSON.stringify(eintrag));
});
