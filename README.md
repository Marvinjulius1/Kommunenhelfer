# Bürgerportal – White-Label für Gemeinden

Ein ruhiges, barrierefreies Online-Rathaus. Bürgerinnen und Bürger beschreiben ihr Anliegen in **einem einzigen Eingabefeld** – oder laden direkt ihre Unterlagen hoch. Ein digitaler Assistent sortiert vor und führt Schritt für Schritt ans Ziel: Online-Antrag, Unterlagen an das zuständige Amt, Terminbuchung oder die richtige Ansprechperson. Die Ämter bearbeiten alles in einem schlichten Backoffice.

Dazu kommt ein **Bürgerkonto für jede Bürgerin und jeden Bürger**: alle Anliegen auf jedem Gerät, Bescheide digital im Postfach, Gebühren online bezahlen, Dokumentensafe, Online-Ausweis – und Dienste für den Alltag vom Abfallkalender bis zum Mängelmelder.

Eine Codebasis, beliebig viele Gemeinden. Jede Gemeinde wird über **eine Konfigurationsdatei** und einen Ordner mit Wissenstexten beschrieben.

### Funktionen auf einen Blick

| Bereich | Funktionen |
|---|---|
| **Erledigen** | Assistent mit einem Eingabefeld · Status per SMS/E-Mail auch ohne Konto · Zufriedenheit mit einem Klick · 30 Leistungen mit Online-Anträgen · Unterlagen hochladen/fotografieren · Online-Ausweis (BundID) · Online-Bezahlung · Terminbuchung vor Ort oder per Video · Live-Wartezeit und Wartenummer · „Ist mein Ausweis da?“ |
| **Bürgerkonto** | **„Was steht bei mir an?“** (Ausweis läuft ab, Hundesteuer fällig, Kind wird 3 …) · Mein Haushalt · Meine Anliegen · digitales Postfach mit Bescheiden · Zahlungen · Dokumentensafe · vorausgefüllte Formulare · Push und E-Mail · Lebenslagen-Checklisten mit Fristen · Datenexport und Löschung |
| **Alltag** | Abfallkalender mit Erinnerung · Mängelmelder mit Foto und GPS · Fundbüro · Aktuelles nach Ortsteil · **Warnungen** (Banner, NINA) · **Stadtkarte** · **Parken & Verwarnungsgeld** · **Friedhöfe** |
| **Familie & Freizeit** | **Kita-Platz-Börse** mit Warteliste · **Veranstaltungen & Ferienprogramm** mit Anmeldung · **Vereinsverzeichnis** · **Ehrenamtsbörse** |
| **Mitmachen** | Umfragen (eine Stimme pro Person) · Ideen mit Unterstützung · **Bürgerhaushalt** · Rat und Ausschüsse (OParl) mit Livestream |
| **Für alle** | 7 Sprachen inkl. Arabisch (von rechts nach links) und **Leichter Sprache** · Vorlesen · optional Spracheingabe · WCAG 2.1 AA |
| **Verwaltung** | Backoffice mit Rollen, Zuweisung, Vertretung, Textbausteinen · Bescheide digital zustellen · Gebühren anfordern · Wartenummern aufrufen · Fundbüro, Ausweise, Meldungen · Portal selbst anpassen · **Formular-Baukasten** · **Entwürfe für Rückfragen und Bescheide** · **Auslastungsprognose** · Statistik · **Wirkungsbericht als PDF** · Fristüberwachung und Wiedervorlage · Weiterleitung per E-Mail, Webhook oder FIT-Connect |

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
7. [Bürgerkonto](#bürgerkonto)
8. [Dienste für den Alltag](#dienste-für-den-alltag)
9. [Mitmachen, Ratsinfo und Verwaltung der Gemeinde](#mitmachen-ratsinfo-und-verwaltung-der-gemeinde)
10. [Sprachen, Leichte Sprache, Vorlesen](#sprachen-leichte-sprache-vorlesen)
11. [Design- und Motion-System](#design--und-motion-system)
12. [Betrieb, Multi-Tenant und Hosting](#betrieb-multi-tenant-und-hosting)
13. [PWA und native Apps (Capacitor)](#pwa-und-native-apps-capacitor)
14. [Barrierefreiheit](#barrierefreiheit-wcag-21-aa--bitv-20)
15. [Datenschutz und Sicherheit](#datenschutz-und-sicherheit)
16. [Schnittstellen: BundID, FIT-Connect, XÖV](#schnittstellen-bundid-fit-connect-xöv)
17. [Tests und Qualität](#tests-und-qualität)
18. [Roadmap](#roadmap)

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

**Vorschau auf Vercel** (nur Testdaten!): Umgebungsvariablen `DATA_ENCRYPTION_KEY` (Zufallswert, siehe `.env.example`), `DATA_DIR=/tmp`, `ALLOW_TENANT_PREVIEW=1` und `DEMO_MODUS=1` setzen. `DEMO_MODUS=1` schaltet in einem Rutsch Test-Online-Ausweis (Erika Mustermann), Test-Bezahlung, Backoffice `demo`/`demo` und den deaktivierten Virenscan frei – **niemals mit echten Daten**. Daten auf Vercel sind flüchtig. Für den Echtbetrieb gilt der Abschnitt [Betrieb](#betrieb-multi-tenant-und-hosting).

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
# Zusätzliche Rechte im Eintrag: "rollen": ["redaktion"] (Meldungen) oder ["admin"]
# Wartenummern, Ausweis-Status und Fundbüro folgen den Ämtern des Benutzers.
```

Sitzungen: signiertes Cookie (`HttpOnly`, `SameSite=Strict`, `Secure`), 8 Stunden; zustandsändernde Anfragen werden zusätzlich auf gleiche Herkunft geprüft. Login mit Rate Limiting.

Weitere Werkzeuge im Vorgang:

- **Zuweisung** an eine Person, Filter „Mir zugewiesen“ / „Nicht zugewiesen“
- **Textbausteine** für Rückfragen (`textbausteine` in der Gemeinde-Config)
- **Bescheid digital zustellen:** Titel, Begleittext, PDF – landet verschlüsselt im Postfach des Bürgers (Bürgerkonto oder „Meine Anliegen“), Benachrichtigung per E-Mail ohne Inhalt und per Push
- **Gebühr anfordern:** Betrag und Zweck – der Bürger bezahlt online, das Backoffice sieht den Zahlungsstatus

---

## Bürgerkonto

`/konto` – ein Konto für jede Bürgerin und jeden Bürger, mit E-Mail und Passwort oder mit dem Online-Ausweis (BundID; in der Demo eine Testidentität).

| Bereich | Inhalt |
|---|---|
| Meine Anliegen | alle Anträge, Uploads und Termine – geräteübergreifend, mit Status, Zahlungen und Post |
| Postfach | digitale Bescheide und Nachrichten (verschlüsselt, Mail nur als Hinweis) |
| Zahlungen | offene und bezahlte Gebühren, Quittungen |
| Dokumentensafe | bis zu 30 geprüfte, verschlüsselte Dokumente – im Assistenten über die Büroklammer wiederverwendbar |
| Persönliche Daten | füllen Antrags- und Terminformulare automatisch aus; Daten aus dem Online-Ausweis sind gesperrt |
| Benachrichtigungen | E-Mail, Push, Ortsteil, Abfallbezirk |
| Sicherheit & Datenschutz | Passwort, angemeldete Geräte, Datenexport (Art. 20 DSGVO), Konto löschen |

Technik: Profildaten verschlüsselt, E-Mail/eID-Pseudonym nur als HMAC-Index, Passwörter als scrypt-Hash, widerrufbare Server-Sitzungen (30 Tage), Löschung nach 3 Jahren Inaktivität.

**Online-Bezahlung:** Leistungen erhalten in der Config `bezahlung: { betrag, mengeFeld?, weitere? }` (z. B. 12 € erste, 6 € jede weitere Urkunde). Nach dem Absenden erscheint „Jetzt online bezahlen“. Anbieter über `ZAHLUNG_ANBIETER` (`demo` | `epaybl`); die ePayBL-Anbindung ist als Adapter in `lib/zahlung/anbieter.ts` vorbereitet und braucht die Zugangsdaten des Landes.

**Push:** Web Push (VAPID). Ohne `VAPID_PUBLIC_KEY`/`VAPID_PRIVATE_KEY` wird ein stabiles Schlüsselpaar aus `DATA_ENCRYPTION_KEY` abgeleitet.

---

## Dienste für den Alltag

Alle Dienste sind unter `/dienste` gebündelt und lassen sich pro Gemeinde über `funktionen` abschalten.

| Dienst | Seite | Config |
|---|---|---|
| **Abfallkalender** – Straßensuche, Feiertagsverschiebung, ICS-Export, Erinnerung am Vorabend | `/abfall` | `abfall` (Arten, Bezirke mit Straßen, Startdatum + Rhythmus) |
| **Mängelmelder** – Kategorie, Foto (EXIF/GPS wird entfernt), Standort, Hinweis auf Doppelmeldungen, öffentliche Liste | `/maengel`, `/maengel/melden` | `maengel.kategorien` (je Kategorie ein Amt) |
| **Lebenslagen** – Checklisten über alle Ämter mit Fristen; im Konto gespeichert, mit Erinnerung | `/lebenslagen` | `lebenslagen` (Schritte mit Leistung/Link und Frist in Tagen) |
| **Aktuelles** – Meldungen der Verwaltung, optional je Ortsteil, mit Push | `/aktuelles`, Backoffice `/backoffice/meldungen` | `ortsteile`; Backoffice-Rolle `redaktion` |

### Am Schalter und im Rathaus

| Dienst | Seite | Backoffice |
|---|---|---|
| **Live-Wartezeit & Wartenummer** – Schätzung aus den heutigen Bearbeitungszeiten, Nummer online ziehen, Push kurz vorher (mit Konto) | `/wartezeit`, Aufrufanzeige `/wartezeit/anzeige` | `/backoffice/wartezeit` |
| **Ist mein Ausweis da?** – Status mit Antragsnummer (nur als HMAC gespeichert), Benachrichtigung ins Postfach | `/ausweis-status` | `/backoffice/ausweise` |
| **Fundbüro** – Suche, „Das gehört mir“ mit Erkennungsmerkmalen (interne Merkmale bleiben verschlüsselt) | `/fundbuero` | `/backoffice/fundbuero` |
| **Video-Beratung** – bei der Buchung „Per Video“, eigener Raum je Termin | `/termine` | – |
| **Unterlagen-Check** und Erinnerung am Vortag | `/meine-anliegen` | – |

Video-Beratung: `videoBeratung: { url, aemter }` in der Config – `url` ist ein Jitsi-Server in der EU (selbst betrieben oder mit AV-Vertrag).

### Online-Anträge mit Unterlagen und Online-Ausweis

- Hat eine Leistung `dokumente`, bekommt der Antrag einen Schritt **Unterlagen** (Datei, Foto, Dokumentensafe). Die Erkennung schlägt die Art vor, Bürger können sie ändern. Pflichtunterlagen prüft der Server erneut.
- `erfordertOnlineAusweis: true` lässt den Antrag nur nach Anmeldung mit dem Online-Ausweis zu (z. B. elektronische Wohnsitzanmeldung). Ohne Online-Ausweis wird auf die Terminbuchung verwiesen.
- Weitere Leistungen der Beispielgemeinde stehen in `tenants/musterstadt/leistungen.ts` (Gewerbe, Halteverbot, Bewohnerparken, Sperrmüll, Tonne, Lastschrift, Übermittlungssperre, Melderegisterauskunft, Verlustanzeige, Kita, Bücherei, Raumbuchung, Vereinsförderung, Eheschließung, Sterbefall sowie Verweise auf Bauportal, Wohngeld, Kfz-Zulassung, Schwerbehindertenausweis).

Der Assistent verweist auf diese Dienste deterministisch (z. B. „Schlagloch“ → Mängelmelder, „Wir bekommen ein Baby“ → Checkliste).

### Tägliche Aufgaben (Cron)

`GET /api/cron` mit `Authorization: Bearer $CRON_SECRET` – auf Vercel per `vercel.json` täglich um 5 und 16 Uhr UTC (Vercel sendet den Header automatisch, wenn `CRON_SECRET` gesetzt ist). Ohne `CRON_SECRET` nur im Demo-/Entwicklungsmodus aufrufbar.

- Abfall-Erinnerung für morgen (Push je Bezirk, nur nachmittags)
- Fristen aus Checklisten (Push und E-Mail **ohne** Inhalt – Lebenslagen wie eine Geburt gehören nicht in eine Mail)
- Personalausweis läuft in 90 bzw. 30 Tagen ab
- Erinnerung am Vortag eines Termins (mit Unterlagen-Liste bzw. Video-Link)
- Neue persönliche Hinweise („Was steht bei mir an?“) per Push und E-Mail – ohne Inhalt
- Werktags morgens: Übersicht „Wiedervorlagen und Fristen“ an Sachbearbeiter/innen mit `email` in `BACKOFFICE_USERS` (nur Vorgangsnummern)
- Löschfristen: Vorgänge, Postfach, Safe, Zahlungen, Push-Abos, Sitzungen, Checklisten, Meldungen, inaktive Konten (3 Jahre) mit allen Dateien

Jede Aufgabe läuft pro Tag höchstens einmal.

---

## Mitmachen, Ratsinfo und Verwaltung der Gemeinde

| Bereich | Bürger | Backoffice |
|---|---|---|
| **Umfragen** – eine Stimme pro Konto (optional nur mit Online-Ausweis), Stimmen nur als Summen, Teilnahme als HMAC je Umfrage | `/beteiligung` | `/backoffice/beteiligung` (Rolle `redaktion`) |
| **Ideen** – einreichen, unterstützen, Antwort der Verwaltung; Veröffentlichung erst nach Prüfung, ohne Namen | `/beteiligung` | `/backoffice/beteiligung` |
| **Rat und Ausschüsse** – Sitzungen, Tagesordnung, Beschlüsse; live per OParl (`ratsinfo.oparlUrl`), sonst aus der Config | `/ratsinfo` | – |
| **Portal anpassen** – Leistungen ein/aus, Kurztexte, Gebühren, Texte der Startseite; gespeichert wird nur die Abweichung, geprüft wie die Config | – | `/backoffice/admin` (Rolle `admin`) |
| **Statistik** – nur Tageszähler, keine Personendaten | – | `/backoffice/statistik` (Rolle `admin`) |
| **Abwesenheit und Vertretung** – die Vertretung sieht die Vorgänge unter „Mir zugewiesen“ | – | `/backoffice/vertretung` |

### Wirkung zeigen und Fristen halten

| Funktion | Wo | Hinweise |
|---|---|---|
| **„Was steht bei mir an?“** | `/konto`, `/konto/haushalt` | Hinweise aus Profil, freiwilligen Haushaltsangaben (Kinder, Hund, Grundbesitz, Reisepass), Anliegen und den `stichtage` der Gemeinde (z. B. `{ id: "hundesteuer", daten: ["07-01"], fuer: "hund", vorlaufTage: 14 }`). Ausblendbar, als Kalenderdatei abonnierbar. Kinder: Kita ab 1 und 3, Einschulung, Ausweispflicht ab 16. |
| **Status per SMS/WhatsApp/E-Mail** | Bestätigung, „Meine Anliegen“, Ausweis-Status | Auch ohne Konto. Nachrichten enthalten nur Vorgangsnummer und neuen Stand. `SMS_TRANSPORT=http` + `SMS_API_URL`/`SMS_API_KEY` (EU-Gateway); WhatsApp (`funktionen.whatsapp`) über `WHATSAPP_API_URL`/`WHATSAPP_API_KEY`. Ohne Gateway: nur Log. |
| **Zufriedenheit** | nach dem Antrag, nach der Erledigung | 1–5 mit einem Klick, optional ein Satz. Ohne Personenbezug, Freitext verschlüsselt, Löschung nach einem Jahr. |
| **Fristen und Wiedervorlage** | `/backoffice` (Filter „Frist“), Vorgang | Bearbeitungsfrist in Werktagen ohne Feiertage und Schließtage (`bearbeitungTage` je Leistung oder Amt, Standard 10). Überschrittene Fristen und fällige Wiedervorlagen stehen oben. |
| **Wirkungsbericht** | `/backoffice/bericht` (Rolle `admin`) | Online-Anteil, eingesparte Arbeitszeit und Gegenwert, Bearbeitungsdauer, Fristquote, Zufriedenheit, häufigste Anliegen, Vergleich zum Vorzeitraum. „Als PDF speichern“ über den Druckdialog. Annahmen offen ausgewiesen und per `wirkung` anpassbar. |

### Familie, Freizeit und Alltag

| Dienst | Bürger | Backoffice | Konfiguration / Datenschutz |
|---|---|---|---|
| **Kita-Platz-Börse** | `/kita` – bis zu 3 Wunsch-Kitas, Platz auf der Warteliste, Angebot annehmen | Verwaltung → Kita-Plätze (Amt mit Zuständigkeit `kita`): Platz anbieten (14 Tage Frist), absagen | `kitas` · Daten des Kindes verschlüsselt, Löschung 1 Jahr nach Beginn. Rangfolge = Eingang; die Vergabe entscheidet weiterhin die Kita. |
| **Veranstaltungen & Ferienprogramm** | `/veranstaltungen` – Anmeldung mit Warteliste, automatisches Nachrücken, Kalenderdatei, Abmeldelink | Verwaltung → Veranstaltungen (Rolle `redaktion`): anlegen, Teilnehmerliste als CSV | `veranstaltungen` (feste Termine) · Kontaktdaten verschlüsselt, Löschung 30 Tage nach dem Termin |
| **Vereine** | `/vereine` – Nachricht an den Verein, dessen Adresse verborgen bleibt | – | `vereine` |
| **Ehrenamtsbörse** | `/ehrenamt` – „Ich helfe mit“ | Gesuche anlegen, Rückmeldungen sehen | `ehrenamt` · Weiterleitung per E-Mail, Löschung nach 90 Tagen |
| **Bürgerhaushalt** | `/buergerhaushalt` – Budget auf Projekte verteilen | Beteiligung → Bürgerhaushalt anlegen, beenden | Eine Teilnahme je Konto (HMAC), nur Summen; optional nur mit Online-Ausweis |
| **Parken & Verwarnungsgeld** | `/parken` – mit Aktenzeichen + Kennzeichen nachsehen, online bezahlen oder Stellung nehmen (wird ein Vorgang) | Verwaltung → Verwarnungsgeld: Fälle erfassen (im Echtbetrieb Import aus dem Fachverfahren) | Kennzeichen nur als HMAC, Rate-Limit gegen Durchprobieren |
| **Friedhöfe** | `/friedhof` – Grabarten, Ruhezeiten, Gebühren; Nutzungsrecht online verlängern (mit Bezahlung je Jahr) | Vorgänge | `friedhoefe` + Leistung `grabnutzung-verlaengern` |
| **Warnungen** | Banner auf allen Seiten, `/aktuelles` | Meldungen mit Warnstufe (Hinweis/Warnung/Gefahr), Art und Ort; „Gefahr“ geht immer als Push raus | Amtliche Warnungen über NINA mit `ars` (Regionalschlüssel) – serverseitig abgerufen und zwischengespeichert |
| **Stadtkarte** | `/karte` – Ebenen, Liste als barrierefreie Alternative, Tastatur | – | `karte`, `orte` + Kitas, Friedhöfe, Meldungen mit Ort, offene Mängel. Kacheln über `/api/karte/kachel` (Zwischenspeicher 30 Tage, nur Umkreis der Gemeinde) – keine Bürger-IP an Dritte. Eigener Kachelserver: `KARTE_KACHEL_URL`. |
| **Livestream** | Ratsinfo: „Live“-Kennzeichen, Link zu Livestream bzw. Aufzeichnung (neues Fenster, keine eingebetteten Fremdinhalte) | – | `ratsinfo.sitzungen[].livestream` / `aufzeichnung` |

### Werkzeuge für die Sachbearbeitung

| Funktion | Wo | Hinweise |
|---|---|---|
| **Entwürfe** für Rückfrage, Antwort und Bescheid-Begleittext | Vorgang → „Entwurf vorschlagen“ | Immer nur ein Vorschlag im Textfeld – gesendet wird erst mit dem eigenen Klick. Ohne Sprachmodell aus Vorlagen und Konfiguration (z. B. fehlende Pflichtunterlagen). Mit `ASSISTANT_PROVIDER` formuliert ein Modell; Namen, Kontakt- und Bankdaten werden vorher entfernt und erst danach wieder eingesetzt, Antragsinhalte gelten als Daten, nie als Anweisungen. Beträge, die nicht in der Gebührenordnung stehen, werden rot markiert. `ENTWURF_KI=aus` schaltet das Modell nur hierfür ab. Jeder Entwurf steht im Audit-Log. |
| **Formular-Baukasten** | Verwaltung → Formulare (Rolle `admin`) | Eigene Online-Anträge ohne Programmierung: Grunddaten, Schritte, Felder (Text, Datum, Auswahl, IBAN …), Gebühr mit Online-Bezahlung, Live-Vorschau mit den echten Formularfeldern, Vorlage aus einer bestehenden Leistung. Kontaktschritt, Eingangsbestätigung, „Meine Anliegen“, Backoffice und Assistent sind automatisch dabei. Gespeichert wird geprüft wie die Konfigurationsdatei; Leistungen der Datei werden nie überschrieben. |
| **Auslastungsprognose** | Auslastung | 14 Tage je Amt: gebuchte Termine, erwartete Kontakte (gewichteter Verlauf der letzten 8 gleichen Wochentage inkl. Wartenummern), Auslastung und fehlendes Personal. Grundlage sind anonyme Tageszähler je Amt (Cron), keine Personendaten. |

### FIT-Connect

Ein Amt kann Vorgänge per FIT-Connect an sein Fachverfahren übermitteln:

```ts
weiterleitung: { typ: "fitconnect", destinationId: "<UUID des Zustellpunkts>" }
```

Dazu `FIT_CONNECT_CLIENT_ID` und `FIT_CONNECT_CLIENT_SECRET` setzen (Self-Service-Portal der FITKO). Inhalte und Anlagen werden Ende-zu-Ende verschlüsselt (JWE, RSA-OAEP-256 + A256GCM); der Leistungsschlüssel (`leistungsschluessel`) bestimmt den Service-Typ. Der Vorgang bleibt zusätzlich im Portal (Status für Bürger), die Submission-ID steht im Backoffice.

> **Status:** nach der öffentlichen Spezifikation umgesetzt, die Verschlüsselung ist durch einen Test abgesichert – die Übermittlung selbst ist aber **noch nicht gegen die FIT-Connect-Testumgebung geprüft**. Im Echtbetrieb müssen `FIT_CONNECT_TOKEN_URL` und `FIT_CONNECT_SUBMISSION_URL` gesetzt werden.

---

## Sprachen, Leichte Sprache, Vorlesen

**Sprachen:** Deutsch, Leichte Sprache, Englisch, Türkisch, Ukrainisch, Arabisch, Russisch – auswählbar unten auf jeder Seite (`sprachen` in der Config). Arabisch wird von rechts nach links dargestellt (`dir="rtl"`, gespiegelte Pfeile, Absätze in anderer Sprache bestimmen ihre Richtung selbst).

- Übersetzbare Texte sind `LText`: `{ de, ls?, en?, tr?, uk?, ar?, ru? }`. Fehlt eine Übersetzung, gilt: **Leichte Sprache → Deutsch**, **andere Sprachen → Englisch → Deutsch**.
- Die Oberfläche (Menüs, Knöpfe, Hinweise) ist in allen sieben Sprachen übersetzt (`lib/i18n.ts`); viele Seitentexte gibt es auf Deutsch und Englisch. Inhalte der Gemeinde (Leistungen, Gebühren, Abläufe) erscheinen in der Sprache, in der sie gepflegt sind – Beispiel: `tenants/musterstadt/uebersetzungen.ts` (Titel aller Leistungen in allen Sprachen, wichtige Kurztexte in Leichter Sprache).
- Bei Übersetzungen steht unten der Hinweis, dass nur die deutsche Fassung verbindlich ist.
- **Assistent:** Ohne Sprachmodell erkennt er Anliegen auch an den übersetzten Titeln (z. B. „köpek kaydı“ → Hund anmelden), antwortet in anderen Sprachen aber auf Englisch. Mit Sprachmodell antwortet er in der gewählten Sprache – in Leichter Sprache mit kurzen Sätzen.
- Der Browser erhält nur die gewählte Sprache (`lib/config-browser.ts`) – das hält die Seiten klein.

> **Vor dem Livegang:** Übersetzungen fachlich prüfen lassen; Texte in Leichter Sprache von einer Prüfgruppe (Menschen mit Lernschwierigkeiten) prüfen lassen.

**Leichte Sprache und Gebärdensprache (BITV 2.0 § 4):** `/leichte-sprache` erklärt Inhalte, Bedienung, Barrierefreiheit und Kontakt in Leichter Sprache und ist von jeder Seite verlinkt. Die ebenfalls vorgeschriebenen **Videos in Deutscher Gebärdensprache** muss die Gemeinde erstellen lassen; sie werden auf einer Seite `/gebaerdensprache` eingebunden.

**Vorlesen:** Knopf auf allen Inhaltsseiten und unter jeder Antwort des Assistenten. Genutzt wird die Sprachausgabe des Geräts, bevorzugt Stimmen, die lokal laufen – dann verlässt kein Text das Gerät. Abschaltbar mit `funktionen.vorlesen: false`.

**Spracheingabe:** Mikrofon im Eingabefeld, **standardmäßig aus** (`funktionen.spracheingabe: true` zum Einschalten). Die Erkennung übernimmt der Browser; in Chrome wird das Audio dafür an Google übertragen. Deshalb fragt das Portal vor der ersten Nutzung, und die Gemeinde muss die Funktion bewusst freigeben (Datenschutzhinweis erscheint dann automatisch).

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
- Rate Limiting pro Endpunkt (Assistent, Upload, Antrag, Vorgang, Termin, Status, Backoffice-Login). Die Client-Adresse kommt aus `X-Real-IP` bzw. dem letzten Eintrag in `X-Forwarded-For` – der Reverse-Proxy muss diese Header setzen (Vercel und übliche nginx-Konfigurationen tun das).
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

- `npm test` – 105 Tests (Vitest): Kita-Warteliste und Angebote, Anmeldungen mit Warteliste (auch gleichzeitig), Bürgerhaushalt (Budget, eine Teilnahme), Verwarnungsgeld, NINA, Kartenrechnung, Livestream, Formular-Baukasten (IDs, Kollisionen, Validierung), Entwürfe (fehlende Unterlagen, keine erfundenen Beträge), Auslastungsprognose, persönliche Hinweise (Stichtage, Kinder, Ausblenden), Werktagsfristen, Telefonnummern, Wirkungskennzahlen, Upload (Formate, aktive Inhalte, Virus, Limits, Duplikate, fail closed), Weiterleitung, Löschkonzept, Config-Validierung, Signaturen, Formularregeln, Gebühren und Zahlungslinks, Postfach-Verschlüsselung, Feiertage und Abfallkalender, EXIF-Entfernung, Lebenslagen, Ausweis-Status, Fundbüro, Wartenummern (auch gleichzeitige Vergabe), Unterlagen-Zuordnung, Umfragen (eine Stimme, Anonymität, gleichzeitige Stimmen), Ideen-Moderation, Admin-Anpassungen, Vertretung, FIT-Connect-Verschlüsselung (JWE-Rundlauf), Sprach-Fallbacks, schlanke Browser-Config
- `npm run assistent:check` – 34 Fälle inkl. Manipulationsversuchen, Fremdsprache, leerer/zu langer Eingabe
- `npm run tenant:check` – prüft alle Gemeinde-Konfigurationen (Schema, Querverweise, Kontraste)
- Lighthouse (Mobil, Produktions-Build): Startseite, Dienste, Antrag, Beteiligung, Wartezeit, Abfall und Leichte Sprache – Performance 98–100, Barrierefreiheit 100, Best Practices 100, SEO 100

---

## Roadmap

- **Für den Echtbetrieb anbinden:** BundID (SAML) statt Test-Identität, ePayBL-Zugangsdaten des Landes, FIT-Connect gegen die Testumgebung prüfen, ClamAV, SMTP
- Datenbank-Adapter (PostgreSQL), S3-Objektspeicher in der EU und Redis-Rate-Limit für mehrere Instanzen
- Backoffice: Termine verwalten, Wissensbasis pflegen, bedingte Felder im Formular-Baukasten
- Übersetzungen der Seitentexte und Leistungsinhalte in alle Sprachen; Gebärdensprach-Videos
- Daten aus dem Gespräch in Formulare übernehmen (z. B. Hundename)
- Texterkennung (OCR) für fotografierte Dokumente auf eigenem Server, um die Erkennung der Dokumentart zu verbessern
- Fortsetzbare Uploads in Teilen (tus-Protokoll) für sehr große Dateien
