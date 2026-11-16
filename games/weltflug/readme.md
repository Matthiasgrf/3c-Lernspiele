# WeltFlug

Flugspiel nach dem Vorbild von EuropaFlug, aber für die ganze Welt: Mit dem Flugzeug zu allen
193 Mitgliedsstaaten der Vereinten Nationen fliegen, dem orangen Pfeil zum Ziel-Land folgen und bei der
gelben Kugel (Hauptstadt) landen. Nach der Landung gibt es die gleichen Fragen wie bei EuropaFlug:

1. Welche Flagge gehört zum Land?
2. Wie heißt die Hauptstadt?
3. Welche Sehenswürdigkeit gibt es dort?
4. Wie viele Menschen leben ungefähr im Land?

Wer alle Länder besucht hat, wird „Welt-Meister“. Der Spielstand wird im Browser gespeichert (`weltflug_v1`).

Steuerung: Pfeiltasten oder A/D zum Lenken, W schneller, S langsamer, Leertaste landen.
Auf Tablet/Handy: ◀ ▶ gedrückt halten, 🚀 schneller, Landen-Button antippen.

Unterschiede zu EuropaFlug:
- Die Welt hat keinen Rand nach Osten und Westen: Man kann rund um die Erde fliegen (z. B. über den Pazifik).
- Das nächste Ziel ist immer eines der sechs nächstgelegenen Länder, damit die Flüge kurz bleiben.
  „🎲 Anderes Ziel“ wählt ein beliebiges Land irgendwo auf der Welt.
- Liegen mehrere Hauptstädte dicht beieinander, hat beim Landen das Ziel-Land Vorrang.
- Unter dem Ziel stehen der Kontinent und die Entfernung in Kilometern (auf der Erdkugel gemessen).
- Kann eine Flagge nicht geladen werden, wird die Flaggen-Frage übersprungen.

Hinweise zu den Inhalten:
- Länder: die 193 UN-Mitgliedsstaaten. Nicht dabei sind deshalb z. B. Vatikanstadt und Palästina
  (Beobachter bei der UN), Kosovo und Taiwan. Solche Gebiete und abhängige Gebiete (z. B. Grönland)
  sind auf der Karte hellgrau und haben kein Ziel.
- Grenzen nach Sicht der UN: Die Krim gehört zur Ukraine, Nordzypern zu Zypern, Somaliland zu Somalia.
- Hauptstädte bei Ländern mit mehreren: Bolivien = Sucre, Südafrika = Pretoria, Sri Lanka =
  Sri Jayewardenepura Kotte, Burundi = Gitega, Tansania = Dodoma, Elfenbeinküste = Yamoussoukro,
  Niederlande = Amsterdam. Nauru hat offiziell keine Hauptstadt, hier steht der Regierungssitz Yaren.
- Einwohnerzahlen sind gerundete Schätzungen (Stand etwa 2024).
- Die Pins von Kinshasa und Brazzaville sind leicht auseinandergerückt, damit man sie unterscheiden kann.
- Bahamas, Kiribati und Tuvalu sind für die Karte zu klein – dort ist eine kleine Insel eingezeichnet.
- Flaggen, die fast gleich aussehen (Indonesien/Monaco, Tschad/Rumänien, Niederlande/Luxemburg),
  stehen nie zusammen zur Auswahl.

Technik und Quellen:
- Grenzen: [Natural Earth](https://www.naturalearthdata.com/) 1:50 Mio. (gemeinfrei), über das npm-Paket
  `world-atlas@2.0.2`, mit `mapshaper` vereinfacht und direkt in `index.html` eingebettet.
  Die Karte wird als Flächen (Dreiecke) gezeichnet und dreimal nebeneinander gelegt.
- Flaggen: `flag-icons@7.6.0` (MIT-Lizenz), lokal in `assets/vendor/flag-icons-7.6.0/` – nur die 193 benötigten.
- Three.js wird aus `assets/vendor/` geladen, das Spiel braucht keine fremden Server.
