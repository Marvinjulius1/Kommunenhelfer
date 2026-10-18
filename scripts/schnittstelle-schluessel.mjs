/**
 * Erzeugt einen Schlüssel für ein Fachverfahren.
 *   npm run schnittstelle:schluessel -- "<Name>" <gemeinde> <ämter, kommagetrennt oder *>
 * Der Schlüssel wird EINMAL angezeigt; gespeichert wird nur sein Hash.
 */
import { createHash, randomBytes } from "node:crypto";

const [name, gemeinde, aemter = "*"] = process.argv.slice(2);
if (!name || !gemeinde) {
  console.error('Aufruf: npm run schnittstelle:schluessel -- "<Name>" <gemeinde> <ämter|*>');
  process.exit(1);
}
const schluessel = randomBytes(32).toString("base64url");
const eintrag = { name, gemeinde, aemter: aemter.split(",").map((s) => s.trim()), hash: createHash("sha256").update(schluessel).digest("hex") };
console.log("\nSchlüssel für das Fachverfahren (sicher übergeben, wird nicht gespeichert):\n");
console.log(schluessel);
console.log("\nIn SCHNITTSTELLEN (JSON-Array) eintragen:\n");
console.log(JSON.stringify(eintrag));
