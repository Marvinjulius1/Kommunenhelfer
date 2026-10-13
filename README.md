# Bürgerportal – White-Label für Gemeinden

Ein ruhiges, barrierefreies Online-Rathaus. Bürgerinnen und Bürger beschreiben ihr Anliegen in **einem einzigen Eingabefeld**, ein digitaler Assistent führt sie Schritt für Schritt ans Ziel: Online-Antrag, Terminbuchung oder die richtige Ansprechperson.

Eine Codebasis, beliebig viele Gemeinden. Jede Gemeinde wird über **eine Konfigurationsdatei** und einen Ordner mit Wissenstexten beschrieben.

```
Startseite → „Ich möchte meinen Hund anmelden“ → Unterlagen, Gebühren, Ablauf → Online-Antrag → Bestätigung → Meine Anliegen
```

---

## Inhalt

1. [Schnellstart](#schnellstart)
2. [Architektur](#architektur)
3. [Neue Gemeinde in 30 Minuten einrichten](#neue-gemeinde-in-30-minuten-einrichten)
4. [Der Assistent](#der-assistent)
5. [Betrieb, Multi-Tenant und Hosting](#betrieb-multi-tenant-und-hosting)
6. [PWA und native Apps (Capacitor)](#pwa-und-native-apps-capacitor)
7. [Barrierefreiheit](#barrierefreiheit-wcag-21-aa--bitv-20)
8. [Datenschutz und Sicherheit](#datenschutz-und-sicherheit)
9. [Schnittstellen: BundID, FIT-Connect, XÖV](#schnittstellen-bundid-fit-connect-xöv)
10. [Roadmap](#roadmap)

---

## Schnellstart

Voraussetzung: Node.js 20 oder neuer.

```bash
npm install
cp .env.example .env.local
npm run dev
```

- http://localhost:3000 – Stadt Musterstadt (Beispiel)
- http://localhost:3000/?gemeinde=beispielhausen – zweite Beispiel-Gemeinde (wird per Cookie gemerkt)
- http://beispielhausen.localhost:3000 – dasselbe per Subdomain (Chrome, Firefox)

Nützliche Befehle:

| Befehl | Zweck |
| --- | --- |
| `npm run tenant:check` | prüft alle Gemeinde-Konfigurationen (Kontraste, Verweise, Dateien) |
| `npm run assistent:check` | prüft das Verhalten des Assistenten gegen den laufenden Dev-Server |
| `npm run typecheck` | TypeScript-Prüfung |
| `npm run build && npm start` | Produktions-Build |

> Alle Gebühren, Adressen und Zeiten der Beispiel-Gemeinden sind **frei erfunden**.

---

## Architektur

**Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Framer Motion · Zod**

```
├── config/
│   ├── types.ts                 # Schema der Gemeinde-Konfiguration (das "Vertragsformat")
│   └── define.ts                # defineGemeinde() – Typprüfung & Autovervollständigung
├── tenants/
│   ├── index.ts                 # Register aller Gemeinden (Slug → Konfiguration)
│   ├── musterstadt/
│   │   ├── gemeinde.config.ts   # ← DIE Datei, die pro Gemeinde angepasst wird
│   │   └── wissen/*.md          # Wissensbasis (Satzungen, FAQ, Zuständigkeiten …)
│   └── beispielhausen/ …
├── public/tenants/<slug>/       # Wappen/Logo (SVG empfohlen)
├── app/
│   ├── page.tsx                 # Startseite (Eingabefeld + Gespräch)
│   ├── antrag/[leistung]/       # Geführte Online-Anträge
│   ├── termine/                 # Terminbuchung
│   ├── meine-anliegen/          # Statusübersicht
│   ├── hilfe, kontakt, leistungen, datenschutz, barrierefreiheit, offline
│   ├── manifest.ts              # PWA-Manifest pro Gemeinde
│   ├── pwa-icon/[size]/         # App-Icons, erzeugt aus dem Wappen
│   └── api/
│       ├── assistent/           # POST: Gesprächsantwort
│       ├── antrag/              # POST: Antrag einreichen
│       ├── termine/ & slots/    # GET freie Termine, POST buchen, DELETE absagen
│       └── anliegen/            # POST: Statusabfrage
├── lib/
│   ├── assistant/               # Engine, Wissensbasis-Suche, Provider, Pseudonymisierung
│   ├── flows/validate.ts        # Formularvalidierung (Browser UND Server, gleiche Regeln)
│   ├── booking/                 # Slot-Berechnung (Europe/Berlin, Feiertage), Buchung
│   ├── integrations/            # Schnittstellen: BundID, FIT-Connect, Fachverfahren
│   ├── storage/store.ts         # Speicher-Abstraktion (MVP: verschlüsselte JSON-Dateien)
│   ├── crypto.ts                # AES-256-GCM, Token-Hashes, Vorgangsnummern
│   ├── rate-limit.ts, mail.ts, i18n.ts, tenant.ts
├── components/                  # UI: Glas-Komponenten, Startseite, Formulare, Kalender
├── middleware.ts                # Mandant per Subdomain + CSP (Nonce) + Sicherheits-Header
├── public/sw.js                 # Service Worker
└── scripts/                     # tenant:check, assistent:check
```

### Wichtige Entscheidungen

- **Fakten kommen aus der Konfiguration, nie vom Sprachmodell.** Unterlagen, Gebühren, Fristen und Abläufe werden im Browser direkt aus `gemeinde.config.ts` gerendert. Das Sprachmodell (optional) formuliert nur den erklärenden Text.
- **Funktioniert ohne KI-Anbieter.** Der Standard-Provider `local` beantwortet Anliegen regelbasiert aus Konfiguration und Wissensbasis (BM25-Suche mit Synonymen). Kein Datenabfluss, keine Kosten – ideal für den Start und für datenschutzsensible Kommunen.
- **Ein Formular-Schema für Browser und Server.** Felder werden in der Konfiguration deklariert; dieselbe Validierung läuft clientseitig (sofortiges Feedback) und serverseitig (verbindlich).
- **Keine Konten im MVP.** „Meine Anliegen“ funktioniert mit Vorgangsnummer + geheimem Zugangscode, der nur auf dem Gerät liegt. Der Server kennt nur den Hash. Später durch BundID ersetzbar.
- **Server-Rendering pro Mandant.** Jede Seite kennt ihre Gemeinde über einen Header, den die Middleware aus der Subdomain setzt.

---

## Neue Gemeinde in 30 Minuten einrichten

### Minute 0–5: Ordner anlegen

```bash
cp -r tenants/musterstadt tenants/neustadt
mkdir -p public/tenants/neustadt
```

Wappen als SVG (oder PNG, mind. 512 px hoch) nach `public/tenants/neustadt/wappen.svg` legen. Das Wappen muss die Gemeinde für die Nutzung freigeben.

In `tenants/index.ts` eintragen:

```ts
import neustadt from "./neustadt/gemeinde.config";

export const tenants = { musterstadt, beispielhausen, neustadt };
```

### Minute 5–15: Stammdaten in `tenants/neustadt/gemeinde.config.ts`

| Feld | Beispiel | Hinweis |
| --- | --- | --- |
| `slug` | `"neustadt"` | = Ordnername = Subdomain |
| `name`, `art` | `"Neustadt"`, `"Stadt"` | „Stadt“, „Gemeinde“, „Markt“ … |
| `wappen`, `wappenAlt` | `"/tenants/neustadt/wappen.svg"` | Alt-Text beschreibt das Wappen |
| `akzentfarbe` | `"#1A5FB4"` | Kontrast zu Weiß ≥ 4.5:1 |
| `akzentfarbeDunkel` | `"#7DB3F0"` | Kontrast zu Schwarz ≥ 4.5:1 |
| `texte` | Untertitel, Platzhalter, Begrüßung | übersetzbar: `{ de: "…", en: "…" }` |
| `kontakt`, `oeffnungszeiten` | Adresse, Telefon, Zeiten | |
| `schliesstage` | `["2026-12-24"]` | bundesweite Feiertage sind automatisch gesperrt; Landesfeiertage hier ergänzen |
| `rechtliches` | Impressum, Datenschutz, DSB | Pflicht |
| `email` | Absendername und -adresse | |

### Minute 15–25: Leistungen und Ämter

1. **Ämter** (`aemter`): Pro Amt die buchbaren Zeitfenster, Slot-Länge, Anzahl paralleler Schalter, Vorlauf.
2. **Leistungen** (`leistungen`): Nicht angebotene Leistungen auf `aktiv: false` setzen. Für jede Leistung prüfen:
   - `stichworte` – Wörter, mit denen Bürger das Anliegen beschreiben (auch umgangssprachlich: „Perso“, „Welpe“)
   - `unterlagen`, `gebuehren`, `ablauf`, `fristen` – **nur gesicherte Angaben** aus Satzung/Gebührenordnung
   - `online` + `formular` für Online-Anträge, `termin` + `amtId` für Terminbuchung
3. **Rückfragen** (`rueckfragen`): Für mehrdeutige Anliegen („Umzug“ → wohin?).
4. **Schnellaktionen** (`schnellaktionen`): 4–6 häufigste Anliegen für die Startseite.

Formularfelder werden deklarativ beschrieben – keine Programmierung nötig:

```ts
{ id: "chipnummer", typ: "text", label: "Chipnummer", pflicht: true,
  muster: "^[0-9]{15}$", musterFehler: "Die Chipnummer besteht aus genau 15 Ziffern." },
{ id: "iban", typ: "iban", label: "IBAN", pflicht: true, sensibel: true,
  nurWenn: { feld: "zahlart", gleich: "lastschrift" } },
```

Feldtypen: `text`, `textarea`, `email`, `tel`, `date`, `number`, `select`, `radio`, `checkbox`, `iban` (mit Prüfsumme), `plz`.

### Minute 25–30: Wissensbasis und Prüfung

Markdown-Dateien in `tenants/neustadt/wissen/` – jede `## Überschrift` ist ein Abschnitt, den der Assistent zitieren kann:

```markdown
---
titel: Hundesteuer
quelle: Hundesteuersatzung der Stadt Neustadt vom 01.01.2026
---

## Höhe der Hundesteuer
Für den ersten Hund beträgt die Hundesteuer 84 Euro im Jahr. …
```

Tipps: Überschriften als Frage oder Thema formulieren, kurze Absätze, einfache Sprache, eine Information pro Abschnitt.

Dann prüfen:

```bash
npm run tenant:check            # Konfiguration
npm run dev
open "http://localhost:3000/?gemeinde=neustadt"
node scripts/assistent-check.mjs http://localhost:3000 neustadt   # Fälle in der Datei an die Gemeinde anpassen
```

Fertig. Für den Livebetrieb DNS-Eintrag `neustadt.meinportal.de` anlegen (siehe unten).

---

## Der Assistent

### Grundsätze

- Antwortet **nur** auf Basis von Konfiguration und Wissensbasis. Findet er nichts Gesichertes: „Dazu habe ich leider keine gesicherten Informationen“ + Kontakt / Termin.
- Erfindet keine Gebühren, Fristen oder Rechtsauskünfte. Bei Sprachmodellen wird jede Antwort mit einem €-Betrag verworfen, der nicht wörtlich im Kontext steht.
- Ton: ruhig, höflich, Sie-Form, einfache Sprache. Keine Avatare, kein Tipp-Effekt, keine KI-Optik.
- Stellt Rückfragen bei mehrdeutigen Anliegen, leitet in Online-Antrag oder Terminbuchung.
- Speichert keine Gesprächsverläufe auf dem Server.

### Ablauf

```
Anfrage → Analyse (Leistung? Rückfrage? Folgefrage? Wissensbasis-Treffer?)
        ├─ eindeutig (z. B. „Hund anmelden“) → deterministische Antwort aus der Konfiguration
        ├─ offen + Sprachmodell konfiguriert → Modell mit strengem Kontext (JSON-Antwort, validiert)
        └─ sonst → regelbasierte Antwort oder ehrliches „weiß ich nicht sicher“
```

### Provider (austauschbar, `ASSISTANT_PROVIDER`)

| Wert | Beschreibung | Datenschutz |
| --- | --- | --- |
| `local` *(Standard)* | regelbasiert, ohne Sprachmodell | keine Übermittlung |
| `openai-compatible` | jeder Anbieter mit OpenAI-kompatibler API: IONOS AI Model Hub, STACKIT, OVHcloud, Mistral (EU), oder eigenes Modell via vLLM/Ollama | EU-Hosting möglich, AV-Vertrag nötig |
| `anthropic` | Claude über die Anthropic API (alternativ über einen EU-Gateway via `ANTHROPIC_BASE_URL`) | AV-Vertrag und Drittlandtransfer prüfen |

Vor jeder Übermittlung an ein externes Modell werden E-Mail-Adressen, Telefonnummern, IBAN, Datumsangaben und lange Nummern entfernt (`lib/assistant/redact.ts`). API-Schlüssel liegen ausschließlich serverseitig in Umgebungsvariablen.

Einen eigenen Provider hinzufügen: `lib/assistant/providers/<name>.ts` mit `complete(system, messages)` implementieren und in `providers/index.ts` registrieren.

---

## Betrieb, Multi-Tenant und Hosting

**Variante A – ein Deployment, viele Gemeinden (empfohlen):**
Wildcard-DNS `*.meinportal.de` → ein Server. Die Middleware erkennt die Gemeinde an der Subdomain. Eigene Domains der Gemeinden (z. B. `service.neustadt.de`) per Reverse-Proxy auf `neustadt.meinportal.de` weiterleiten oder `x-forwarded-host` setzen.

**Variante B – ein Deployment pro Gemeinde:**
`TENANT=neustadt` setzen. Sinnvoll, wenn eine Gemeinde eigene Infrastruktur verlangt.

**Hosting in der EU:** `output: "standalone"` erzeugt einen schlanken Node-Server für Container (z. B. IONOS, STACKIT, Hetzner, OVHcloud, kommunale Rechenzentren).

```bash
npm run build
node .next/standalone/server.js     # public/ und .next/static/ mitkopieren
```

**Pflicht in Produktion:** `DATA_ENCRYPTION_KEY` setzen, `DATA_DIR` auf ein gesichertes Volume legen, SMTP eines EU-Anbieters konfigurieren, HTTPS.

**Skalierung:** Der MVP-Speicher (verschlüsselte JSON-Dateien) und das Rate Limiting im Arbeitsspeicher sind für eine Instanz ausgelegt. Für mehrere Instanzen `lib/storage/store.ts` durch PostgreSQL und `lib/rate-limit.ts` durch Redis/Valkey ersetzen – die Schnittstellen bleiben gleich.

---

## PWA und native Apps (Capacitor)

Das Portal ist eine installierbare PWA:

- `app/manifest.ts` – Manifest pro Gemeinde (Name, Kurzbefehle)
- `app/pwa-icon/[size]` – Icons werden automatisch aus dem Wappen erzeugt (inkl. maskable)
- `public/sw.js` – Service Worker: statische Dateien gecacht, Offline-Seite, **API-Aufrufe und Formulardaten werden nie gecacht**

**Native App pro Gemeinde mit Capacitor:** Da Assistent und Anträge serverseitig laufen, lädt die App das gehostete Portal der Gemeinde in einer nativen Hülle.

```bash
npm i -D @capacitor/cli && npm i @capacitor/core @capacitor/ios @capacitor/android
npx cap init "Neustadt" de.neustadt.buergerservice --web-dir public
```

```ts
// capacitor.config.ts
import type { CapacitorConfig } from "@capacitor/cli";
const config: CapacitorConfig = {
  appId: "de.neustadt.buergerservice",
  appName: "Neustadt",
  webDir: "public",
  server: { url: "https://neustadt.meinportal.de", cleartext: false },
};
export default config;
```

```bash
npx cap add ios && npx cap add android && npx cap open ios
```

App-Icon und Splashscreen aus `/pwa-icon/1024` erzeugen (z. B. mit `@capacitor/assets`). Pro Gemeinde ein eigenes `appId`/Store-Listing.

---

## Barrierefreiheit (WCAG 2.1 AA / BITV 2.0)

Umgesetzt:

- Tastaturbedienung überall, sichtbare Fokus-Ringe, „Zum Hauptinhalt springen“
- Semantische Struktur (Überschriften, Landmarks, `fieldset`/`legend`, Tabellen mit `caption`)
- Formulare: Labels, Hinweise und Fehler per `aria-describedby`, Fehlerzusammenfassung mit Sprunglinks, `autocomplete`-Attribute (WCAG 1.3.5)
- Gespräch als `role="log"` mit `aria-live`, Fokus-Management bei Schrittwechseln
- Kontraste ≥ 4.5:1 im hellen und dunklen Modus; Akzentfarben werden per `npm run tenant:check` geprüft
- `prefers-reduced-motion`, `prefers-reduced-transparency` und Windows-Kontrastmodus (`forced-colors`) werden berücksichtigt
- Textgröße 16 px in Eingabefeldern (kein Zoom-Sprung auf iOS), Zoom bis 200 %
- Vorlage für die Erklärung zur Barrierefreiheit unter `/barrierefreiheit`

Vor dem Livegang: BITV-Test durch eine unabhängige Stelle, Test mit Screenreadern (VoiceOver, NVDA, TalkBack).

---

## Datenschutz und Sicherheit

**Datenschutz (DSGVO)**

- Datensparsamkeit: Server speichert nur, was das Formular deklariert; unbekannte Felder werden verworfen
- Gesprächsverläufe werden nicht gespeichert (nur `sessionStorage` im Browser)
- Personenbezogene Daten verschlüsselt (AES-256-GCM); Zugangscodes nur als SHA-256-Hash
- Löschkonzept: jede Leistung hat `aufbewahrungTage`; Termine werden 14 Tage nach dem Termin gelöscht; abgelaufene Datensätze werden automatisch entfernt
- Keine Tracker, keine Cookies von Dritten, keine externen Schriften/CDNs (keine Google Fonts)
- Transparenzhinweis „KI-System“ auf der Startseite und unter `/datenschutz#assistent` (Art. 50 KI-VO)
- Einwilligungen werden vor dem Absenden ausdrücklich abgefragt
- Vorlage Datenschutzhinweise unter `/datenschutz` – **vor Livegang mit der/dem DSB abstimmen**

**Sicherheit**

- Strikte Content-Security-Policy mit Nonce, `frame-ancestors 'none'`, HSTS, `nosniff`, Permissions-Policy
- Eingabevalidierung mit Zod + Feldregeln, Größenbegrenzung aller Anfragen
- Rate Limiting pro Endpunkt (Assistent, Antrag, Termin, Status)
- Doppelbuchungen werden serverseitig ausgeschlossen
- Der Mandant wird ausschließlich serverseitig bestimmt (vom Client gesendete `x-tenant`-Header werden überschrieben)
- Keine API-Schlüssel im Frontend

---

## Schnittstellen: BundID, FIT-Connect, XÖV

Die Architektur trennt Oberfläche und Übermittlung über Interfaces in `lib/integrations/index.ts`:

- **`IdentityProvider`** – Anmeldung mit BundID / Nutzerkonto Bund (SAML 2.0) oder Online-Ausweis; liefert eine `Identitaet` mit eIDAS-Vertrauensniveau. Formulare können damit vorausgefüllt werden.
- **`SubmissionGateway`** – Übermittlung eines Antrags. Standard ist `localGateway` (verschlüsselt im Portal). Eine FIT-Connect-Anbindung (Zustellpunkt, XÖV-Standards wie XMeld oder XPersonenstand) wird als weiteres Gateway implementiert und in `gatewayFuer()` gewählt.
- Jede Leistung kann einen **`leistungsschluessel`** (LeiKa/FIM) tragen – damit lassen sich Leistungen später eindeutig dem OZG-Katalog und dem Zuständigkeitsfinder zuordnen.

---

## Roadmap

- **Admin-Bereich** für die Verwaltung: Anträge einsehen (entschlüsselt, mit Rollen & Protokollierung), Status setzen, Termine verwalten, Texte und Wissensbasis pflegen
- Datenbank-Adapter (PostgreSQL) und Redis-Rate-Limit für mehrere Instanzen
- BundID-Anmeldung und FIT-Connect-Gateway
- Weitere Sprachen inkl. **Leichte Sprache**
- Daten aus dem Gespräch in Formulare übernehmen (z. B. Hundename)
- Online-Bezahlung (z. B. ePayBL)
- Status-Benachrichtigung per E-Mail bei Änderungen
