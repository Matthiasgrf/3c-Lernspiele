#!/usr/bin/env node
/* Legt ein neues Spiel an: Ordner, fehlende Dateien aus tools/vorlage/ und den Eintrag in games.js.
   Vorhandene Dateien (z. B. eine hochgeladene index.html) werden nicht überschrieben.

   Aufruf:  node tools/neues-spiel.js <ordner> "<Titel>" ["<Fach>"] ["<Klasse>"]
   Beispiel: node tools/neues-spiel.js mathe-einmaleins "Einmaleins-Rakete" "Mathe" "3. Klasse" */
const fs = require('fs');
const path = require('path');
const { GAMES_DIR, GAMES_JS, loadGames } = require('./lib');

const [id, title, subject = 'Sachunterricht', age = '3. Klasse'] = process.argv.slice(2);
if (!id || !title) {
  console.log('Aufruf: node tools/neues-spiel.js <ordner> "<Titel>" ["<Fach>"] ["<Klasse>"]');
  process.exit(1);
}
if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id)) {
  console.log('✗ Der Ordnername darf nur Buchstaben (ohne Umlaute), Ziffern, - und _ enthalten.');
  process.exit(1);
}

const dir = path.join(GAMES_DIR, id);
const template = path.join(__dirname, 'vorlage');
const storageKey = id.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_v1';
fs.mkdirSync(dir, { recursive: true });

fs.readdirSync(template).forEach(name => {
  const target = path.join(dir, name);
  if (fs.existsSync(target)) { console.log('  bleibt:  games/' + id + '/' + name); return; }
  const text = fs.readFileSync(path.join(template, name), 'utf8')
    .split('SPIEL_SCHLUESSEL').join(storageKey)
    .split('SPIEL_TITEL').join(title)
    .split('SPIEL_FACH').join(subject)
    .split('SPIEL_KLASSE').join(age);
  fs.writeFileSync(target, text);
  console.log('  neu:     games/' + id + '/' + name);
});

if (loadGames().some(g => g.id === id)) {
  console.log('  bleibt:  Eintrag in games.js');
} else {
  const q = s => JSON.stringify(s);
  const entry = '  {\n    id: ' + q(id) + ',\n    title: ' + q(title) +
    ',\n    description: "TODO: ein Satz, worum es im Spiel geht.",\n    age: ' + q(age) +
    ',\n    subject: ' + q(subject) + '\n  }\n];';
  const src = fs.readFileSync(GAMES_JS, 'utf8');
  const end = src.lastIndexOf('];');
  const head = src.slice(0, end).replace(/\s*$/, '');
  fs.writeFileSync(GAMES_JS, head + (head.endsWith('[') ? '\n' : ',\n') + entry + src.slice(end + 2));
  console.log('  neu:     Eintrag in games.js (Beschreibung noch ausfüllen)');
}

console.log('\nNächste Schritte:\n' +
  '  1. Spiel und readme.md in games/' + id + '/ fertig machen\n' +
  '  2. Vorschaubild:  node tools/thumbnail.js ' + id + '\n' +
  '  3. Prüfen:        node tools/check.js  und  node tools/smoke.js ' + id);
