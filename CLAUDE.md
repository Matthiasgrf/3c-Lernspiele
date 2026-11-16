# 3c-Lernspiele – Regeln für Claude

Sammlung von Browser-Lernspielen für eine 3. Klasse (Grundschule). Veröffentlicht über GitHub Pages
aus `main`, ohne Build-Schritt. Zielgruppe: Kinder ca. 8–9 Jahre, genutzt auf Computer, Tablet und Handy.
Sprache aller Texte im Spiel: Deutsch, kindgerecht, kurze Sätze.

## Struktur

```
index.html                 Startseite (Kacheln), liest games.js
games.js                   Liste aller Spiele – einzige Datei, die die Startseite steuert
assets/                    Design und Skript der Startseite
games/<ordner>/            ein Ordner pro Spiel
  index.html               das Spiel, eigenständig in einer Datei
  thumbnail.jpg            Vorschaubild 900×600
  readme.md                kurze Beschreibung: Inhalt, Steuerung, Besonderheiten
```

`games/index.html`, `games/games.js`, `games/README.md` sind alte Kopien und werden nicht benutzt.

## Neues Spiel hinzufügen – Checkliste

1. **Ordner** `games/<ordner>/` anlegen. Ordnername nimmt der Nutzer vor, sonst kurz, ohne Leerzeichen
   (z. B. `Sachunterricht-Getreide`, `elisabeth`).
2. **Spiel** als `index.html` ablegen. Hochgeladene Dateien inhaltlich nicht verändern
   (Fragen, Antworten, Spielablauf), außer der Nutzer erlaubt es. Offensichtliche Fehler beheben
   und im Pull Request erwähnen.
3. **Link zurück zur Übersicht** (`href="../../"`, Text „🏠 Alle Spiele“) an drei Stellen:
   Start-Bildschirm, während des Spiels (gut sichtbar, darf Steuerung nicht verdecken), End-/Gewinn-Bildschirm.
4. **Pfade** nur relativ (kein führendes `/`). Speicherstand nur mit eigenem `localStorage`-Schlüssel pro Spiel.
5. **Kachel** in `games.js` am Ende ergänzen: `id` (= Ordnername), `title`, `description` (1 Satz),
   `age` (z. B. „3. Klasse · Sachunterricht“), `path`, `thumbnail`.
6. **readme.md** im Spielordner schreiben.
7. **Testen** mit Playwright (vorinstalliert): Spiel lokal über `python3 -m http.server` öffnen,
   Screenshots in Computer-Größe und Handy-Größe (z. B. 390×844) ansehen, Start, Spiel und
   End-Bildschirm prüfen, auf JavaScript-Fehler achten (`pageerror`).
   Externe CDNs (z. B. cdnjs für Three.js) können in der Testumgebung gesperrt sein: dann die
   Bibliothek über npm holen (`npm pack three@<version>`) und per `page.route` lokal ausliefern –
   das Spiel selbst nicht ändern.
8. **Vorschaubild** `thumbnail.jpg` (900×600, JPEG) als Screenshot einer typischen Spielszene,
   ohne Bedienelemente/Overlays.
9. **Startseite** per Screenshot prüfen: neue Kachel sichtbar, Bild und Texte passen.
10. **Abschluss**: committen, pushen, Pull Request nach `main` öffnen (ein Spiel pro Pull Request).
    Im Pull Request kurz auflisten: was neu ist, was am Spiel geändert wurde, Hinweise (z. B. braucht Internet).

## Anforderungen an neue Spiele (wenn Claude ein Spiel selbst entwickelt)

- Eine einzige HTML-Datei, läuft ohne Build. Externe Skripte nur von cdnjs mit fester Version.
- Bedienbar mit Tastatur/Maus **und** Touch (große Buttons, kein Hover-Zwang).
- Fragen und Antworten fachlich korrekt und passend zur 3. Klasse; vom Nutzer gelieferte Inhalte
  wörtlich übernehmen.
- Bei falscher Antwort freundliches Feedback und neuer Versuch, bei richtiger kurze Erklärung.
- Fortschritt sichtbar (z. B. „Stationen 3 / 10“), am Ende ein Gewinn-Bildschirm mit „Nochmal spielen“.
- Keine Werbung, keine Tracker, keine Eingabe persönlicher Daten.

## Git

- Nur auf dem vorgegebenen Arbeitsbranch arbeiten, nie direkt auf `main`.
- Ist der vorherige Pull Request schon gemergt, den Branch neu von `origin/main` starten.
