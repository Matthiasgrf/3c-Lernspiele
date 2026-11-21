#!/usr/bin/env node
/* Spielt Spiele automatisch durch – mehr als tools/smoke.js, das nur den Start-Bildschirm öffnet.
   Für jedes Spiel kann es eine Datei tools/spieltests/<ordner>.js geben. Sie exportiert eine Funktion,
   die das Spiel im Browser bedient und mit t.check(...) meldet, was stimmt und was nicht.

   Aufruf:  node tools/spieltest.js               alle Spiele mit Testdatei (mehrere gleichzeitig)
            node tools/spieltest.js mathe-robi    nur ein Spiel (Ordnername, auch mehrere möglich)
            --parallel <n>                        höchstens n Spiele gleichzeitig (1 = nacheinander)

   Helfer für die Testdatei (Parameter t):
     t.url                       Adresse des Spiels, z. B. http://127.0.0.1:1234/games/mathe-robi/
     t.newPage(optionen)         neue Browser-Seite (Optionen wie bei Playwright: viewport, isMobile, hasTouch);
                                 JavaScript-Fehler auf der Seite zählen automatisch als Fehler
     t.check(text, ok, detail)   eine Prüfung melden
     t.shot(page, name)          Screenshot nach test-ergebnisse/<ordner>-<name>.png */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { ROOT, startServer, parallel, parallelLimit } = require('./lib');

const DIR = path.join(__dirname, 'spieltests');
const OUT = path.join(ROOT, 'test-ergebnisse');

async function runTest(browser, url, id) {
  const lines = [], contexts = [], errors = [];
  let failed = 0;
  const check = (text, ok, detail) => {
    lines.push('  ' + (ok ? '✓ ' : '✗ ') + text + (detail !== undefined && detail !== '' ? '  (' + detail + ')' : ''));
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
  const started = Date.now();
  try {
    await require(path.join(DIR, id + '.js'))(t);
  } catch (e) {
    check('Test läuft bis zum Ende', false, e.message.split('\n')[0]);
  }
  check('keine JavaScript-Fehler', errors.length === 0, [...new Set(errors)].join(' | '));
  for (const c of contexts) await c.close().catch(() => {});
  /* Ausgabe erst am Ende, damit sich gleichzeitig laufende Spiele nicht vermischen. */
  console.log((failed ? '✗ ' : '✓ ') + id + '  (' + Math.round((Date.now() - started) / 1000) + ' s)\n' + lines.join('\n'));
  return failed;
}

(async () => {
  const args = process.argv.slice(2);
  const limit = parallelLimit(args);
  const all = fs.readdirSync(DIR).filter(f => f.endsWith('.js')).map(f => f.slice(0, -3));
  const ids = args.length ? all.filter(id => args.includes(id)) : all;
  if (!ids.length) {
    console.log(args.length ? '! Für "' + args.join(', ') + '" gibt es keinen Durchspiel-Test (tools/spieltests/<ordner>.js).' : '! Keine Durchspiel-Tests vorhanden.');
    process.exit(0);
  }
  fs.mkdirSync(OUT, { recursive: true });
  const { server, url } = await startServer();
  const browser = await chromium.launch();
  const failed = (await parallel(ids, limit, id => runTest(browser, url, id))).reduce((a, b) => a + b, 0);

  await browser.close();
  server.close();
  console.log(failed ? '✗ ' + failed + ' Prüfungen fehlgeschlagen.' : '✓ Alles in Ordnung. Screenshots: test-ergebnisse/');
  process.exit(failed ? 1 : 0);
})();
