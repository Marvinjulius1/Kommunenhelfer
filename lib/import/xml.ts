/**
 * Kleiner, sicherer XML-Leser für Austauschformate (XZuFi). Kein DOCTYPE, keine
 * Entitäten-Definitionen (XXE, „Billion Laughs“), keine externen Verweise – nur
 * Elemente, Attribute, Text und CDATA. Namensräume werden ignoriert (lokaler Name).
 */

export interface XmlKnoten {
  name: string;
  attr: Record<string, string>;
  kinder: XmlKnoten[];
  text: string;
}

export class XmlFehler extends Error {}

const ENT: Record<string, string> = { lt: "<", gt: ">", amp: "&", quot: '"', apos: "'" };

export function entschluessele(s: string): string {
  return s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) => {
    if (e[0] === "#") {
      const n = e[1] === "x" || e[1] === "X" ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10);
      return n > 0 && n < 0x110000 ? String.fromCodePoint(n) : "";
    }
    return ENT[e.toLowerCase()] ?? m;
  });
}

const lokal = (n: string) => n.slice(n.indexOf(":") + 1);

/** Text bleibt als eigener Knoten („#text“) in der Reihenfolge erhalten – wichtig für eingebettetes HTML. */
function textDazu(k: XmlKnoten, t: string) {
  if (!t) return;
  k.text += t;
  k.kinder.push({ name: "#text", attr: {}, kinder: [], text: t });
}

export function leseXml(xml: string, maxBytes = 8_000_000): XmlKnoten {
  if (xml.length > maxBytes) throw new XmlFehler("Datei zu groß");
  if (/<!DOCTYPE|<!ENTITY/i.test(xml)) throw new XmlFehler("DOCTYPE und Entitäten sind nicht erlaubt");
  const wurzel: XmlKnoten = { name: "#dokument", attr: {}, kinder: [], text: "" };
  const stapel: XmlKnoten[] = [wurzel];
  let i = 0;
  let knoten = 0;
  while (i < xml.length) {
    const lt = xml.indexOf("<", i);
    const oben = stapel[stapel.length - 1];
    if (lt === -1) {
      textDazu(oben, entschluessele(xml.slice(i)));
      break;
    }
    if (lt > i) textDazu(oben, entschluessele(xml.slice(i, lt)));
    if (xml.startsWith("<!--", lt)) {
      const e = xml.indexOf("-->", lt + 4);
      if (e === -1) throw new XmlFehler("Kommentar nicht geschlossen");
      i = e + 3;
    } else if (xml.startsWith("<![CDATA[", lt)) {
      const e = xml.indexOf("]]>", lt + 9);
      if (e === -1) throw new XmlFehler("CDATA nicht geschlossen");
      textDazu(oben, xml.slice(lt + 9, e));
      i = e + 3;
    } else if (xml.startsWith("<?", lt)) {
      const e = xml.indexOf("?>", lt + 2);
      if (e === -1) throw new XmlFehler("Verarbeitungsanweisung nicht geschlossen");
      i = e + 2;
    } else if (xml.startsWith("</", lt)) {
      const e = xml.indexOf(">", lt);
      if (e === -1) throw new XmlFehler("Tag nicht geschlossen");
      const name = lokal(xml.slice(lt + 2, e).trim());
      const k = stapel.pop();
      if (!k || k === wurzel || k.name !== name) throw new XmlFehler(`Unerwartetes </${name}>`);
      i = e + 1;
    } else {
      // Ende des Tags finden – Attributwerte dürfen ">" enthalten
      let e = lt + 1;
      let quote = "";
      for (; e < xml.length; e++) {
        const c = xml[e];
        if (quote) {
          if (c === quote) quote = "";
        } else if (c === '"' || c === "'") quote = c;
        else if (c === ">") break;
      }
      if (e >= xml.length) throw new XmlFehler("Tag nicht geschlossen");
      let inhalt = xml.slice(lt + 1, e);
      const leer = inhalt.endsWith("/");
      if (leer) inhalt = inhalt.slice(0, -1);
      const m = inhalt.match(/^\s*([^\s/>]+)/);
      if (!m) throw new XmlFehler("Ungültiges Tag");
      const attr: Record<string, string> = {};
      for (const a of inhalt.slice(m[0].length).matchAll(/([^\s=]+)\s*=\s*("([^"]*)"|'([^']*)')/g)) attr[lokal(a[1])] = entschluessele(a[3] ?? a[4] ?? "");
      if (++knoten > 200_000) throw new XmlFehler("Zu viele Elemente");
      const k: XmlKnoten = { name: lokal(m[1]), attr, kinder: [], text: "" };
      oben.kinder.push(k);
      if (!leer) {
        if (stapel.length > 200) throw new XmlFehler("Zu tief verschachtelt");
        stapel.push(k);
      }
      i = e + 1;
    }
  }
  if (stapel.length !== 1) throw new XmlFehler(`<${stapel[stapel.length - 1].name}> nicht geschlossen`);
  return wurzel;
}

/** Alle Nachfahren mit diesem lokalen Namen (ohne Groß-/Kleinschreibung). */
export function alle(k: XmlKnoten, name: string, liste: XmlKnoten[] = []): XmlKnoten[] {
  for (const c of k.kinder) {
    if (c.name.toLowerCase() === name.toLowerCase()) liste.push(c);
    alle(c, name, liste);
  }
  return liste;
}

export const erstes = (k: XmlKnoten, name: string) => alle(k, name)[0];

/** Text eines Knotens samt Nachfahren, in Dokumentreihenfolge. */
export function textVon(k: XmlKnoten | undefined): string {
  if (!k) return "";
  if (k.name === "#text") return k.text;
  return k.kinder.map(textVon).join("").replace(/\s+/g, " ").trim();
}

/** Inhalt als einfaches HTML (für Texte, die als XHTML eingebettet sind). */
export function htmlVon(k: XmlKnoten): string {
  return k.kinder.map((c) => (c.name === "#text" ? c.text : `<${c.name}>${htmlVon(c)}</${c.name}>`)).join("");
}
