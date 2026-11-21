/* Durchspiel-Test für „SPIEL_TITEL“. Aufruf: node tools/spieltest.js SPIEL_ORDNER
   Angelegt von tools/neues-spiel.js aus tools/vorlage/spieltest.js. Passt zum Quiz-Gerüst der Vorlage
   (Knöpfe #startBtn, #nextBtn, #againBtn, Bildschirme #start, #game, #win, Zugang window.SPIEL mit ?test).
   Wenn das Spiel anders aufgebaut wird: diesen Test mit anpassen. */
const DESK = { viewport: { width: 1280, height: 800 } };
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

module.exports = async function (t) {
  const open = async options => {
    const page = await t.newPage(options);
    await page.goto(t.url + '?test', { waitUntil: 'load' });
    await page.waitForFunction(() => window.SPIEL);
    return page;
  };
  const homeVisible = page => page.evaluate(() => [...document.querySelectorAll('a[href="../../"]')].some(a => a.offsetParent !== null));
  /* eine Frage lösen: erst falsch (wenn wrongFirst), dann richtig */
  const solve = async (page, wrongFirst) => {
    /* Nummer eines Antwort-Knopfs: die richtige oder eine falsche (Antworten sind gemischt) */
    const pick = right => page.evaluate(right => {
      const q = SPIEL.QUESTIONS.find(q => q.q === document.getElementById('question').textContent);
      return [...document.querySelectorAll('#answers button')].findIndex(b => (b.textContent === q.a[q.r]) === right);
    }, right);
    const answers = page.locator('#answers button');
    if (wrongFirst) {
      await answers.nth(await pick(false)).click();
      t.check('falsche Antwort: freundlicher Hinweis, Weiter-Knopf bleibt versteckt',
        (await page.textContent('#feedback')).includes('Noch nicht') && await page.isHidden('#nextBtn'));
    }
    await answers.nth(await pick(true)).click();
    await page.click('#nextBtn');
  };

  /* ---------- Inhalt: jede Frage hat Text, Erklärung, verschiedene Antworten und eine gültige richtige ---------- */
  let page = await open(DESK);
  const questions = await page.evaluate(() => SPIEL.QUESTIONS);
  const bad = questions.filter(q => !q.q || !q.e || !Array.isArray(q.a) || q.a.length < 2 ||
    new Set(q.a).size !== q.a.length || !(q.r >= 0 && q.r < q.a.length));
  t.check(questions.length + ' Fragen in Ordnung', questions.length > 0 && bad.length === 0, bad.map(q => q.q).join(' | '));

  /* ---------- Durchspielen am Computer ---------- */
  t.check('Start-Bildschirm: Link „Alle Spiele“ sichtbar', await homeVisible(page));
  await t.shot(page, 'start');
  await page.click('#startBtn');
  t.check('während des Spiels: Link „Alle Spiele“ sichtbar', await homeVisible(page));
  t.check('Fortschritt wird angezeigt', (await page.textContent('#progress')) === 'Frage 1 / ' + questions.length);
  for (let i = 0; i < questions.length; i++) {
    if (i === 0) await t.shot(page, 'frage');
    await solve(page, i === 0);
  }
  t.check('Gewinn-Bildschirm erscheint', await page.isVisible('#win'));
  t.check('Gewinn-Bildschirm: Link „Alle Spiele“ sichtbar', await homeVisible(page));
  t.check('Sterne: alle außer der einen falsch beantworteten', (await page.textContent('#winStars')).includes((questions.length - 1) + ' von ' + questions.length));
  await t.shot(page, 'gewonnen');
  const saved = await page.evaluate(() => JSON.parse(localStorage.getItem(SPIEL.SAVE)));
  t.check('Rekord gespeichert', saved && saved.best === questions.length - 1, JSON.stringify(saved));
  await page.click('#againBtn');
  t.check('„Nochmal spielen“ beginnt bei Frage 1', (await page.textContent('#progress')) === 'Frage 1 / ' + questions.length);
  await page.close();

  /* ---------- Speicherstand: nach dem Neuladen geht es bei der richtigen Frage weiter ---------- */
  if (questions.length > 1) {
    page = await open(DESK);
    await page.click('#startBtn');
    await solve(page, false);
    await page.reload({ waitUntil: 'load' });
    await page.click('#startBtn');
    t.check('Speicherstand: nach dem Neuladen geht es bei Frage 2 weiter', (await page.textContent('#progress')) === 'Frage 2 / ' + questions.length);
    await page.close();
  }

  /* ---------- Handy ---------- */
  page = await open(PHONE);
  await page.tap('#startBtn');
  t.check('Handy: Frage und Antworten passen auf den Bildschirm', await page.evaluate(() =>
    [...document.querySelectorAll('#answers button, #question')].every(e => e.getBoundingClientRect().right <= innerWidth)));
  await t.shot(page, 'handy');
  await page.close();
};
