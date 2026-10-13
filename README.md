# Bürgerportal – White-Label für Gemeinden

Ein ruhiges, barrierefreies Online-Rathaus. Bürgerinnen und Bürger beschreiben ihr Anliegen in **einem einzigen Eingabefeld** – oder laden direkt ihre Unterlagen hoch. Ein digitaler Assistent sortiert vor und führt Schritt für Schritt ans Ziel: Online-Antrag, Unterlagen an das zuständige Amt, Terminbuchung oder die richtige Ansprechperson. Die Ämter bearbeiten alles in einem schlichten Backoffice.

Eine Codebasis, beliebig viele Gemeinden. Jede Gemeinde wird über **eine Konfigurationsdatei** und einen Ordner mit Wissenstexten beschrieben.

```
Startseite → „Ich möchte meinen Hund anmelden“ → Unterlagen, Gebühren, Ablauf → Online-Antrag → Bestätigung → Meine Anliegen
Startseite → Büroklammer / Foto / Drag & Drop → Vorsortierung → Zusammenfassung → Absenden → Amt (Backoffice/E-Mail/Webhook)
```

---

## Inhalt

1. [Schnellstart](#schnellstart)
2. [Architektur](#architektur)
3. [Neue Gemeinde in 30 Minuten einrichten](#neue-gemeinde-in-30-minuten-einrichten)
4. [Der Assistent](#der-assistent)
5. [Dokumenten-Upload](#dokumenten-upload)
6. [Backoffice](#backoffice)
7. [Design- und Motion-System](#design--und-motion-system)
8. [Betrieb, Multi-Tenant und Hosting](#betrieb-multi-tenant-und-hosting)
9. [PWA und native Apps (Capacitor)](#pwa-und-native-apps-capacitor)
10. [Barrierefreiheit](#barrierefreiheit-wcag-21-aa--bitv-20)
11. [Datenschutz und Sicherheit](#datenschutz-und-sicherheit)
12. [Schnittstellen: BundID, FIT-Connect, XÖV](#schnittstellen-bundid-fit-connect-xöv)
13. [Tests und Qualität](#tests-und-qualität)
14. [Roadmap](#roadmap)

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
| `npm test` | Tests der kritischen Pfade (Upload, Weiterleitung, Config, Signaturen) |
| `npm run tenant:check` | prüft alle Gemeinde-Konfigurationen (Schema, Kontraste, Verweise) |
| `npm run assistent:check` | prüft das Verhalten des Assistenten gegen den laufenden Dev-Server |
| `npm run typecheck` / `npm run lint` | TypeScript / ESLint |
| `npm run backoffice:benutzer -- <name> <gemeinde> <ämter>` | erzeugt einen Backoffice-Zugang (Passwort-Hash) |
| `npm run build && npm start` | Produktions-Build |

Backoffice in der Entwicklung: http://localhost:3000/backoffice – Benutzer `demo`, Passwort `demo`.

> Alle Gebühren, Adressen und Zeiten der Beispiel-Gemeinden sind **frei erfunden**.

**Vorschau auf Vercel** (nur Testdaten!): Umgebungsvariablen `DATA_ENCRYPTION_KEY` (Zufallswert, siehe `.env.example`), `DATA_DIR=/tmp`, `ALLOW_TENANT_PREVIEW=1`, `VIRUS_SCAN=off`, `BACKOFFICE_DEMO=1` setzen. Daten auf Vercel sind flüchtig. Für den Echtbetrieb gilt der Abschnitt [Betrieb](#betrieb-multi-tenant-und-hosting).

---

## Architektur

**Next.js 15 (App Router) · TypeScript · Tailwind CSS 4 · Framer Motion · Zod**

```
├── config/
│   ├── types.ts                 # Typen der Gemeinde-Konfiguration (das "Vertragsformat")
│   ├── schema.ts                # Zod-Schema + Querverweise – bricht Build bei Fehlern ab
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
│   ├── meine-anliegen/          # Statusübersicht inkl. Rückfragen
│   ├── backoffice/              # Sachbearbeitung: Liste, Detail, Status, Rückfrage, Audit
│   ├── hilfe, kontakt, leistungen, datenschutz, barrierefreiheit, offline
│   ├── manifest.ts              # PWA-Manifest pro Gemeinde
│   ├── pwa-icon/[size]/         # App-Icons, erzeugt aus dem Wappen
│   └── api/
│       ├── assistent/           # POST: Gesprächsantwort (inkl. Vorsortierung von Uploads)
│       ├── upload/              # POST/DELETE: Dateien (geprüft, gescannt, verschlüsselt)
│       ├── vorgang/             # POST: Unterlagen verbindlich absenden
│       ├── dokument/[token]/    # GET: Dokument über kurzlebigen, signierten Link
│       ├── backoffice/          # Anmeldung, Status, Rückfrage
│       ├── antrag/              # POST: Antrag einreichen
│       ├── termine/ & slots/    # GET freie Termine, POST buchen, DELETE absagen
│       └── anliegen/            # POST: Statusabfrage
├── lib/
│   ├── motion.ts                # Motion-Tokens: Dauer, Easing, Federn (einzige Stelle)
│   ├── assistant/               # Engine, Wissensbasis-Suche, Provider, Pseudonymisierung
│   ├── uploads/                 # Formate, PDF-Analyse, Virenscan, Erkennung, Vollständigkeit
│   ├── vorgaenge/               # Vorgänge, Weiterleitung (E-Mail/Webhook), Löschkonzept
│   ├── backoffice/              # Anmeldung, Rollen pro Amt, Audit-Log
│   ├── signatur.ts              # Signierte, kurzlebige Tokens (HMAC)
│   ├── flows/validate.ts        # Formularvalidierung (Browser UND Server, gleiche Regeln)
│   ├── booking/                 # Slot-Berechnung (Europe/Berlin, Feiertage), Buchung
│   ├── integrations/            # Schnittstellen: BundID, FIT-Connect, Fachverfahren
│   ├── storage/                 # Datensätze (JSON) + Dokumente (Blobs), beides verschlüsselt
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
| `uploads` | Limits (MB, Anzahl), Löschfrist, Standard-Amt | `aktiv: false` schaltet Uploads ab |

### Minute 15–25: Leistungen und Ämter

1. **Ämter** (`aemter`): Pro Amt
   - `zustaendigkeiten` – Stichworte für die Vorsortierung von Uploads („hundesteuer“, „gewerbe“ …)
   - `weiterleitung` – `backoffice` (Standard), `email` (Benachrichtigung ohne Daten) oder `webhook` (Fachverfahren)
   - `bearbeitungshinweis` – z. B. „In der Regel innerhalb von 5 Werktagen“
   - `termine` – buchbare Zeitfenster, Slot-Länge, parallele Schalter, Vorlauf (weglassen = nicht buchbar)
2. **Leistungen** (`leistungen`): Nicht angebotene Leistungen auf `aktiv: false` setzen. Für jede Leistung prüfen:
   - `stichworte` – Wörter, mit denen Bürger das Anliegen beschreiben (auch umgangssprachlich: „Perso“, „Welpe“)
   - `unterlagen`, `gebuehren`, `ablauf`, `fristen` – **nur gesicherte Angaben** aus Satzung/Gebührenordnung
   - `online` + `formular` für Online-Anträge, `termin` + `amtId` für Terminbuchung
   - `dokumente` – welche Unterlagen hochgeladen werden sollen (`pflicht: true/false`) → Vollständigkeitsprüfung
   - `aufbewahrungTage` – Löschfrist für Vorgänge dieser Leistung
3. **Rückfragen** (`rueckfragen`): Für mehrdeutige Anliegen („Umzug“ → wohin?).

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

Dann prüfen. Fehlt ein Pflichtfeld oder stimmt ein Verweis nicht, **bricht der Build ab** und nennt die Stelle, z. B.:

```
Ungültige Gemeinde-Konfiguration:
  - [neustadt] leistungen[hund-anmelden].amtId: Amt "steuer" existiert nicht
  - [neustadt] akzentfarbe: #9EC5FF hat zu wenig Kontrast auf hellem Hintergrund (mind. 4.5:1)
```

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

## Dokumenten-Upload

Bürger laden Briefe, Ausweiskopien, Anträge und Nachweise direkt im Assistenten hoch: über die Büroklammer, per Drag-and-drop auf die ganze Seite oder auf dem Handy mit der Kamera (mehrere Seiten werden im Browser zu **einem PDF** zusammengefasst).

**Ablauf**

1. Vor dem ersten Upload: kurzer Datenschutzhinweis mit Einwilligung (inkl. Hinweis auf die KI-Vorsortierung).
2. Jede Datei wird sofort hochgeladen – mit Fortschritt, Vorschau, Entfernen, „Erneut versuchen“ und automatischer Wiederaufnahme, wenn das Netz zurückkommt.
3. Der Assistent erkennt die **Art** jedes Dokuments (Meldebescheinigung, Geburtsurkunde, Ausweiskopie, Brief vom Amt …), schlägt **Vorgang** und **zuständiges Amt** vor und sagt klar, **was noch fehlt** (laut `leistungen[].dokumente`).
4. Zusammenfassung: Vorgang (änderbar), Amt, Unterlagen (Art änderbar), fehlende Unterlagen, Kontaktdaten. **Erst nach ausdrücklicher Bestätigung** wird abgesendet.
5. Vorgangsnummer + Bestätigung auf der Seite und per E-Mail; Weiterleitung an das Amt laut Konfiguration; Status unter „Meine Anliegen“.

Der Assistent **entscheidet nie** über einen Antrag. Er sortiert vor und leitet weiter.

**Prüfungen auf dem Server (in dieser Reihenfolge)**

| Prüfung | Verhalten |
| --- | --- |
| Größe | Abbruch beim Einlesen, sobald `maxDateiMB` überschritten ist |
| Dateityp | am **Inhalt** (Magic Bytes), nicht an der Endung: PDF, JPG, PNG, HEIC |
| Aktive PDF-Inhalte | JavaScript, Launch-Aktionen, eingebettete Dateien → abgelehnt |
| Virenscan | ClamAV (`VIRUS_SCAN=clamav`). In Produktion ohne Scanner: **Uploads werden abgelehnt** (fail closed) |
| Duplikate, Anzahl, Gesamtgröße | pro Vorgang laut Konfiguration |
| Dateiname | bereinigt (keine Pfade/Steuerzeichen), Endung passend zum erkannten Typ |
| Ablage | AES-256-GCM verschlüsselt; nicht abgesendete Dateien werden nach 24 h gelöscht |

**Erkennung der Dokumentart:** Standardmäßig per Stichwortsuche in Dateiname und Text (bei Text-PDFs) – vollständig auf dem eigenen Server. Optional (`DOKUMENT_KLASSIFIKATION=modell`) per Sprachmodell mit Bildverständnis; dessen Antwort ist auf eine feste Liste von Arten beschränkt.

**Prompt Injection:** Inhalte aus Dokumenten sind **Daten, niemals Anweisungen**. Sie werden nur nach Stichworten durchsucht und nie in den Gesprächs-Prompt übernommen; ein Sprachmodell darf nur eine ID aus der erlaubten Liste zurückgeben. Tests decken das ab.

**Weiterleitung an die Ämter** (`aemter[].weiterleitung`)

- `backoffice` – Vorgang erscheint im Backoffice (Standard)
- `email` – Benachrichtigung an das Amt **ohne** personenbezogene Daten und **ohne** Anhänge, nur Vorgangsnummer und Link
- `webhook` – JSON an ein Fachverfahren, signiert mit HMAC-SHA256 (Header `X-Signatur: sha256=…`), Dokumente als **15 Minuten** gültige signierte Links. Nur `https://`.

Eine fehlgeschlagene Weiterleitung blockiert den Eingang nicht – der Vorgang liegt vollständig im Backoffice und ist dort markiert.

---

## Backoffice

`/backoffice` – schlichte Oberfläche für Sachbearbeiterinnen und Sachbearbeiter (später ausbaubar):

- Liste aller Vorgänge (Uploads und Online-Anträge), Filter nach Amt und Status
- Detail: Kontaktdaten, Nachricht, Formularangaben (IBAN maskiert), Unterlagen
- Status setzen: eingegangen → in Bearbeitung → Rückfrage → erledigt
- Rückfrage an den Bürger (E-Mail + sichtbar unter „Meine Anliegen“, Bürger kann dort antworten)
- **Rollen pro Amt:** Jeder Benutzer sieht nur die Vorgänge seiner Ämter
- **Dokumente nur über kurzlebige, signierte Links** (5 Minuten, an die Sitzung gebunden)
- **Audit-Log:** Anmeldungen, geöffnete Vorgänge, geöffnete Dokumente, Statuswechsel, Rückfragen (1 Jahr aufbewahrt, ohne Inhalte)

Benutzer anlegen:

```bash
npm run backoffice:benutzer -- anna musterstadt steueramt,standesamt
# → JSON-Eintrag für BACKOFFICE_USERS (Passwort nur als scrypt-Hash)
```

Sitzungen: signiertes Cookie (`HttpOnly`, `SameSite=Strict`, `Secure`), 8 Stunden; zustandsändernde Anfragen werden zusätzlich auf gleiche Herkunft geprüft. Login mit Rate Limiting.

---

## Design- und Motion-System

- **Farben:** monoton und kühl. Hell `#F5F7F9` / Text `#1D2228`, Dunkel `#07090B` / Text `#E6E9ED`. Die Akzentfarbe der Gemeinde erscheint **nur in Details** (Fokusring, Primär-Buttons in Abläufen) – nie auf der Startseite.
- **Glas:** 1-px-Border mit niedriger Deckkraft, weicher Schatten, Lichtkante oben. Fallback ohne `backdrop-filter` und bei „Transparenz reduzieren“: deckende Fläche.
- **Raster & Radien:** 8-px-Raster; Radien 12 / 16 / 24 / 32 px; ein Icon-Stil (Linien, Strichstärke 1,5).
- **Bewegung:** alle Dauern, Easings und Federn in `lib/motion.ts` (CSS-Gegenstück in `app/globals.css`). Es werden nur `transform` und `opacity` animiert. Bei `prefers-reduced-motion` bleiben nur Opacity-Übergänge (`MotionConfig reducedMotion="user"`).
- **Startseite → Gespräch:** Das Eingabefeld bleibt dasselbe Element und gleitet per Layout-Animation nach unten; das Wappen wird kleiner und rückt nach oben.
- **Theme:** wird vor dem ersten Paint gesetzt (kein Aufflackern); Wechsel als weiche Überblendung (View Transitions).

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

**Pflicht in Produktion:** `DATA_ENCRYPTION_KEY` setzen, `DATA_DIR` auf ein gesichertes, verschlüsseltes Volume in der EU legen, `PORTAL_URL` setzen, ClamAV betreiben (`VIRUS_SCAN=clamav`), SMTP eines EU-Anbieters konfigurieren, HTTPS, `BACKOFFICE_USERS` statt Demo-Zugang.

**Skalierung:** Der MVP-Speicher (verschlüsselte JSON-Dateien) und das Rate Limiting im Arbeitsspeicher sind für eine Instanz ausgelegt. Für mehrere Instanzen `lib/storage/store.ts` durch PostgreSQL, `lib/storage/blobs.ts` durch einen S3-kompatiblen Objektspeicher in der EU und `lib/rate-limit.ts` durch Redis/Valkey ersetzen – die Schnittstellen bleiben gleich.

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
- Transparenzhinweis „KI-System“ ab der ersten Interaktion (unter dem Eingabefeld im Gespräch), im Upload-Hinweis und unter `/datenschutz#assistent` (Art. 50 KI-VO)
- Einwilligungen werden vor dem ersten Upload und vor dem Absenden ausdrücklich abgefragt
- Dokumente werden **nicht** zum Training von Modellen verwendet; Ausweisdaten erscheinen nie im Klartext in Logs (der E-Mail-Log zeigt nur gekürzten Empfänger und Betreff)
- **Sprachmodelle nur mit Auftragsverarbeitungsvertrag (Art. 28 DSGVO):** Anbieter und Region sind über `ASSISTANT_PROVIDER`, `LLM_BASE_URL` bzw. `ANTHROPIC_BASE_URL` konfigurierbar. Vor Aktivierung: AV-Vertrag abschließen, EU-Region wählen, Training mit Kundendaten vertraglich ausschließen, Datenschutz-Folgenabschätzung prüfen. Ohne diese Voraussetzungen beim Standard `local` bleiben.
- Vorlage Datenschutzhinweise unter `/datenschutz` – **vor Livegang mit der/dem DSB abstimmen**

**Sicherheit**

- Strikte Content-Security-Policy mit Nonce, `frame-ancestors 'none'`, HSTS, `nosniff`, Permissions-Policy
- Eingabevalidierung mit Zod + Feldregeln, Größenbegrenzung aller Anfragen
- Rate Limiting pro Endpunkt (Assistent, Upload, Antrag, Vorgang, Termin, Status, Backoffice-Login)
- Uploads: Inhaltsprüfung, aktive Inhalte, Virenscan, Größenlimits, bereinigte Dateinamen
- Dokumentzugriff nur über kurzlebige, signierte URLs + rollenbasierte Rechte + Audit-Log
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

## Tests und Qualität

- `npm test` – Vitest: Upload (Formate, aktive Inhalte, Virus, Limits, Duplikate, fail closed), Weiterleitung (E-Mail ohne Daten, signierter Webhook, Fehlerfall), Löschkonzept, Config-Validierung, Signaturen, Formularregeln
- `npm run assistent:check` – 29 Fälle inkl. Manipulationsversuchen, Fremdsprache, leerer/zu langer Eingabe
- Lighthouse (Mobil): Startseite Performance 100, Barrierefreiheit 100, Best Practices 100, SEO 100

---

## Roadmap

- **Backoffice ausbauen:** Termine verwalten, Texte und Wissensbasis pflegen, Vorlagen für Rückfragen, Zuweisung an Personen
- Datenbank-Adapter (PostgreSQL) und Redis-Rate-Limit für mehrere Instanzen
- BundID-Anmeldung und FIT-Connect-Gateway
- Weitere Sprachen inkl. **Leichte Sprache**
- Daten aus dem Gespräch in Formulare übernehmen (z. B. Hundename)
- Online-Bezahlung (z. B. ePayBL)
- Status-Benachrichtigung per E-Mail bei Änderungen
- Texterkennung (OCR) für fotografierte Dokumente auf eigenem Server, um die Erkennung der Dokumentart zu verbessern
- Fortsetzbare Uploads in Teilen (tus-Protokoll) für sehr große Dateien
