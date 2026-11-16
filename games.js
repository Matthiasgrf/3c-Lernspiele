/* Liste aller Spiele auf der Startseite.
   Neues Spiel: Ordner unter games/<id>/ anlegen (mit index.html + thumbnail.jpg)
   und hier einen Eintrag am Ende ergänzen. */
window.GAMES = [
  {
    id: "europaflug",
    title: "EuropaFlug",
    description: "Fliege über Europa und lerne Länder, Hauptstädte, Flaggen und Sehenswürdigkeiten.",
    age: "8–10 Jahre",
    path: "games/europaflug/",
    thumbnail: "games/europaflug/thumbnail.jpg"
  },
  {
    id: "elisabeth",
    title: "Elisabeth von Thüringen",
    description: "Begleite Elisabeth durch ihr Leben und beantworte an 12 Stationen Fragen für den Religionsunterricht.",
    age: "3. Klasse",
    path: "games/elisabeth/",
    thumbnail: "games/elisabeth/thumbnail.jpg"
  },
  {
    id: "Sachunterricht-Getreide",
    title: "Getreide-Abenteuer",
    description: "Fahre mit dem Traktor über das Feld und löse an 10 Stationen Aufgaben rund ums Getreide.",
    age: "3. Klasse · Sachunterricht",
    path: "games/Sachunterricht-Getreide/",
    thumbnail: "games/Sachunterricht-Getreide/thumbnail.jpg"
  }
];
