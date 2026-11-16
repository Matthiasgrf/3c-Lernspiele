# 3c-Lernspiele

Browser-Lernspiele für die Grundschule (3. Klasse). Veröffentlicht über GitHub Pages direkt aus `main` –
die Seite braucht keinen Build-Schritt. Die Spiele laden nichts von fremden Servern, haben keine Werbung,
keine Tracker und fragen keine persönlichen Daten ab.

## Struktur

```
index.html              Startseite mit Kacheln und Fach-Filter
games.js                Liste aller Spiele – steuert die Startseite
404.html                Seite für falsche Adressen, führt zurück zur Übersicht
assets/                 Design und Skript der Startseite
assets/vendor/          gemeinsam genutzte Bibliotheken (z. B. Three.js r128)
games/<id>/             ein Ordner pro Spiel
  index.html            das Spiel, eigenständig in einer Datei
  thumbnail.jpg         Vorschaubild 900×600
  readme.md             Inhalt, Steuerung, Besonderheiten
tools/                  Werkzeuge zum Anlegen und Prüfen (nur für die Entwicklung)
tools/vorlage/          Startpunkt für ein neues Spiel
.github/workflows/      automatische Prüfung bei jedem Push
```

## Neues Spiel hinzufügen

Am einfachsten: Spiel-Datei oder Idee an Claude geben – die Checkliste steht in `CLAUDE.md`.

Von Hand:

1. Spiel anlegen. Das erzeugt den Ordner, fehlende Dateien aus der Vorlage und den Eintrag in `games.js`
   (eine schon vorhandene `index.html` bleibt unverändert):

       node tools/neues-spiel.js mathe-einmaleins "Einmaleins-Rakete" "Mathe" "3. Klasse"

2. Spiel, `readme.md` und die Beschreibung in `games.js` fertig machen.
3. Vorschaubild erzeugen und ansehen:

       node tools/thumbnail.js mathe-einmaleins --klick "#startBtn" --verstecken ".bar"

4. Prüfen:

       node tools/check.js
       node tools/smoke.js mathe-einmaleins

5. Committen, pushen, Pull Request nach `main`.

### Eintrag in games.js

```js
{
  id: "mathe-einmaleins",          // Ordnername unter games/, genau gleich geschrieben
  title: "Einmaleins-Rakete",
  description: "Ein Satz für die Kachel.",
  age: "3. Klasse",
  subject: "Mathe"                 // Fach – daraus entstehen die Filter-Knöpfe
}
```

Link und Vorschaubild ergeben sich aus der `id`. Mit `hidden: true` verschwindet ein Spiel von der
Startseite, ohne dass man es löschen muss. Die Reihenfolge in der Liste ist die Reihenfolge der Kacheln.

### Regeln für jedes Spiel

- Nur **relative Pfade** (kein führendes `/`), Link zur Übersicht ist `../../` mit dem Text „🏠 Alle Spiele“ –
  sichtbar auf Start-Bildschirm, im Spiel und auf dem End-Bildschirm.
- **Nichts von fremden Servern laden** (keine CDNs, keine Web-Schriften). Bibliotheken liegen in
  `assets/vendor/` und werden z. B. mit `../../assets/vendor/three-r128.min.js` eingebunden.
- Eigener **localStorage-Schlüssel** pro Spiel (z. B. `europaflug_v1`).
- Groß-/Kleinschreibung von Ordner- und Dateinamen muss überall genau stimmen – GitHub Pages unterscheidet sie.

## Prüfen und testen

| Befehl | Was passiert |
| --- | --- |
| `node tools/check.js` | prüft ohne Browser: Einträge in `games.js`, Dateien, Bildgröße, Pfade, fremde Server, Speicher-Schlüssel |
| `node tools/smoke.js [id]` | öffnet Startseite und Spiele in Computer- und Handy-Größe, meldet JavaScript-Fehler, Screenshots in `test-ergebnisse/` |
| `python3 -m http.server 8000` | Seite lokal ansehen unter `http://localhost:8000` |

`check.js` braucht nur Node. `smoke.js` und `thumbnail.js` brauchen zusätzlich Playwright
(`npm install` und einmalig `npx playwright install chromium`).

Beide Prüfungen laufen bei jedem Push automatisch (GitHub → Actions → „Spiele prüfen“). Der Browser-Test
spielt die Spiele nicht durch: Spielablauf und End-Bildschirm weiterhin von Hand ansehen.

## Veröffentlichen

GitHub → Settings → Pages → Source: „Deploy from a branch“ → Branch `main`, Ordner `/ (root)`.
Die Seite ist danach unter `https://<benutzername>.github.io/<repository>/` erreichbar.
Änderungen sind nach dem Mergen meist in ein bis zwei Minuten online; der Browser kann alte Dateien
noch etwa zehn Minuten zeigen.

## Lizenzen

Three.js (`assets/vendor/`) steht unter der MIT-Lizenz, siehe `assets/vendor/three-LICENSE.txt`.
