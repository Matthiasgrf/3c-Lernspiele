#!/usr/bin/env node
/* Alle Prüfungen in einem Durchgang: check.js, smoke.js und spieltest.js – wie bei „Spiele prüfen“ auf GitHub.

   Aufruf:  node tools/pruefen.js               alles (Startseite und alle Spiele)
            node tools/pruefen.js <ordner> …    nur diese Spiele (check.js prüft immer alles, ist schnell)

   Am Ende steht eine Liste der Screenshots, die man sich ansehen sollte. */
const { spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const { ROOT } = require('./lib');

const ids = process.argv.slice(2);
const steps = [
  ['Regeln', 'check.js', []],
  ['Browser-Test', 'smoke.js', ids],
  ['Durchspiel-Test', 'spieltest.js', ids]
];

const results = [];
const started = Date.now();
for (const [name, script, args] of steps) {
  console.log('\n━━ ' + name + ' (' + ['node tools/' + script].concat(args).join(' ') + ')');
  const t0 = Date.now();
  const r = spawnSync(process.execPath, [path.join(__dirname, script)].concat(args), { stdio: 'inherit', cwd: ROOT });
  results.push({ name, ok: r.status === 0, s: Math.round((Date.now() - t0) / 1000) });
  if (name === 'Regeln' && r.status !== 0) { console.log('\nErst die Regel-Fehler beheben, dann laufen die Browser-Tests.'); break; }
}

console.log('\n━━ Ergebnis (' + Math.round((Date.now() - started) / 1000) + ' s)');
results.forEach(r => console.log('  ' + (r.ok ? '✓ ' : '✗ ') + r.name + '  (' + r.s + ' s)'));
const out = path.join(ROOT, 'test-ergebnisse');
if (fs.existsSync(out)) {
  const shots = fs.readdirSync(out).filter(f => f.endsWith('.png') && fs.statSync(path.join(out, f)).mtimeMs >= started);   /* nur von diesem Lauf */
  if (shots.length) console.log('\nScreenshots zum Ansehen (test-ergebnisse/):\n  ' + shots.sort().join('\n  '));
}
const untested = ids.filter(id => !fs.existsSync(path.join(__dirname, 'spieltests', id + '.js')));
if (untested.length) console.log('\n! Ohne Durchspiel-Test: ' + untested.join(', ') + ' – Spielablauf und End-Bildschirm von Hand mit Playwright prüfen.');
process.exit(results.every(r => r.ok) && results.length === steps.length ? 0 : 1);
