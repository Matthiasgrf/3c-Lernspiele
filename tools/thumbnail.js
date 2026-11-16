#!/usr/bin/env node
/* Erstellt games/<ordner>/thumbnail.jpg (900×600, JPEG) als Screenshot des Spiels.

   Aufruf:  node tools/thumbnail.js <ordner> [Optionen]
     --klick "<css>"       vor dem Bild anklicken, z. B. den Start-Knopf (mehrfach möglich)
     --verstecken "<css>"  Elemente ausblenden, z. B. Knöpfe und Anzeigen (mehrfach möglich)
     --warten <ms>         Wartezeit vor dem Bild (Standard 2000)

   Beispiel: node tools/thumbnail.js elisabeth --klick "#startBtn" --verstecken ".hud, a" --warten 3000 */
const fs = require('fs');
const path = require('path');
const { chromium } = require('playwright');
const { GAMES_DIR, startServer } = require('./lib');

(async () => {
  const args = process.argv.slice(2);
  const id = args.shift();
  const clicks = [], hide = [];
  let wait = 2000;
  while (args.length) {
    const a = args.shift();
    if (a === '--klick') clicks.push(args.shift());
    else if (a === '--verstecken') hide.push(args.shift());
    else if (a === '--warten') wait = Number(args.shift()) || wait;
    else { console.log('Unbekannte Option: ' + a); process.exit(1); }
  }
  if (!id || !fs.existsSync(path.join(GAMES_DIR, id, 'index.html'))) {
    console.log('Aufruf: node tools/thumbnail.js <ordner> [--klick "<css>"] [--verstecken "<css>"] [--warten <ms>]');
    process.exit(1);
  }

  const { server, url } = await startServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 900, height: 600 } });
  await page.goto(url + 'games/' + id + '/', { waitUntil: 'load' });
  await page.waitForTimeout(1000);
  for (const sel of clicks) { await page.click(sel); await page.waitForTimeout(500); }
  await page.waitForTimeout(wait);
  if (hide.length) await page.addStyleTag({ content: hide.join(',') + '{visibility:hidden!important}' });
  const file = path.join(GAMES_DIR, id, 'thumbnail.jpg');
  await page.screenshot({ path: file, type: 'jpeg', quality: 82 });
  await browser.close();
  server.close();
  console.log('✓ ' + path.relative(process.cwd(), file) + ' (' + Math.round(fs.statSync(file).size / 1024) + ' KB) – bitte ansehen.');
})();
