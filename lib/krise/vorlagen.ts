/** Vorlagen für den Krisenmodus – Texte vor dem Aktivieren anpassen. Gemeinsam für Browser und Server. */

export type KrisenArt = "hochwasser" | "stromausfall" | "unwetter" | "trinkwasser" | "evakuierung" | "sonstiges";

export interface Lage {
  art: KrisenArt;
  stufe: "warnung" | "gefahr";
  titel: string;
  text: string;
  tipps: string[];
  hotline?: string;
  notrufe: { label: string; nummer: string }[];
  anlaufstellen: { name: string; adresse?: string; info?: string }[];
  meldungen: { id: string; zeit: string; text: string }[];
}

export const VORLAGEN: Record<KrisenArt, { label: string; stufe: Lage["stufe"]; titel: string; text: string; tipps: string[] }> = {
  hochwasser: {
    label: "Hochwasser",
    stufe: "gefahr",
    titel: "Hochwasser",
    text: "In Teilen der {gemeinde} besteht Hochwassergefahr. Bitte meiden Sie Uferbereiche und folgen Sie den Anweisungen der Einsatzkräfte.",
    tipps: [
      "Betreten Sie keine überfluteten Keller oder Tiefgaragen – Lebensgefahr durch Strom und Wasserdruck.",
      "Fahren oder gehen Sie nicht durch überflutete Straßen und Unterführungen.",
      "Schalten Sie in gefährdeten Räumen den Strom ab, wenn das gefahrlos möglich ist.",
      "Bringen Sie wichtige Dokumente, Medikamente und Wertsachen in obere Stockwerke.",
      "Helfen Sie älteren Nachbarinnen und Nachbarn – aber bringen Sie sich nicht selbst in Gefahr.",
    ],
  },
  stromausfall: {
    label: "Stromausfall",
    stufe: "warnung",
    titel: "Stromausfall",
    text: "In der {gemeinde} ist der Strom großflächig ausgefallen. Der Netzbetreiber arbeitet an der Behebung.",
    tipps: [
      "Kann das Telefon den Notruf nicht erreichen, gehen Sie zur nächsten Anlaufstelle (unten).",
      "Halten Sie Kühlschrank und Gefriertruhe geschlossen – so bleiben Lebensmittel länger kühl.",
      "Nutzen Sie Taschenlampen statt Kerzen; Kerzen nie unbeaufsichtigt lassen.",
      "Ein batteriebetriebenes Radio oder Autoradio informiert Sie über die Lage.",
      "Schalten Sie empfindliche Geräte aus, damit sie bei der Rückkehr des Stroms nicht beschädigt werden.",
    ],
  },
  unwetter: {
    label: "Unwetter / Sturm",
    stufe: "warnung",
    titel: "Unwetter",
    text: "Für die {gemeinde} gilt eine Unwetterwarnung. Bitte bleiben Sie möglichst in Gebäuden.",
    tipps: [
      "Bleiben Sie in Gebäuden, schließen Sie Fenster und Türen.",
      "Halten Sie Abstand zu Bäumen, Gerüsten, Hochspannungsleitungen und Gewässern.",
      "Meiden Sie Wälder und Parks, auch nach dem Unwetter (herabfallende Äste).",
      "Sichern Sie lose Gegenstände auf Balkon und im Garten nur, solange es gefahrlos geht.",
    ],
  },
  trinkwasser: {
    label: "Trinkwasser (Abkochgebot)",
    stufe: "warnung",
    titel: "Abkochgebot für Trinkwasser",
    text: "In der {gemeinde} ist das Leitungswasser derzeit nicht ohne Abkochen als Trinkwasser geeignet. Das Gesundheitsamt ist informiert.",
    tipps: [
      "Wasser zum Trinken, Zähneputzen, Zubereiten von Speisen und für Babynahrung einmal sprudelnd aufkochen und langsam abkühlen lassen (mindestens 10 Minuten).",
      "Alternativ abgefülltes Wasser verwenden.",
      "Duschen, Waschen und Toilettenspülung sind weiter möglich.",
      "Geschirr bei mindestens 60 °C in der Spülmaschine reinigen.",
    ],
  },
  evakuierung: {
    label: "Evakuierung (z. B. Bombenfund)",
    stufe: "gefahr",
    titel: "Evakuierung",
    text: "Ein Bereich der {gemeinde} wird geräumt. Bitte verlassen Sie das Sperrgebiet bis zur angegebenen Uhrzeit und folgen Sie den Anweisungen der Einsatzkräfte.",
    tipps: [
      "Nehmen Sie Ausweis, Medikamente, Ladegerät und bei Bedarf Verpflegung für einige Stunden mit.",
      "Schließen Sie Fenster und Türen, schalten Sie Herd und elektrische Geräte aus.",
      "Sagen Sie Nachbarinnen und Nachbarn Bescheid, besonders älteren oder kranken Menschen.",
      "Wer nicht selbst gehen kann, meldet sich bei der Hotline – Sie werden abgeholt.",
      "Kehren Sie erst zurück, wenn die Freigabe hier veröffentlicht ist.",
    ],
  },
  sonstiges: { label: "Sonstige Lage", stufe: "warnung", titel: "Besondere Lage", text: "", tipps: [] },
};

export const KRISEN_ARTEN = Object.keys(VORLAGEN) as KrisenArt[];
