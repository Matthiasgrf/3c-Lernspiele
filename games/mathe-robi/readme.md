# Robi in der Zahlenfabrik

Mathe, 3. Klasse. Jump-&-Run-Spiel: Roboter Robi läuft und hüpft durch eine Fabrik und bringt an
10 Stationen die Maschinen wieder zum Laufen. Dazu springt er von unten gegen den Block mit dem
richtigen Ergebnis. Am Ende wartet der Schrott-Roboter als Endgegner mit 3 weiteren Aufgaben.

Themen (am Start wählbar, in drei Gruppen, passend zum Bildungsplan 2016 Baden-Württemberg, Klassen 3/4):
- Rechnen: Einmaleins, Teilen, Plus bis 1000, Minus bis 1000, Zehner-Einmaleins (6 · 70, 420 : 6)
- Zahlen: Doppelt und Hälfte, Nachbarn und Runden (Vorgänger, Nachfolger, auf Zehner und Hunderter runden),
  Zahlenfolgen
- Größen: Größen umwandeln (Längen, Gewichte, Geld, Rauminhalt, Zeit)
- Alles: Bunt gemischt aus allen neun Themen

Die Aufgaben werden bei jedem Spiel neu gewürfelt, die falschen Antworten sind typische Rechenfehler.

Auch das Level wird bei jedem Spiel neu gewürfelt: Zwischen den Stationen liegen 9 Lauf-Abschnitte,
gezogen aus einem Vorrat von 18 (erst 3 leichte, dann 4 mittlere, dann 2 schwere). Darin gibt es Gruben,
Förderbänder, Rampen zum Hinauflaufen, Treppen-Berge, Aufzüge und fahrende Plattformen (beide orange).

Belohnungen:
- Robis Werkstatt: Die gesammelten Zahnräder kommen nach jedem geschafften Level aufs Konto. Damit kaufen
  die Kinder neue Farben, Hüte und Antennen für Robi (Knopf „🔧 Werkstatt“ auf Start- und Gewinn-Bildschirm).
- Serien-Bonus: Drei Aufgaben in Folge beim ersten Versuch richtig geben eine Extra-Kraft, der Reihe nach
  Schutzschild (fängt einen Gegner-Treffer ab), Zahnrad-Magnet und Doppelsprung. Magnet und Doppelsprung
  halten bis zur nächsten gelösten Station, der Schild, bis er gebraucht wird. Die Serie steht oben rechts.
- Farbwelten: Jedes Spiel würfelt eine von vier Welten (Tagschicht, Nachtschicht, Kesselraum, Dach).
- Musik: einfache Melodie im Hintergrund, der Ton-Knopf schaltet Musik und Geräusche gemeinsam aus.

Steuerung: Computer: Pfeiltasten oder A/D zum Laufen, Leertaste (auch Pfeil hoch oder W) zum Springen ·
Tablet/Handy: Knöpfe ◀ ▶ links unten und Sprung-Knopf rechts unten. Läuft im Quer- und Hochformat.

Hinweise:
- Kein Zeitdruck beim Rechnen: An den Stationen gibt es keine Gegner. Bei einer falschen Antwort
  darf man es noch einmal versuchen, bei der richtigen erscheint der Rechenweg.
- Keine Leben: Nach einem Gegner oder einer Grube geht es am letzten Fähnchen weiter.
- Sterne am Ende: 3 Sterne ab 12 von 13 Aufgaben beim ersten Versuch, 2 Sterne ab 8, sonst 1.
- Spielstand im Browser unter `mathe_robi_v1`: beste Sterne pro Thema (`best`), Ton an/aus (`mute`),
  Zahnräder auf dem Konto (`bank`), gekaufte Teile (`own`) und was Robi trägt (`wear`).
- Neue Teile für die Werkstatt kommen in die Tabelle `SHOP`, neue Farbwelten in `THEMES`
  (zum Ansehen: `?test&welt=<nr>`).
- Grafik und Töne entstehen im Code, es werden keine Bilder oder fremden Dateien geladen.
- Neue Abschnitte kommen in `buildLevel` in die Listen `EASY`, `MID` oder `HARD`. Mit `?test&alle` enthält
  das Level alle Abschnitte hintereinander, so lässt sich prüfen, ob jeder schaffbar ist.
- Für automatische Tests: Mit `?test` in der Adresse ist der Spielzustand als `window.ROBI` erreichbar.
