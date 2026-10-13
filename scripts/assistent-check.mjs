/**
 * Prüft das Verhalten des Assistenten gegen eine laufende Instanz.
 *   npm run dev   (in einem zweiten Terminal)
 *   node scripts/assistent-check.mjs [http://localhost:3000] [gemeinde]
 *
 * Erwartung pro Fall: welche Leistung / Rückfrage / Antwortart herauskommen soll.
 * Ideal, um nach dem Anpassen der Wissensbasis einer neuen Gemeinde zu testen.
 */
const base = process.argv[2] || "http://localhost:3000";
const gemeinde = process.argv[3] || "musterstadt";

const faelle = [
  // [Anfrage, Erwartung, Kontext-Leistung?]
  ["Ich möchte meinen Hund anmelden", { leistung: "hund-anmelden" }],
  ["Ich habe einen neuen Hund", { leistung: "hund-anmelden" }],
  ["Hund", { optionen: ["hund-anmelden", "hund-abmelden"] }],
  ["Mein Hund ist gestorben", { leistung: "hund-abmelden" }],
  ["Ich ziehe um", { optionen: ["wohnsitz-anmelden", "wohnsitz-abmelden"] }],
  ["Ich bin umgezogen und muss mich ummelden", { leistung: "wohnsitz-anmelden" }],
  ["Ich brauche einen neuen Ausweis", { optionen: ["personalausweis", "reisepass"] }],
  ["Ich habe geheiratet und möchte meinen Namen ändern", { leistung: "namensaenderung" }],
  ["Wie hoch ist die Hundesteuer?", { text: "96 Euro" }],
  ["Was kostet ein Personalausweis?", { text: "46,00" }],
  ["Was kostet das?", { text: "70,00" }, "reisepass"],
  ["Welche Unterlagen brauche ich?", { text: "Hundehaftpflicht" }, "hund-anmelden"],
  ["Muss ich für meinen Blindenhund Steuern zahlen?", { text: "befreit" }],
  ["Ich habe meine Hundemarke verloren", { text: "Ersatzmarke" }],
  ["Kann ich mit Kreditkarte zahlen?", { text: "Girocard" }],
  ["Wo kann ich parken?", { text: "Marktplatz" }],
  ["Wann hat das Rathaus geöffnet?", { text: "Dienstag" }],
  ["Grünschnitt entsorgen", { text: "Wertstoffhof" }],
  ["Hallo", { text: "Guten Tag" }],
  // Ehrlich bleiben: keine erfundenen Auskünfte
  ["Wie beantrage ich Wohngeld?", { unsicher: true }],
  ["Darf mein Nachbar seinen Hund im Garten bellen lassen?", { unsicher: true }],
  ["Wie hoch ist die Grundsteuer für mein Haus?", { unsicher: true }],
];

let ok = 0;
for (const [anfrage, erw, kontext] of faelle) {
  const res = await fetch(`${base}/api/assistent?gemeinde=${gemeinde}`, {
    method: "POST",
    headers: { "content-type": "application/json", cookie: `gemeinde=${gemeinde}` },
    body: JSON.stringify({ nachrichten: [{ rolle: "buerger", text: anfrage }], kontextLeistungId: kontext }),
  });
  const a = await res.json();
  const fehler = [];
  if (erw.leistung && a.leistungId !== erw.leistung) fehler.push(`Leistung ${a.leistungId} ≠ ${erw.leistung}`);
  if (erw.optionen && JSON.stringify((a.optionen ?? []).map((o) => o.leistungId)) !== JSON.stringify(erw.optionen))
    fehler.push(`Optionen ${JSON.stringify(a.optionen?.map((o) => o.leistungId))}`);
  if (erw.text && !a.text.includes(erw.text)) fehler.push(`Text enthält nicht „${erw.text}“: ${a.text.slice(0, 80).replace(/\n/g, " ")}`);
  if (erw.unsicher && a.sicher !== false) fehler.push(`sollte „weiß ich nicht“ sein: ${a.text.slice(0, 80).replace(/\n/g, " ")}`);
  if (fehler.length) console.log(`✗ ${anfrage}\n    ${fehler.join("\n    ")}`);
  else ok++;
}
console.log(`\n${ok}/${faelle.length} Fälle bestanden.`);
process.exit(ok === faelle.length ? 0 : 1);
