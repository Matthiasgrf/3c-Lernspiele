#!/usr/bin/env node
/* Öffnet die Startseite und jedes Spiel im Browser (Computer- und Handy-Größe) und meldet:
   JavaScript-Fehler, fehlende Dateien, Zugriffe auf fremde Server, fehlenden Link „Alle Spiele“.
   Screenshots landen in test-ergebnisse/ zum Ansehen.

   Aufruf:  node tools/smoke.js              Startseite und alle Spiele (mehrere gleichzeitig)
            node tools/smoke.js elisabeth    nur ein Spiel (Ordnername, auch mehrere möglich)
            --parallel <n>                   höchstens n Seiten gleichzeitig

   Der Test spielt die Spiele nicht durch – Spielablauf und End-Bildschirm weiter von Hand prüfen. */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { ROOT, loadGames, startServer, parallel, parallelLimit } = require('./lib');

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
  /* Knöpfe und Texte, die rechts aus dem Bildschirm ragen, sind auf dem Handy nicht erreichbar. */
  const cut = await page.evaluate(() => {
    const w = window.innerWidth;
    return [...document.querySelectorAll('a, button, input, select')].filter(e => {
      const r = e.getBoundingClientRect(), st = getComputedStyle(e);
      return r.width > 0 && r.height > 0 && st.visibility !== 'hidden' &&
        r.left < w && r.right > 0 && (r.right > w + 2 || r.left < -2);   /* angeschnitten, nicht ganz versteckt */
    }).slice(0, 3).map(e => (e.id ? '#' + e.id : e.tagName.toLowerCase()) + ' „' + (e.textContent || '').trim().slice(0, 25) + '“');
  });
  if (cut.length) problems.push('Ragt seitlich aus dem Bildschirm: ' + cut.join(', '));
}

(async () => {
  const args = process.argv.slice(2);
  const limit = parallelLimit(args);
  let games = loadGames();
  const visibleCount = games.filter(g => !g.hidden).length;
  if (args.length) {
    const unknown = args.filter(id => !games.some(g => g.id === id));
    if (unknown.length) { console.log('✗ Kein Spiel mit der id "' + unknown.join('", "') + '" in games.js.'); process.exit(1); }
    games = games.filter(g => args.includes(g.id));
  }
  fs.mkdirSync(OUT, { recursive: true });
  const { server, url } = await startServer();
  const browser = await chromium.launch();

  const jobs = [];
  for (const size of SIZES) {
    if (!args.length) jobs.push({ label: 'Startseite (' + size.name + ')', rel: '', size, shot: 'startseite', check: (p, pr) => checkHome(p, pr, visibleCount) });
    for (const g of games) jobs.push({ label: g.id + ' (' + size.name + ')', rel: g.path || 'games/' + g.id + '/', size, shot: g.id, check: checkGame });
  }
  const results = await parallel(jobs, limit, j => visit(browser, url, j.rel, j.size, j.shot, j.check));

  let failed = 0;
  jobs.forEach((j, i) => {
    const problems = results[i];
    console.log((problems.length ? '✗ ' : '✓ ') + j.label);
    problems.forEach(p => console.log('    ' + p));
    if (problems.length) failed++;
  });

  await browser.close();
  server.close();
  console.log(failed ? '✗ ' + failed + ' Seiten mit Problemen.' : '✓ Alles in Ordnung. Screenshots: test-ergebnisse/');
  process.exit(failed ? 1 : 0);
})();
