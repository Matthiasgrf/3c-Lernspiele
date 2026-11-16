#!/usr/bin/env node
/* Spielt Spiele automatisch durch – mehr als tools/smoke.js, das nur den Start-Bildschirm öffnet.
   Für jedes Spiel kann es eine Datei tools/spieltests/<ordner>.js geben. Sie exportiert eine Funktion,
   die das Spiel im Browser bedient und mit t.check(...) meldet, was stimmt und was nicht.

   Aufruf:  node tools/spieltest.js               alle Spiele mit Testdatei
            node tools/spieltest.js mathe-robi    nur ein Spiel (Ordnername)

   Helfer für die Testdatei (Parameter t):
     t.url                       Adresse des Spiels, z. B. http://127.0.0.1:1234/games/mathe-robi/
     t.newPage(optionen)         neue Browser-Seite (Optionen wie bei Playwright: viewport, isMobile, hasTouch);
                                 JavaScript-Fehler auf der Seite zählen automatisch als Fehler
     t.check(text, ok, detail)   eine Prüfung melden
     t.shot(page, name)          Screenshot nach test-ergebnisse/<ordner>-<name>.png */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { ROOT, startServer } = require('./lib');

const DIR = path.join(__dirname, 'spieltests');
const OUT = path.join(ROOT, 'test-ergebnisse');

(async () => {
  const only = process.argv[2];
  const ids = fs.readdirSync(DIR).filter(f => f.endsWith('.js')).map(f => f.slice(0, -3)).filter(id => !only || id === only);
  if (!ids.length) {
    console.log(only ? '! Für "' + only + '" gibt es keinen Durchspiel-Test (tools/spieltests/' + only + '.js).' : '! Keine Durchspiel-Tests vorhanden.');
    process.exit(0);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const { server, url } = await startServer();
  const browser = await chromium.launch();
  let failed = 0;

  for (const id of ids) {
    console.log(id);
    const contexts = [], errors = [];
    const check = (text, ok, detail) => {
      console.log('  ' + (ok ? '✓ ' : '✗ ') + text + (detail !== undefined && detail !== '' ? '  (' + detail + ')' : ''));
      if (!ok) failed++;
    };
    const t = {
      url: url + 'games/' + id + '/',
      check,
      async newPage(options) {
        const context = await browser.newContext(options || {});
        contexts.push(context);
        const page = await context.newPage();
        page.on('pageerror', e => errors.push(e.message));
        page.on('console', m => { if (m.type() === 'error') errors.push('Konsole: ' + m.text()); });
        return page;
      },
      shot: (page, name) => page.screenshot({ path: path.join(OUT, id + '-' + name + '.png') })
    };
    try {
      await require(path.join(DIR, id + '.js'))(t);
    } catch (e) {
      check('Test läuft bis zum Ende', false, e.message.split('\n')[0]);
    }
    check('keine JavaScript-Fehler', errors.length === 0, [...new Set(errors)].join(' | '));
    for (const c of contexts) await c.close();
  }

  await browser.close();
  server.close();
  console.log(failed ? '✗ ' + failed + ' Prüfungen fehlgeschlagen.' : '✓ Alles in Ordnung. Screenshots: test-ergebnisse/');
  process.exit(failed ? 1 : 0);
})();
