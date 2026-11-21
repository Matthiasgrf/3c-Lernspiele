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
assets/zoom-schutz.js      verhindert versehentliches Zoomen auf Handy/Tablet, in jedes Spiel einbinden
assets/vendor/             gemeinsam genutzte Bibliotheken (Three.js r128)
games/<ordner>/            ein Ordner pro Spiel
  index.html               das Spiel, eigenständig in einer Datei
  thumbnail.jpg            Vorschaubild 900×600
  readme.md                kurze Beschreibung: Inhalt, Steuerung, Besonderheiten
tools/                     Werkzeuge: neues-spiel.js, anpassen.js, thumbnail.js, pruefen.js (= check + smoke + spieltest)
tools/spieltests/          Durchspiel-Tests, eine Datei pro Spiel (<ordner>.js)
tools/vorlage/             Startpunkt für neue Spiele (Quiz-Gerüst, erfüllt alle Regeln) + passender spieltest.js
.github/workflows/         „Spiele prüfen“: check.js, smoke.js und spieltest.js bei jedem Push
```

## Werkzeuge

| Befehl | Zweck |
| --- | --- |
| `node tools/neues-spiel.js <ordner> "<Titel>" ["<Fach>"] ["<Klasse>"] [--beschreibung "<Satz>"]` | Ordner, fehlende Dateien aus der Vorlage, Eintrag in `games.js`. Überschreibt nichts. Liegt schon eine `index.html` dort (Upload), wird sie mit `anpassen.js` technisch angepasst; sonst entsteht auch `tools/spieltests/<ordner>.js`. Fach wird an vorhandene Schreibweise angeglichen. |
| `node tools/anpassen.js <ordner> [--nur-zeigen]` | Technische Regeln einbauen, ohne den Inhalt zu ändern: `lang="de"`, viewport + Zoom-Schutz, Three.js r128 lokal, Google-Schriften raus. Listet, was von Hand bleibt (Link „Alle Spiele“, andere fremde Server). |
| `node tools/thumbnail.js <ordner> [--klick "<css>"] [--verstecken "<css>"] [--warten <ms>]` | `thumbnail.jpg` 900×600 als Screenshot |
| `node tools/pruefen.js [ordner …]` | **alle Prüfungen in einem Lauf** (wie GitHub): `check.js`, `smoke.js`, `spieltest.js`; listet am Ende die neuen Screenshots |
| `node tools/check.js` | Regeln prüfen ohne Browser – muss ohne Fehler durchlaufen (auch Vorlagen-Reste wie „TODO“, Fach-Schreibweisen) |
| `node tools/smoke.js [ordner …]` | Startseite und Spiele im Browser öffnen (Computer + Handy), Screenshots in `test-ergebnisse/` |
| `node tools/spieltest.js [ordner …]` | Spiele mit Testdatei in `tools/spieltests/` automatisch durchspielen (Spielablauf, Gewinn-Bildschirm, Speicherstand) |

`smoke.js` und `spieltest.js` testen mehrere Seiten gleichzeitig (`--parallel <n>`, `--parallel 1` = nacheinander).
Durchspiel-Tests deshalb nicht auf feste Wartezeiten bauen, sondern auf Zustände warten
(`page.waitForFunction`, Schleife bis der Spielzustand sich geändert hat) – unter Last laufen Spiele langsamer.
Die Werkzeuge starten ihren eigenen Webserver. Neue Regeln, die sich automatisch prüfen lassen,
in `tools/check.js` ergänzen statt nur hier aufzuschreiben.

## Neues Spiel hinzufügen – Checkliste

1. **Ordner** `games/<ordner>/` anlegen. Ordnername nimmt der Nutzer vor, sonst kurz, ohne Leerzeichen
   und Umlaute (z. B. `Sachunterricht-Getreide`, `elisabeth`). Hochgeladene Datei als `index.html` ablegen,
   dann `node tools/neues-spiel.js …` ausführen – das ergänzt `readme.md`, den Eintrag in `games.js` und
   baut die technischen Regeln aus Punkt 4 und 5 automatisch ein (`tools/anpassen.js`). Die Ausgabe
   „von Hand“ abarbeiten.
2. **Spiel**: Hochgeladene Dateien inhaltlich nicht verändern (Fragen, Antworten, Spielablauf), außer der
   Nutzer erlaubt es. Offensichtliche Fehler beheben und im Pull Request erwähnen.
3. **Link zurück zur Übersicht** (`href="../../"`, Text „🏠 Alle Spiele“) an drei Stellen:
   Start-Bildschirm, während des Spiels (gut sichtbar, darf Steuerung nicht verdecken), End-/Gewinn-Bildschirm.
4. **Pfade** nur relativ (kein führendes `/`). Speicherstand nur mit eigenem `localStorage`-Schlüssel pro Spiel.
   **Zoom-Schutz**: viewport-Tag mit `maximum-scale=1,user-scalable=no` und im `<head>`
   `<script src="../../assets/zoom-schutz.js"></script>` – sonst zoomen Kinder auf dem Handy aus Versehen
   und kommen nicht mehr auf 100 % zurück (iPhone ignoriert `user-scalable=no` allein). Zählt nicht als
   inhaltliche Änderung.
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
9. **Testen**: `node tools/pruefen.js <ordner>` ohne Fehler; Screenshots in
   `test-ergebnisse/` in Computer- und Handy-Größe ansehen. Der Browser-Test öffnet nur den
   Start-Bildschirm – Spielablauf und End-Bildschirm zusätzlich mit Playwright durchspielen und ansehen,
   auf JavaScript-Fehler achten (`pageerror`). Lohnt sich das bei einem selbst entwickelten Spiel öfter,
   den Ablauf als `tools/spieltests/<ordner>.js` festhalten – dann läuft er bei jedem Push mit
   (Beispiel: `tools/spieltests/mathe-robi.js`). Wer ein Spiel mit Testdatei ändert, führt
   `node tools/spieltest.js <ordner>` aus und passt den Test mit an.
10. **Startseite** per Screenshot prüfen (`test-ergebnisse/startseite-*.png` nach `node tools/smoke.js`):
    neue Kachel sichtbar, Bild und Texte passen.
11. **Abschluss**: committen, pushen, Pull Request nach `main` öffnen (ein Spiel pro Pull Request).
    Im Pull Request kurz auflisten: was neu ist, was am Spiel geändert wurde, Hinweise.
    Die Prüfung „Spiele prüfen“ auf GitHub muss grün sein.

## Anforderungen an neue Spiele (wenn Claude ein Spiel selbst entwickelt)

- Von `tools/vorlage/index.html` ausgehen oder deren Bausteine übernehmen (Sterne + Rekord, gemischte Antworten,
  Test-Zugang `window.SPIEL` mit `?test`). `neues-spiel.js` legt dazu `tools/spieltests/<ordner>.js` an –
  wird das Spiel anders aufgebaut, den Test mit anpassen, nicht löschen.
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
- Nach Änderungen an `assets/`, `index.html`, `games.js` oder `tools/`: `node tools/pruefen.js` ausführen.
- Startseite: gewähltes Fach steht in der Adresse (`…/#Mathe`), Links darauf lassen sich weitergeben.
- `package.json` dient nur den Tests (Playwright). Für die veröffentlichte Seite keine npm-Pakete einführen.

## Git

- Nur auf dem vorgegebenen Arbeitsbranch arbeiten, nie direkt auf `main`.
- Ist der vorherige Pull Request schon gemergt, den Branch neu von `origin/main` starten.
- `test-ergebnisse/` und `node_modules/` werden nicht eingecheckt.
