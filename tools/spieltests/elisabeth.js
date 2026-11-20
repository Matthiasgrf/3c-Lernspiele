/* Durchspiel-Test für „Elisabeth von Thüringen“. Aufruf: node tools/spieltest.js elisabeth
   Das Spiel bietet einen Zugang window.ELISABETH (stations, goTo(index)).
   Geprüft wird: jede Frage hat genau eine passende richtige Antwort, alle Stationen der Reihe nach
   ablaufen (mit einer falschen Antwort und mehrteiligen Stationen), Gewinn-Bildschirm, Handy-Ansicht. */
const DESK = { viewport: { width: 1280, height: 800 } };
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

module.exports = async function (t) {
  const open = async options => {
    const page = await t.newPage(options);
    await page.goto(t.url, { waitUntil: 'load' });
    await page.waitForFunction(() => window.ELISABETH && ELISABETH.stations.length > 0);
    return page;
  };
  const homeVisible = page => page.evaluate(() => [...document.querySelectorAll('a[href="../../"]')].some(a => a.offsetParent !== null));
  const quizOpen = page => page.evaluate(() => document.getElementById('quiz-modal').style.display === 'block');
  /* Anzeige oben (Rosen-Punkte, Stationen) ganz auf dem Bildschirm und nicht über dem Link zur Übersicht */
  const hudVisible = page => page.evaluate(() => {
    const home = document.getElementById('home-link').getBoundingClientRect();
    return [...document.querySelectorAll('.hud-box')].every(b => {
      const r = b.getBoundingClientRect();
      const overHome = r.left < home.right && r.right > home.left && r.top < home.bottom && r.bottom > home.top;
      return r.left >= 0 && r.right <= innerWidth && !overHome;
    });
  });
  const setHud = (page, n) => page.evaluate(n => { document.getElementById('score').textContent = n; document.getElementById('progress').textContent = n; }, n);

  const page = await open(DESK);
  const stations = await page.evaluate(() => ELISABETH.stations.map(s => ({
    title: s.title, steps: s.steps.map(q => ({ question: q.question, options: q.options, correct: q.correct, explanation: q.explanation }))
  })));
  t.check('20 Stationen', stations.length === 20, stations.length);
  const bad = [];
  stations.forEach(s => s.steps.forEach(q => {
    if (!q.question || !q.explanation || q.options.length < 2 || !(q.correct >= 0 && q.correct < q.options.length) || new Set(q.options).size !== q.options.length) bad.push(s.title);
  }));
  t.check('jede Frage hat Text, Erklärung und genau eine gültige richtige Antwort', bad.length === 0, bad.join(', '));
  const werke = stations.find(s => s.steps.some(q => q.question.includes('hungrig')));
  t.check('Werke der Barmherzigkeit: 6 Sätze zum Verbinden', werke && werke.steps.length === 6);
  t.check('Werke: „krank“ gehört zu „besucht“, „Gefängnis“ zu „zu mir gekommen“',
    werke && werke.steps.every(q => !q.question.includes('krank') || q.options[q.correct].includes('besucht'))
      && werke.steps.every(q => !q.question.includes('Gefängnis') || q.options[q.correct].includes('zu mir gekommen')));
  t.check('HUD zeigt / 20', (await page.textContent('#hud')).includes('/ 20'));
  t.check('Start-Bildschirm: Link zur Übersicht', await homeVisible(page));
  await t.shot(page, 'start');

  await page.click('#start-modal .action-btn');
  t.check('während des Spiels: Link zur Übersicht', await homeVisible(page));

  for (let i = 0; i < stations.length; i++) {
    const s = stations[i];
    await page.evaluate(i => ELISABETH.goTo(i), i);
    await page.waitForFunction(() => document.getElementById('quiz-modal').style.display === 'block', null, { timeout: 5000 });
    const title = await page.textContent('#station-title');
    t.check(`Station ${i + 1} öffnet sich`, title === `Station ${i + 1}: ${s.title}`, title);
    for (let k = 0; k < s.steps.length; k++) {
      const q = s.steps[k];
      if (s.steps.length > 1) t.check(`  Station ${i + 1}: Frage ${k + 1} / ${s.steps.length}`, (await page.textContent('#step-progress')) === `Frage ${k + 1} / ${s.steps.length}`);
      if (i === 0 || (s.steps.length > 1 && k === 1)) {
        /* eine falsche Antwort: freundliches Feedback, Station bleibt offen */
        const wrong = q.correct === 0 ? 1 : 0;
        await page.locator('.option-btn').nth(wrong).click();
        t.check(`  Station ${i + 1}: falsche Antwort gibt neuen Versuch`, (await page.textContent('#feedback')).includes('Nicht ganz'));
      }
      if (i === 14 && k === 0) await t.shot(page, 'werke-der-barmherzigkeit');
      await page.locator('.option-btn').nth(q.correct).click();
      const fb = await page.textContent('#feedback');
      if (fb.indexOf(q.explanation) < 0) t.check(`  Station ${i + 1}: Erklärung`, false, fb);
      if (k < s.steps.length - 1) {
        await page.click('#next-btn');
      }
    }
    await page.waitForFunction(() => document.getElementById('quiz-modal').style.display === 'none', null, { timeout: 5000 });
  }
  await page.waitForFunction(() => document.getElementById('end-modal').style.display === 'block', null, { timeout: 5000 });
  t.check('Gewinn-Bildschirm nach allen Stationen', (await page.textContent('#final-score-text')).includes('20 von 20'));
  t.check('Gewinn-Bildschirm: Link zur Übersicht', await homeVisible(page));
  t.check('Gewinn-Bildschirm: Nochmal spielen', await page.isVisible('#end-modal button'));
  await t.shot(page, 'gewonnen');
  await page.close();

  /* Handy: mehrteilige Station passt auf den Bildschirm */
  const phone = await open(PHONE);
  await phone.click('#start-modal .action-btn');
  await phone.evaluate(() => ELISABETH.goTo(14));
  await phone.waitForFunction(() => document.getElementById('quiz-modal').style.display === 'block', null, { timeout: 5000 });
  const fits = await phone.evaluate(() => { const r = document.getElementById('quiz-modal').getBoundingClientRect(); return r.left >= 0 && r.right <= innerWidth; });
  t.check('Handy: Quiz-Fenster passt in die Breite', fits);
  await t.shot(phone, 'handy-werke');

  /* Handy: Anzeige oben ganz sichtbar, auch auf schmalen Handys (360 px) und mit zweistelligen Zahlen */
  t.check('Handy: Anzeige oben ganz sichtbar', await hudVisible(phone));
  const small = await open({ viewport: { width: 360, height: 740 }, isMobile: true, hasTouch: true });
  await small.click('#start-modal .action-btn');
  t.check('Handy 360 px: Anzeige oben ganz sichtbar', await hudVisible(small));
  await setHud(small, '20');
  t.check('Handy 360 px: Anzeige oben ganz sichtbar bei 20 / 20', await hudVisible(small));
  await t.shot(small, 'handy-360');
};
