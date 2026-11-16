# Spiele

Sammlung kleiner Browser-Spiele. Veröffentlicht über GitHub Pages, keine Build-Schritte nötig.

## Struktur

```
index.html            Startseite mit Kacheln
games.js              Liste aller Spiele (hier neue Spiele eintragen)
assets/               Design und Skript der Startseite
games/<id>/           ein Ordner pro Spiel
  index.html          das Spiel selbst (eigenständig)
  thumbnail.jpg       Vorschaubild, ca. 900×600 px
.nojekyll             verhindert die Jekyll-Verarbeitung von GitHub Pages
```

## Neues Spiel hinzufügen

1. Ordner `games/<neue-id>/` anlegen, darin `index.html` und `thumbnail.jpg`.
2. In `games.js` einen weiteren Eintrag ergänzen (`id`, `title`, `description`, `age`, `path`, `thumbnail`).
3. Committen und pushen – fertig.

Wichtig: In den Spielen nur **relative Pfade** verwenden (kein führendes `/`), und für den Spielstand
einen **eigenen localStorage-Schlüssel** pro Spiel wählen. Ein Link zurück zur Startseite ist `../../`.

## Veröffentlichen

GitHub → Settings → Pages → Source: „Deploy from a branch“ → Branch `main`, Ordner `/ (root)`.
Die Seite ist danach unter `https://<benutzername>.github.io/<repository>/` erreichbar.

## Lokal testen

    python3 -m http.server 8000

und `http://localhost:8000` öffnen.
