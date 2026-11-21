#!/usr/bin/env node
/* Legt ein neues Spiel an: Ordner, fehlende Dateien aus tools/vorlage/ und den Eintrag in games.js.
   Vorhandene Dateien (z. B. eine hochgeladene index.html) werden nicht überschrieben.

   Aufruf:  node tools/neues-spiel.js <ordner> "<Titel>" ["<Fach>"] ["<Klasse>"] [--beschreibung "<ein Satz>"]
   Beispiel: node tools/neues-spiel.js mathe-einmaleins "Einmaleins-Rakete" "Mathe" "3. Klasse"

   - Liegt schon eine index.html im Ordner (hochgeladenes Spiel), wird sie mit tools/anpassen.js an die
     technischen Regeln angepasst (Zoom-Schutz, lang="de", Three.js lokal …); der Inhalt bleibt gleich.
   - Kommt die index.html aus der Vorlage, entsteht auch ein fertiger Durchspiel-Test
     tools/spieltests/<ordner>.js, der bei jedem Push mitläuft.
   - Das Fach wird mit den vorhandenen Fächern abgeglichen, damit kein zweiter Filter-Knopf entsteht. */
const fs = require('fs');
const path = require('path');
const { GAMES_DIR, GAMES_JS, loadGames } = require('./lib');
const { anpassen } = require('./anpassen');

const args = process.argv.slice(2);
let description = 'TODO: ein Satz, worum es im Spiel geht.';
const d = args.indexOf('--beschreibung');
if (d >= 0) { description = args[d + 1] || description; args.splice(d, 2); }
const [id, title, subjectArg = 'Sachunterricht', age = '3. Klasse'] = args;
if (!id || !title) {
  console.log('Aufruf: node tools/neues-spiel.js <ordner> "<Titel>" ["<Fach>"] ["<Klasse>"] [--beschreibung "<ein Satz>"]');
  process.exit(1);
}
if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(id)) {
  console.log('✗ Der Ordnername darf nur Buchstaben (ohne Umlaute), Ziffern, - und _ enthalten.');
  process.exit(1);
}

const games = loadGames();
const clash = games.find(g => g.id !== id && g.id.toLowerCase() === id.toLowerCase());
if (clash) {
  console.log('✗ Es gibt schon ein Spiel "' + clash.id + '" – Ordnernamen dürfen sich nicht nur in der Groß-/Kleinschreibung unterscheiden.');
  process.exit(1);
}

/* Fach: vorhandene Schreibweise übernehmen (z. B. "mathe" oder "Mathematik" → "Mathe"). */
const subjects = [...new Set(games.map(g => g.subject).filter(Boolean))];
const norm = s => s.toLowerCase().replace(/[^a-zäöüß]/g, '');
let subject = subjectArg;
const SAME = [['sachunterricht', 'sachkunde', 'hsu', 'su'], ['mathe', 'mathematik', 'rechnen'], ['erdkunde', 'geographie', 'geografie'],
  ['religion', 'reli', 'evangelischereligion', 'katholischereligion'], ['deutsch', 'sprache', 'lesen', 'rechtschreibung']];
const group = SAME.find(list => list.includes(norm(subjectArg)));
const known = subjects.find(s => norm(s) === norm(subjectArg)) ||
  (group && subjects.find(s => group.includes(norm(s)))) ||
  subjects.find(s => norm(s).length >= 4 && (norm(subjectArg).startsWith(norm(s)) || norm(s).startsWith(norm(subjectArg))));
if (known && known !== subjectArg) {
  console.log('  Fach:    "' + subjectArg + '" → "' + known + '" (vorhandene Schreibweise, sonst gäbe es zwei Filter-Knöpfe)');
  subject = known;
} else if (!known) {
  console.log('  Fach:    "' + subject + '" ist neu – vorhandene Fächer: ' + subjects.join(', '));
}

const dir = path.join(GAMES_DIR, id);
const template = path.join(__dirname, 'vorlage');
const storageKey = id.toLowerCase().replace(/[^a-z0-9]+/g, '_') + '_v1';
const fill = text => text
  .split('SPIEL_SCHLUESSEL').join(storageKey)
  .split('SPIEL_TITEL').join(title)
  .split('SPIEL_ORDNER').join(id)
  .split('SPIEL_FACH').join(subject)
  .split('SPIEL_KLASSE').join(age);
fs.mkdirSync(dir, { recursive: true });

const uploaded = fs.existsSync(path.join(dir, 'index.html'));
fs.readdirSync(template).filter(name => name !== 'spieltest.js').forEach(name => {
  const target = path.join(dir, name);
  if (fs.existsSync(target)) { console.log('  bleibt:  games/' + id + '/' + name); return; }
  fs.writeFileSync(target, fill(fs.readFileSync(path.join(template, name), 'utf8')));
  console.log('  neu:     games/' + id + '/' + name);
});

if (uploaded) {
  /* Hochgeladenes Spiel: technische Regeln einbauen, Inhalt unverändert lassen. */
  const file = path.join(dir, 'index.html');
  const before = fs.readFileSync(file, 'utf8');
  const r = anpassen(before);
  if (r.html !== before) fs.writeFileSync(file, r.html);
  r.changes.forEach(c => console.log('  angepasst: ' + c));
  r.todo.forEach(t => console.log('  ! von Hand: ' + t));
} else {
  const testFile = path.join(__dirname, 'spieltests', id + '.js');
  if (!fs.existsSync(testFile)) {
    fs.writeFileSync(testFile, fill(fs.readFileSync(path.join(template, 'spieltest.js'), 'utf8')));
    console.log('  neu:     tools/spieltests/' + id + '.js (Durchspiel-Test für das Quiz-Gerüst)');
  }
}

if (games.some(g => g.id === id)) {
  console.log('  bleibt:  Eintrag in games.js');
} else {
  const q = s => JSON.stringify(s);
  const entry = '  {\n    id: ' + q(id) + ',\n    title: ' + q(title) +
    ',\n    description: ' + q(description) + ',\n    age: ' + q(age) +
    ',\n    subject: ' + q(subject) + '\n  }\n];';
  const src = fs.readFileSync(GAMES_JS, 'utf8');
  const end = src.lastIndexOf('];');
  const head = src.slice(0, end).replace(/\s*$/, '');
  fs.writeFileSync(GAMES_JS, head + (head.endsWith('[') ? '\n' : ',\n') + entry + src.slice(end + 2));
  console.log('  neu:     Eintrag in games.js' + (/TODO/.test(description) ? ' (Beschreibung noch ausfüllen)' : ''));
}

console.log('\nNächste Schritte:\n' +
  (uploaded ? '  1. Punkte „von Hand“ oben erledigen, readme.md ausfüllen\n'
    : '  1. Fragen und Texte in games/' + id + '/index.html (alle „TODO“), readme.md ausfüllen\n') +
  '  2. Vorschaubild:  node tools/thumbnail.js ' + id + (uploaded ? ' --klick "<Start-Knopf>"' : ' --klick "#startBtn" --verstecken ".bar"') + '\n' +
  '  3. Alles prüfen:  node tools/pruefen.js ' + id);
