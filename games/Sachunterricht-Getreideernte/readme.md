# Bauer Franz und die Getreideernte (Sachunterricht)

3D-Spiel für die 3. Klasse: Mit Bauer Franz und seiner Sense über das Getreidefeld laufen, einen Weg
frei mähen und an 10 Stationen Aufgaben lösen. Die Aufgaben sind dieselben wie im
„Getreide-Abenteuer“ (`games/Sachunterricht-Getreide/`): Getreidekorn und Mähdrescher beschriften,
Getreidepflanze, Lückentext, Rätsel, Wachstum im Jahreslauf, Arbeit früher und heute, Inhaltsstoffe.

## Steuerung

- Computer: Pfeiltasten (oder W A S D) zum Laufen, Leertaste zum Mähen.
- Tablet/Handy: Steuerknüppel links zum Laufen, grüner Knopf rechts zum Mähen.
- Aufgaben: Wörter antippen und ins Feld setzen oder mit der Tastatur schreiben
  (im Aufgabenfenster umstellbar). Beim Schreiben zählen Groß-/Kleinschreibung und ae/ä nicht.

## Besonderheiten

- Im hohen Getreide läuft der Bauer langsam, auf gemähten Flächen schnell.
- Aus je 14 gemähten Feldern entsteht eine Garbe (Zähler oben).
- Zusätze: 24 Feldblumen zum Pflücken (Klatschmohn, Kornblume) und vier Tierarten, die aus dem
  Getreide weghuschen (Feldhase, Feldhamster, Feldmaus, Feldlerche). Beim ersten Fund erscheint ein kurzer Satz.
- Ein Pfeil oben zeigt zur nächsten offenen Station.
- Speicherstand in `localStorage` unter `sachunterricht_getreideernte_v1`: gelöste Stationen,
  gemähte Felder, Garben, Blumen und Standort. „Neu anfangen“ und „Nochmal spielen“ löschen ihn.
- Three.js wird aus `assets/vendor/` geladen, das Spiel braucht keine fremden Server.
- Mit `?test` in der Adresse gibt es `window.BAUER` für den Durchspiel-Test
  (`tools/spieltests/Sachunterricht-Getreideernte.js`).
