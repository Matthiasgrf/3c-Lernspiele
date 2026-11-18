# Bauer Franz und die Getreideernte (Sachunterricht)

3D-Spiel für die 3. Klasse: Mit Bauer Franz und seiner Sense über das Getreidefeld laufen, einen Weg
frei mähen, die Garben mit dem Schubkarren zum Bauernhof fahren und an 10 Stationen Aufgaben lösen. Die Aufgaben sind dieselben wie im
„Getreide-Abenteuer“ (`games/Sachunterricht-Getreide/`): Getreidekorn und Mähdrescher beschriften,
Getreidepflanze, Lückentext, Rätsel, Wachstum im Jahreslauf, Arbeit früher und heute, Inhaltsstoffe.

## Steuerung

- Computer: Pfeiltasten (oder W A S D) zum Laufen, Leertaste zum Mähen.
- Tablet/Handy: Steuerknüppel links zum Laufen, grüner Knopf rechts zum Mähen.
- Schubkarren: einfach hinlaufen, dann schiebt ihn der Bauer. Abstellen mit der Leertaste bzw. dem
  grünen Knopf (heißt beim Schieben „Abstellen“). Mit dem Schubkarren kann der Bauer nicht mähen.
- Aufgaben: Wörter antippen und ins Feld setzen oder mit der Tastatur schreiben
  (im Aufgabenfenster umstellbar). Beim Schreiben zählen Groß-/Kleinschreibung und ae/ä nicht.

## Besonderheiten

- Im hohen Getreide läuft der Bauer langsam, auf gemähten Flächen schnell.
- Aus je 14 gemähten Feldern entsteht eine Garbe. Sie bleibt auf dem Feld liegen.
- Schubkarren und Bauernhof: Beim Schieben über eine Garbe fliegt sie in den Schubkarren. Er fasst 6 Garben.
  Ist er voll, fährt der Bauer ihn zum Bauernhof in der Ecke des Feldes; im gelben Ring vor dem Haus wird
  er geleert, die Garben stapeln sich neben dem Haus. Liegen 6 Garben auf dem Feld, mäht die Sense erst
  weiter, wenn sie eingeladen sind – so muss der Bauer regelmäßig zum Hof fahren.
  Anzeige oben: „🌾 Karren 3/6 · 🏡 12“ (Garben im Schubkarren, Garben auf dem Hof).
  Der Pfeil oben zeigt je nach Lage zum Schubkarren, zur nächsten Garbe oder zum Bauernhof,
  sonst zur nächsten offenen Station.
- Zusätze: 24 Feldblumen zum Pflücken (Klatschmohn, Kornblume) und vier Tierarten, die aus dem
  Getreide weghuschen (Feldhase, Feldhamster, Feldmaus, Feldlerche). Beim ersten Fund erscheint ein kurzer Satz.
- Speicherstand in `localStorage` unter `sachunterricht_getreideernte_v1`: gelöste Stationen,
  gemähte Felder, liegende Garben, Schubkarren (Ort, Ladung), Garben auf dem Hof, Blumen und Standort.
  „Neu anfangen“ und „Nochmal spielen“ löschen ihn.
- Three.js wird aus `assets/vendor/` geladen, das Spiel braucht keine fremden Server.
- Mit `?test` in der Adresse gibt es `window.BAUER` für den Durchspiel-Test
  (`tools/spieltests/Sachunterricht-Getreideernte.js`).
