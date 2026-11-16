#!/usr/bin/env node
/* Öffnet die Startseite und jedes Spiel im Browser (Computer- und Handy-Größe) und meldet:
   JavaScript-Fehler, fehlende Dateien, Zugriffe auf fremde Server, fehlenden Link „Alle Spiele“.
   Screenshots landen in test-ergebnisse/ zum Ansehen.

   Aufruf:  node tools/smoke.js              alle Spiele
            node tools/smoke.js elisabeth    nur ein Spiel (Ordnername)

   Der Test spielt die Spiele nicht durch – Spielablauf und End-Bildschirm weiter von Hand prüfen. */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { ROOT, loadGames, startServer } = require('./lib');

const OUT = path.join(ROOT, 'test-ergebnisse');
const SIZES = [
  { name: 'computer', viewport: { width: 1280, height: 800 } },
  { name: 'handy', viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true }
];

async function visit(browser, base, rel, size, shot, check) {
  const problems = [];
  const context = await browser.newContext({ viewport: size.viewport, isMobile: !!size.isMobile, hasTouch: !!size.hasTouch });
  const page = await context.newPage();
  page.on('pageerror', e => problems.push('JavaScript-Fehler: ' + e.message));
  page.on('console', m => { if (m.type() === 'error') problems.push('Konsole: ' + m.text()); });
  page.on('response', r => { if (r.status() >= 400) problems.push('HTTP ' + r.status() + ': ' + r.url().replace(base, '')); });
  /* Fremde Server werden gesperrt und gemeldet – so fällt auf, wenn ein Spiel sie braucht. */
  await context.route(u => !u.href.startsWith(base) && /^https?:/.test(u.protocol), route => {
    problems.push('Zugriff auf fremden Server: ' + route.request().url());
    return route.abort();
  });
  try {
    await page.goto(base + rel, { waitUntil: 'load', timeout: 30000 });
    await page.waitForTimeout(1500);
    if (check) await check(page, problems);
    await page.screenshot({ path: path.join(OUT, shot + '-' + size.name + '.png') });
  } catch (e) {
    problems.push('Seite lässt sich nicht öffnen: ' + e.message.split('\n')[0]);
  }
  await context.close();
  return [...new Set(problems)];
}

async function checkHome(page, problems, expected) {
  const tiles = await page.locator('.tile').count();
  if (tiles !== expected) problems.push(tiles + ' Kacheln sichtbar, erwartet ' + expected + '.');
  await page.evaluate(() => Promise.all([...document.images].map(i => { i.loading = 'eager'; return i.decode().catch(() => {}); })));
  const broken = await page.evaluate(() => [...document.images].filter(i => !i.naturalWidth).map(i => i.getAttribute('src')));
  broken.forEach(src => problems.push('Vorschaubild lädt nicht: ' + src));
  const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  if (overflow) problems.push('Seite ist breiter als der Bildschirm (waagerechtes Scrollen).');
}

async function checkGame(page, problems) {
  const links = page.locator('a[href="../../"]');
  const n = await links.count();
  let visible = false;
  for (let i = 0; i < n; i++) if (await links.nth(i).isVisible()) visible = true;
  if (!visible) problems.push('Auf dem Start-Bildschirm ist kein Link „🏠 Alle Spiele“ (href="../../") sichtbar.');
}

(async () => {
  const only = process.argv[2];
  let games = loadGames();
  const visibleCount = games.filter(g => !g.hidden).length;
  if (only) {
    games = games.filter(g => g.id === only);
    if (!games.length) { console.log('✗ Kein Spiel mit der id "' + only + '" in games.js.'); process.exit(1); }
  }
  fs.mkdirSync(OUT, { recursive: true });
  const { server, url } = await startServer();
  const browser = await chromium.launch();
  let failed = 0;

  const report = (label, problems) => {
    console.log((problems.length ? '✗ ' : '✓ ') + label);
    problems.forEach(p => console.log('    ' + p));
    if (problems.length) failed++;
  };

  for (const size of SIZES) {
    if (!only) report('Startseite (' + size.name + ')', await visit(browser, url, '', size, 'startseite', (p, pr) => checkHome(p, pr, visibleCount)));
    for (const g of games) {
      const rel = g.path || 'games/' + g.id + '/';
      report(g.id + ' (' + size.name + ')', await visit(browser, url, rel, size, g.id, checkGame));
    }
  }

  await browser.close();
  server.close();
  console.log(failed ? '✗ ' + failed + ' Seiten mit Problemen.' : '✓ Alles in Ordnung. Screenshots: test-ergebnisse/');
  process.exit(failed ? 1 : 0);
})();
