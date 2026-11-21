/* Durchspiel-Test für „Bauer Franz und die Getreideernte“. Aufruf: node tools/spieltest.js Sachunterricht-Getreideernte
   Das Spiel bietet mit ?test einen Zugang window.BAUER (Spielzustand, Versetzen, Eingaben, Zeitraffer). */
const SAVE = 'sachunterricht_getreideernte_v1';
const DESK = { viewport: { width: 1280, height: 800 } };
const PHONE = { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true };
const HOCH = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

module.exports = async function (t) {
  const state = page => page.evaluate(() => BAUER.state());
  const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE);
  const mode = (page, m) => page.waitForFunction(m => BAUER.state().mode === m, m, { timeout: 20000 });
  const homeVisible = async page => {
    const links = page.locator('a[href="../../"]');
    for (let i = 0; i < await links.count(); i++) if (await links.nth(i).isVisible()) return true;
    return false;
  };

  /* Zur Station laufen, bis sich das Aufgabenfenster öffnet. */
  const walkTo = async (page, i) => {
    await page.evaluate(i => {
      const s = BAUER.stations()[i], l = Math.hypot(s.x, s.z), d = s.r + 3;
      const x = s.x - s.x / l * d, z = s.z - s.z / l * d;
      BAUER.teleport(x, z, Math.atan2(s.x - x, s.z - z));
      BAUER.speed(12);
      BAUER.input({ fwd: 1 });
    }, i);
    await mode(page, 'quiz');
    await page.evaluate(() => { BAUER.input(null); BAUER.speed(1); });
  };

  /* Felder ausfüllen: schreiben (Computer) oder Wort antippen und ins Feld setzen (Tablet/Handy). */
  const fill = async page => {
    const fields = page.locator('#q-body .ans-field');
    for (let i = 0; i < await fields.count(); i++) {
      const f = fields.nth(i), answer = await f.getAttribute('data-answer');
      const tag = await f.evaluate(e => e.tagName + '.' + e.className);
      if (tag.startsWith('INPUT')) await f.fill(answer);
      else if (tag.includes('num-tap-btn')) for (let k = 0; k < Number(answer); k++) await f.click();
      else {
        await page.locator('#q-body .chip:not(.used)', { hasText: new RegExp('^' + answer + '$') }).first().click();
        await f.click();
      }
    }
  };
  const solve = async (page, i) => {
    await walkTo(page, i);
    await fill(page);
    await page.click('#check-btn');
    const ok = await page.locator('#next-btn').isVisible() && /Super/.test(await page.textContent('#feedback')) &&
      /Merke/.test(await page.textContent('#tip-box'));
    await page.click('#next-btn');
    return ok;
  };

  /* ---------- Computer: Start, Mähen, alle 10 Stationen, Gewinn-Bildschirm ---------- */
  let page = await t.newPage(DESK);
  await page.goto(t.url + '?test', { waitUntil: 'load' });
  t.check('Start-Bildschirm mit Link „Alle Spiele“', await page.locator('#startBtn').isVisible() && await homeVisible(page));
  await page.waitForTimeout(600);
  await t.shot(page, 'start');
  await page.click('#startBtn');
  await mode(page, 'play');
  t.check('Im Spiel ist der Link „Alle Spiele“ sichtbar', await page.locator('#hud a[href="../../"]').isVisible());

  let before = await state(page);
  await page.keyboard.down('ArrowUp');
  await page.waitForFunction(z => BAUER.state().z > z + 1.5, before.z, { timeout: 20000 });
  await page.keyboard.up('ArrowUp');
  t.check('Pfeiltaste: Bauer läuft vorwärts', true);

  await page.evaluate(() => { BAUER.speed(12); BAUER.input({ fwd: 1, mow: true }); });
  await page.waitForFunction(() => BAUER.state().sheaves >= 3, null, { timeout: 30000 });
  await page.evaluate(() => { BAUER.input(null); BAUER.speed(1); });
  let s = await state(page);
  t.check('Mähen: Getreide fällt und Garben bleiben auf dem Feld liegen', s.mown >= 42 && s.lying >= 3 && s.load === 0 && await page.textContent('#karre') === '0', s.mown + ' Felder, ' + s.lying + ' Garben');
  await page.waitForTimeout(300);
  await t.shot(page, 'maehen');

  /* im hohen Getreide langsamer als auf der gemähten Fläche */
  const pace = await page.evaluate(async () => {
    const run = async (x, z, rot) => {
      BAUER.teleport(x, z, rot); BAUER.input({ fwd: 1 });
      const t0 = performance.now(); await new Promise(r => setTimeout(r, 300));
      const a = BAUER.state(); await new Promise(r => setTimeout(r, 900)); const b = BAUER.state();
      BAUER.input(null);
      return Math.hypot(b.x - a.x, b.z - a.z);
    };
    const cur = BAUER.state();
    const stubble = await run(0, 2, 0);                 /* dort wurde gerade gemäht */
    const grain = await run(-5, 30, -Math.PI / 2);
    BAUER.teleport(cur.x, cur.z, cur.rot);
    return { stubble, grain };
  });
  t.check('Im hohen Getreide läuft der Bauer langsamer', pace.grain > 0 && pace.grain < pace.stubble * 0.7, pace.grain.toFixed(1) + ' statt ' + pace.stubble.toFixed(1));

  /* Blume pflücken und Tier aufscheuchen. Ein Hinweis erscheint nur beim ersten Fund einer Sorte – beim Mähen
     kann schon eine Blume oder ein Tier dabei gewesen sein. Darum eine noch neue Sorte wählen und alle Hinweise
     mitschreiben (ein Tier-Hinweis kann den Blumen-Hinweis sofort überschreiben). */
  await page.evaluate(() => {
    window.__hinweise = [];
    new MutationObserver(recs => recs.forEach(r => r.addedNodes.forEach(n => __hinweise.push(n.textContent))))
      .observe(document.getElementById('toast'), { childList: true });
  });
  const hinweise = () => page.evaluate(() => __hinweise.join(' | '));
  const blumenVorher = (await state(page)).flowers;
  const blume = await page.evaluate(() => {
    const seen = BAUER.state().seen, f = BAUER.flowers().find(f => !f.got && !seen[f.kind]);
    if (f) BAUER.teleport(f.x, f.z - 0.5, 0);
    return f ? f.kind : null;
  });
  if (blume) await page.waitForFunction(n => BAUER.state().flowers > n, blumenVorher, { timeout: 10000 });
  t.check('Blume gepflückt, Zähler und Hinweis erscheinen', !!blume && Number(await page.textContent('#blumen')) > blumenVorher &&
    (blume === 'mohn' ? /Klatschmohn/ : /Kornblume/).test(await hinweise()), blume || 'keine neue Blumensorte übrig');
  const tier = await page.evaluate(() => {
    const seen = BAUER.state().seen, a = BAUER.animals().find(a => a.state === 'hide' && !seen[a.kind]);
    if (a) BAUER.teleport(a.x, a.z - 1, 0);
    return a ? a.kind : null;
  });
  if (tier) await page.waitForFunction(k => BAUER.state().seen[k], tier, { timeout: 10000 });
  t.check('Tier huscht weg, Hinweis erscheint', !!tier && new RegExp('Feld' + tier).test(await hinweise()), tier || 'keine neue Tierart übrig');

  /* Schubkarren: Bei 6 liegenden Garben mäht die Sense nicht weiter */
  await page.evaluate(() => { BAUER.teleport(-6, 10, 0); BAUER.speed(12); BAUER.input({ fwd: 1, mow: true }); });
  await page.waitForFunction(() => BAUER.state().lying >= 6, null, { timeout: 30000 });
  await page.waitForTimeout(400);
  const mownFull = (await state(page)).mown;
  await page.waitForTimeout(800);
  await page.evaluate(() => { BAUER.input(null); BAUER.speed(1); });
  s = await state(page);
  t.check('Bei 6 liegenden Garben wird nicht weiter gemäht, Hinweis auf den Schubkarren', s.mown === mownFull && s.lying === 6 &&
    /Schubkarren/.test(await page.textContent('#toast')) && /Schubkarren holen/.test(await page.textContent('#compass-text')), s.mown + ' / ' + mownFull);

  /* zum Schubkarren laufen: Bauer fasst ihn an */
  await page.evaluate(() => { const c = BAUER.cart(); BAUER.teleport(c.x - Math.sin(c.rot) * 3.6, c.z - Math.cos(c.rot) * 3.6, c.rot); BAUER.input({ fwd: 1 }); });
  await page.waitForFunction(() => BAUER.state().held, null, { timeout: 10000 });
  await page.evaluate(() => BAUER.input(null));
  t.check('Zum Schubkarren laufen: Bauer schiebt ihn', /schiebst den Schubkarren/.test(await page.textContent('#toast')));

  /* Garben einsammeln, bis der Schubkarren voll ist */
  for (const p of await page.evaluate(() => BAUER.lying())) {
    await page.evaluate(p => BAUER.teleport(p.x, p.z - 1.75, 0), p);
    await page.waitForTimeout(120);
  }
  await page.waitForFunction(() => BAUER.state().flying === 0, null, { timeout: 10000 });
  s = await state(page);
  t.check('Garben landen im Schubkarren, voll bei 6', s.load === 6 && s.lying === 0 && await page.textContent('#karre') === '6' &&
    /voll/.test(await page.textContent('#toast')) && /Bauernhof/.test(await page.textContent('#compass-text')), JSON.stringify({ load: s.load, lying: s.lying }));
  await t.shot(page, 'schubkarren');

  /* zum Bauernhof fahren und leeren */
  await page.evaluate(() => {
    const f = BAUER.farm(), dx = f.hx - f.x, dz = f.hz - f.z, l = Math.hypot(dx, dz);
    BAUER.teleport(f.x - dx / l * 6, f.z - dz / l * 6, Math.atan2(dx, dz)); BAUER.input({ fwd: 1 });
  });
  await page.waitForFunction(() => BAUER.state().hof === 6, null, { timeout: 15000 });
  await page.evaluate(() => BAUER.input(null));
  await page.waitForFunction(() => BAUER.state().flying === 0, null, { timeout: 10000 });
  s = await state(page);
  t.check('Am Bauernhof wird der Schubkarren geleert', s.load === 0 && s.hof === 6 && await page.textContent('#garben') === '6' &&
    /6 Garben sind jetzt auf dem Hof/.test(await page.textContent('#toast')));
  await t.shot(page, 'bauernhof');

  /* Leertaste stellt den Schubkarren ab, danach wird wieder gemäht */
  await page.keyboard.press(' ');
  await page.waitForTimeout(200);
  s = await state(page);
  t.check('Leertaste stellt den Schubkarren ab', !s.held);
  await page.evaluate(() => { BAUER.teleport(24, -32, 0); BAUER.input({ mow: true }); });
  const m0 = (await state(page)).mown;
  await page.waitForFunction(m => BAUER.state().mown > m, m0, { timeout: 10000 });
  await page.evaluate(() => BAUER.input(null));
  t.check('Nach dem Abladen mäht die Sense wieder', true);

  /* Station 1: erst falsch, dann Tipp, dann schließen ohne Lösung, dann richtig */
  await walkTo(page, 0);
  t.check('Station 1 öffnet das Aufgabenfenster', /Station 1/.test(await page.textContent('#q-title')) && await page.locator('#q-body input.ans-field').count() === 3);
  await page.locator('#q-body input.ans-field').first().fill('Schale');
  await page.locator('#q-body input.ans-field').nth(1).fill('Wurzel');
  await page.click('#check-btn');
  t.check('Falsche Antwort: freundlicher Hinweis und neuer Versuch', /Fast! Du hast 1 von 3 richtig/.test(await page.textContent('#feedback')) &&
    await page.locator('#q-body .is-wrong').count() === 2 && await page.locator('#check-btn').isVisible());
  await page.click('#tip-btn');
  t.check('Tipp wird angezeigt', await page.locator('#tip-box').isVisible());
  await t.shot(page, 'aufgabe');
  await page.click('#close-btn');
  await page.waitForTimeout(500);
  s = await state(page);
  t.check('Schließen ohne Lösung: Station bleibt offen, Fenster springt nicht sofort wieder auf', s.mode === 'play' && s.solved === 0);

  const titles = [];
  for (let i = 0; i < 10; i++) {
    const ok = await solve(page, i);
    titles.push(ok ? '' : 'Station ' + (i + 1));
    if (i === 3) { s = await saved(page); t.check('Speicherstand nach 4 Stationen', s && s.solved.join('') === '1111000000', s && s.solved.join('')); }
  }
  t.check('Alle 10 Stationen lassen sich lösen (schreiben), mit Erklärung', titles.every(x => !x), titles.filter(Boolean).join(', '));
  await mode(page, 'win');
  await page.waitForTimeout(4600);
  t.check('Gewinn-Bildschirm mit „Nochmal spielen“ und „Alle Spiele“', await page.locator('#win-screen').isVisible() &&
    await page.locator('#againBtn').isVisible() && await page.locator('#win-screen a[href="../../"]').isVisible() &&
    /6 Garben auf den Hof gebracht/.test(await page.textContent('#win-stats')) && await page.textContent('#score') === '10');
  /* Sterne: Station 1 war erst falsch, die anderen 9 beim ersten Versuch richtig */
  t.check('Sterne und neuer Rekord auf dem Gewinn-Bildschirm', await page.textContent('#stars') === '9' &&
    /9 von 10 Stationen beim ersten Versuch/.test(await page.textContent('#win-stars')) && /Neuer Rekord/.test(await page.textContent('#win-rekord')),
    await page.textContent('#win-stars') + ' ' + await page.textContent('#win-rekord'));
  t.check('Rekord gespeichert', await page.evaluate(() => localStorage.getItem('sachunterricht_getreideernte_rekord')) === '9');
  await t.shot(page, 'gewonnen');

  /* Speicherstand: neu laden, weiterspielen */
  await page.reload({ waitUntil: 'load' });
  t.check('Nach dem Neuladen: Rekord und Sterne', /Rekord: 9 von 10/.test(await page.textContent('#start-rekord')) && await page.textContent('#stars') === '9');
  t.check('Nach dem Neuladen: „Weiterspielen“ und „Neu anfangen“', /Weiterspielen/.test(await page.textContent('#startBtn')) && await page.locator('#resetBtn').isVisible());
  const afterReload = await state(page);
  t.check('Gemähte Felder, Garben, Hof und Stationen bleiben erhalten', afterReload.solved === 10 && afterReload.mown >= 42 && afterReload.hof === 6 && afterReload.flowers >= 1 &&
    await page.textContent('#garben') === '6', JSON.stringify({ solved: afterReload.solved, mown: afterReload.mown, hof: afterReload.hof }));
  await page.click('#startBtn');
  await mode(page, 'win');
  await page.click('#moreBtn');
  await mode(page, 'play');
  t.check('„Weiter mähen“ führt zurück aufs Feld', true);
  await page.evaluate(() => { const s = BAUER.stations()[0]; BAUER.teleport(s.x * 0.5, s.z * 0.5, 0); });
  await page.waitForTimeout(300);
  await page.evaluate(() => BAUER.save());
  await page.reload({ waitUntil: 'load' });
  await page.click('#startBtn');
  await mode(page, 'win');
  await page.click('#againBtn');
  await page.waitForFunction(() => window.BAUER && BAUER.state().mode === 'play' && BAUER.state().solved === 0, null, { timeout: 20000 });
  s = await state(page);
  t.check('„Nochmal spielen“ beginnt von vorn', s.mown === 0 && s.sheaves === 0 && s.flowers === 0 && !/neu/.test(page.url()));
  await page.close();

  /* ---------- Kaputter Speicherstand stört nicht ---------- */
  page = await t.newPage(DESK);
  await page.addInitScript(key => localStorage.setItem(key, '{"v":1,"mown":"%%%","solved":"x","sheaves":[99999]}'), SAVE);
  await page.goto(t.url + '?test', { waitUntil: 'load' });
  await page.click('#startBtn');
  await mode(page, 'play');
  t.check('Spiel startet auch mit kaputtem Speicherstand', (await state(page)).solved === 0);
  await page.close();

  /* ---------- Handy im Querformat: Steuerknüppel, Mähen-Knopf, Wörter antippen ---------- */
  page = await t.newPage(PHONE);
  await page.goto(t.url + '?test', { waitUntil: 'load' });
  await page.click('#startBtn');
  await mode(page, 'play');
  t.check('Handy: Steuerknüppel und Mähen-Knopf sichtbar', await page.locator('#joy').isVisible() && await page.locator('#mow-btn').isVisible() && await homeVisible(page));
  before = await state(page);
  const joy = await page.locator('#joy').boundingBox(), btn = await page.locator('#mow-btn').boundingBox();
  await page.mouse.move(joy.x + joy.width / 2, joy.y + joy.height / 2);
  await page.mouse.down();
  await page.mouse.move(joy.x + joy.width / 2, joy.y + 6);
  await page.waitForFunction(z => BAUER.state().z > z + 1, before.z, { timeout: 20000 });
  await page.mouse.up();
  t.check('Handy: Steuerknüppel bewegt den Bauern', true);
  await page.mouse.move(btn.x + btn.width / 2, btn.y + btn.height / 2);
  await page.mouse.down();
  await page.waitForFunction(() => BAUER.state().mown > 0, null, { timeout: 20000 });
  await page.mouse.up();
  t.check('Handy: Mähen-Knopf mäht', true);
  await page.evaluate(() => { const c = BAUER.cart(); BAUER.teleport(c.x - Math.sin(c.rot) * 3.6, c.z - Math.cos(c.rot) * 3.6, c.rot); BAUER.input({ fwd: 1 }); });
  await page.waitForFunction(() => BAUER.state().held, null, { timeout: 10000 });
  await page.evaluate(() => BAUER.input(null));
  t.check('Handy: Beim Schieben heißt der Knopf „Abstellen“', /Abstellen/.test(await page.textContent('#mow-btn')));
  await page.waitForTimeout(400);
  await t.shot(page, 'handy-schubkarren');
  await page.locator('#mow-btn').click();
  await page.waitForTimeout(200);
  t.check('Handy: Knopf stellt den Schubkarren ab', !(await state(page)).held && /Mähen/.test(await page.textContent('#mow-btn')));
  await t.shot(page, 'handy-feld');
  const overlap = await page.evaluate(() => {
    const boxes = [...document.querySelectorAll('#hud .hud-box, #compass, #joy, #mow-btn')].filter(e => e.offsetParent).map(e => e.getBoundingClientRect());
    for (let i = 0; i < boxes.length; i++) for (let j = i + 1; j < boxes.length; j++) {
      const a = boxes[i], b = boxes[j];
      if (a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom) return true;
    }
    return boxes.some(b => b.left < 0 || b.right > innerWidth || b.bottom > innerHeight);
  });
  t.check('Handy: Anzeigen und Knöpfe überdecken sich nicht', !overlap);

  const tapOk = [];
  for (const i of [3, 6, 7, 9]) {
    if (i === 3) {
      await walkTo(page, i);
      t.check('Handy: Wörter zum Antippen statt Schreibfelder', await page.locator('#q-body .chip').count() === 9 && await page.locator('#q-body input').count() === 0);
      await page.locator('#q-body .chip').first().click();
      await page.locator('#q-body .touch-slot').first().click();
      await page.locator('#q-body .touch-slot').first().click();
      t.check('Handy: Wort lässt sich wieder aus dem Feld nehmen', await page.locator('#q-body .chip.used').count() === 0 && await page.locator('#q-body .touch-slot.filled').count() === 0);
      await t.shot(page, 'handy-aufgabe');
      await page.click('#close-btn');
      await page.evaluate(() => BAUER.teleport(0, 0, 0));
      await page.waitForTimeout(200);
    }
    tapOk.push(await solve(page, i) ? '' : 'Station ' + (i + 1));
  }
  t.check('Handy: Lückentext, Reihenfolge, Tabelle und Rätsel lassen sich durch Antippen lösen', tapOk.every(x => !x), tapOk.filter(Boolean).join(', '));

  /* Im Aufgabenfenster auf Schreiben umstellen */
  await walkTo(page, 0);
  await page.click('#mode-btn');
  t.check('Umstellen auf Schreiben', await page.locator('#q-body input.ans-field').count() === 3);
  await page.close();

  /* ---------- Handy im Hochformat: passt alles auf den Bildschirm ---------- */
  page = await t.newPage(HOCH);
  await page.goto(t.url + '?test', { waitUntil: 'load' });
  await page.waitForTimeout(500);
  await t.shot(page, 'hochformat-start');
  await page.click('#startBtn');
  await mode(page, 'play');
  await page.waitForTimeout(500);
  await t.shot(page, 'hochformat-feld');
  await walkTo(page, 1);
  const wide = await page.evaluate(() => { const c = document.querySelector('#quiz-modal .modal-card'); return c.scrollWidth > c.clientWidth + 1 || c.getBoundingClientRect().right > innerWidth; });
  t.check('Hochformat: Aufgabenfenster ist nicht breiter als der Bildschirm', !wide);
  await t.shot(page, 'hochformat-aufgabe');
  await page.close();
};
