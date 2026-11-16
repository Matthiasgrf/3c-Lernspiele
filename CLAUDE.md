# 3c-Lernspiele – Regeln für Claude

Sammlung von Browser-Lernspielen für eine 3. Klasse (Grundschule). Veröffentlicht über GitHub Pages
aus `main`, ohne Build-Schritt. Zielgruppe: Kinder ca. 8–9 Jahre, genutzt auf Computer, Tablet und Handy.
Sprache aller Texte im Spiel: Deutsch, kindgerecht, kurze Sätze.

## Struktur

```
index.html                 Startseite (Kacheln, Fach-Filter), liest games.js
games.js                   Liste aller Spiele – einzige Datei, die die Startseite steuert
404.html                   Seite für falsche Adressen
assets/                    Design und Skript der Startseite
assets/vendor/             gemeinsam genutzte Bibliotheken (Three.js r128)
games/<ordner>/            ein Ordner pro Spiel
  index.html               das Spiel, eigenständig in einer Datei
  thumbnail.jpg            Vorschaubild 900×600
  readme.md                kurze Beschreibung: Inhalt, Steuerung, Besonderheiten
tools/                     Werkzeuge: neues-spiel.js, thumbnail.js, check.js, smoke.js
tools/vorlage/             Startpunkt für neue Spiele (Quiz-Gerüst, erfüllt alle Regeln)
.github/workflows/         „Spiele prüfen“: check.js und smoke.js bei jedem Push
```

## Werkzeuge

| Befehl | Zweck |
| --- | --- |
| `node tools/neues-spiel.js <ordner> "<Titel>" ["<Fach>"] ["<Klasse>"]` | Ordner, fehlende Dateien aus der Vorlage, Eintrag in `games.js`. Überschreibt nichts. |
| `node tools/thumbnail.js <ordner> [--klick "<css>"] [--verstecken "<css>"] [--warten <ms>]` | `thumbnail.jpg` 900×600 als Screenshot |
| `node tools/check.js` | Regeln prüfen ohne Browser – muss ohne Fehler durchlaufen |
| `node tools/smoke.js [ordner]` | Startseite und Spiele im Browser öffnen (Computer + Handy), Screenshots in `test-ergebnisse/` |

Die Werkzeuge starten ihren eigenen Webserver. Neue Regeln, die sich automatisch prüfen lassen,
in `tools/check.js` ergänzen statt nur hier aufzuschreiben.

## Neues Spiel hinzufügen – Checkliste

1. **Ordner** `games/<ordner>/` anlegen. Ordnername nimmt der Nutzer vor, sonst kurz, ohne Leerzeichen
   und Umlaute (z. B. `Sachunterricht-Getreide`, `elisabeth`). Hochgeladene Datei als `index.html` ablegen,
   dann `node tools/neues-spiel.js …` ausführen – das ergänzt `readme.md` und den Eintrag in `games.js`.
2. **Spiel**: Hochgeladene Dateien inhaltlich nicht verändern (Fragen, Antworten, Spielablauf), außer der
   Nutzer erlaubt es. Offensichtliche Fehler beheben und im Pull Request erwähnen.
3. **Link zurück zur Übersicht** (`href="../../"`, Text „🏠 Alle Spiele“) an drei Stellen:
   Start-Bildschirm, während des Spiels (gut sichtbar, darf Steuerung nicht verdecken), End-/Gewinn-Bildschirm.
4. **Pfade** nur relativ (kein führendes `/`). Speicherstand nur mit eigenem `localStorage`-Schlüssel pro Spiel.
5. **Keine fremden Server**: Skripte, Schriften und Bilder von CDNs durch lokale Dateien ersetzen.
   Three.js r128 liegt in `assets/vendor/three-r128.min.js` (einbinden mit `../../assets/vendor/…`).
   Andere Bibliotheken über `npm pack <name>@<version>` holen, mit Version im Dateinamen und Lizenzdatei
   in `assets/vendor/` ablegen. Diese Anpassung zählt nicht als inhaltliche Änderung, im Pull Request erwähnen.
6. **Kachel** in `games.js`: `id` (= Ordnername, gleiche Groß-/Kleinschreibung), `title`,
   `description` (1 Satz), `age` (z. B. „3. Klasse“), `subject` (Fach, z. B. „Sachunterricht“ –
   vorhandene Schreibweise wiederverwenden, sonst entsteht ein zweiter Filter-Knopf).
   `path` und `thumbnail` ergeben sich aus der `id` und werden nicht eingetragen.
7. **readme.md** im Spielordner schreiben.
8. **Vorschaubild** mit `tools/thumbnail.js`: typische Spielszene, ohne Bedienelemente/Overlays
   (`--klick` für den Start-Knopf, `--verstecken` für Anzeigen). Ergebnis ansehen.
9. **Testen**: `node tools/check.js` und `node tools/smoke.js <ordner>` ohne Fehler; Screenshots in
   `test-ergebnisse/` in Computer- und Handy-Größe ansehen. Der Browser-Test öffnet nur den
   Start-Bildschirm – Spielablauf und End-Bildschirm zusätzlich mit Playwright durchspielen und ansehen,
   auf JavaScript-Fehler achten (`pageerror`).
10. **Startseite** per Screenshot prüfen (`test-ergebnisse/startseite-*.png` nach `node tools/smoke.js`):
    neue Kachel sichtbar, Bild und Texte passen.
11. **Abschluss**: committen, pushen, Pull Request nach `main` öffnen (ein Spiel pro Pull Request).
    Im Pull Request kurz auflisten: was neu ist, was am Spiel geändert wurde, Hinweise.
    Die Prüfung „Spiele prüfen“ auf GitHub muss grün sein.

## Anforderungen an neue Spiele (wenn Claude ein Spiel selbst entwickelt)

- Von `tools/vorlage/index.html` ausgehen oder deren Bausteine übernehmen.
- Eine einzige HTML-Datei, läuft ohne Build. Keine externen Skripte oder Schriften; Bibliotheken nur
  aus `assets/vendor/`.
- Bedienbar mit Tastatur/Maus **und** Touch (große Buttons, kein Hover-Zwang).
- Fragen und Antworten fachlich korrekt und passend zur 3. Klasse; vom Nutzer gelieferte Inhalte
  wörtlich übernehmen.
- Bei falscher Antwort freundliches Feedback und neuer Versuch, bei richtiger kurze Erklärung.
- Fortschritt sichtbar (z. B. „Stationen 3 / 10“), am Ende ein Gewinn-Bildschirm mit „Nochmal spielen“.
- Keine Werbung, keine Tracker, keine Eingabe persönlicher Daten.

## Startseite und Werkzeuge ändern

- Startseite bleibt ohne Build und ohne Abhängigkeiten; neue Felder in `games.js` optional halten,
  damit alte Einträge weiter funktionieren, und in `tools/check.js` sowie im Kommentar in `games.js` beschreiben.
- Nach Änderungen an `assets/`, `index.html`, `games.js` oder `tools/`: `node tools/check.js` und
  `node tools/smoke.js` ausführen.
- `package.json` dient nur den Tests (Playwright). Für die veröffentlichte Seite keine npm-Pakete einführen.

## Git

- Nur auf dem vorgegebenen Arbeitsbranch arbeiten, nie direkt auf `main`.
- Ist der vorherige Pull Request schon gemergt, den Branch neu von `origin/main` starten.
- `test-ergebnisse/` und `node_modules/` werden nicht eingecheckt.
