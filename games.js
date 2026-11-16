/* Liste aller Spiele auf der Startseite – die Reihenfolge hier ist die Reihenfolge der Kacheln.

   Neues Spiel: Ordner games/<id>/ anlegen (index.html, thumbnail.jpg, readme.md)
   und hier am Ende einen Eintrag ergänzen. Danach prüfen:  node tools/check.js

   Pflichtfelder
     id           Ordnername unter games/ (genau gleich geschrieben)
     title        Name des Spiels
     description  ein Satz für die Kachel
     age          Klasse oder Alter, z. B. "3. Klasse"
     subject      Fach, z. B. "Sachunterricht" – daraus entstehen die Filter-Knöpfe der Startseite

   Optional
     hidden: true   Spiel bleibt im Ordner, erscheint aber nicht auf der Startseite
     path           anderer Link als games/<id>/
     thumbnail      anderes Bild als games/<id>/thumbnail.jpg */
window.GAMES = [
  {
    id: "europaflug",
    title: "EuropaFlug",
    description: "Fliege über Europa und lerne Länder, Hauptstädte, Flaggen und Sehenswürdigkeiten.",
    age: "8–10 Jahre",
    subject: "Sachunterricht"
  },
  {
    id: "elisabeth",
    title: "Elisabeth von Thüringen",
    description: "Begleite Elisabeth durch ihr Leben und beantworte an 12 Stationen Fragen für den Religionsunterricht.",
    age: "3. Klasse",
    subject: "Religion"
  },
  {
    id: "Sachunterricht-Getreide",
    title: "Getreide-Abenteuer",
    description: "Fahre mit dem Traktor über das Feld und löse an 10 Stationen Aufgaben rund ums Getreide.",
    age: "3. Klasse",
    subject: "Sachunterricht"
  },
  {
    id: "deutschlandflug",
    title: "DeutschlandFlug",
    description: "Fliege über Deutschland zu den 16 Bundesländern und lerne ihre Flaggen und Hauptstädte.",
    age: "3. Klasse",
    subject: "Sachunterricht"
  }
];
