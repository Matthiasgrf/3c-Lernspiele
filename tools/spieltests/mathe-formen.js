/* Durchspiel-Test für „Die Formen-Werkstatt“. Aufruf: node tools/spieltest.js mathe-formen
   Das Spiel bietet mit ?test einen Zugang window.FORMEN (Aufgaben-Generatoren GEN, Würfelnetze, aktuelle Aufgabe).
   Geprüft wird: alle Aufgaben in allen Stufen, Würfelnetze und Symmetrie, ein ganzes Spiel bis zur Rakete
   (mit falscher Antwort und Spiegel-Gitter), 3D-Aufgaben und Falt-Animation auf dem Handy, Speicherstand. */
const SAVE = 'mathe_formen_v1';
const DESK = { viewport: { width: 1280, height: 800 } };
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };
const TOPICS = ['figuren', 'koerper', 'netze', 'bauten', 'spiegel', 'flaeche'];

module.exports = async function (t) {
  const open = async options => {
    const page = await t.newPage(options);
    await page.goto(t.url + '?test', { waitUntil: 'load' });
    await page.waitForFunction(() => window.FORMEN && FORMEN.state() === 'start');
    return page;
  };
  const homeVisible = page => page.evaluate(() => [...document.querySelectorAll('a[href="../../"]')].some(a => a.offsetParent !== null));

  /* ---------- Aufgaben: genau eine richtige Antwort, verschiedene Antworten, Tipp und Erklärung ---------- */
  let page = await open(DESK);
  t.check('3D-Ansicht ist verfügbar', await page.evaluate(() => FORMEN.has3D()));
  const gen = await page.evaluate(topics => {
    const bad = [], types = {};
    let count = 0;
    for (const topic of topics) for (let s = 1; s <= 3; s++) for (let i = 0; i < 250; i++) {
      const q = FORMEN.GEN[topic](s);
      count++;
      types[topic + s + q.key.slice(0, 2)] = 1;
      const text = JSON.stringify([q.prompt, q.exp, q.tip, q.opts ? q.opts.map(o => o.html) : []]);
      let ok = q.prompt && q.exp && q.tip.startsWith('Tipp: ') && q.vis && !/NaN|undefined|null|Infinity/.test(text);
      if (q.grid) ok = ok && Object.keys(q.grid.need).length > 0 && Object.keys(q.grid.need).every(k => !q.grid.given[k]);
      else ok = ok && q.opts.length >= 2 && q.opts.filter(o => o.ok).length === 1 && new Set(q.opts.map(o => o.html)).size === q.opts.length;
      if (!ok && bad.length < 4) bad.push(topic + ' Stufe ' + s + ': ' + text.slice(0, 200));
    }
    return { bad, count, types: Object.keys(types).length };
  }, TOPICS);
  t.check(gen.count + ' Aufgaben aus allen Themen und Stufen sind in Ordnung', gen.bad.length === 0, gen.bad.join(' | '));
  t.check('alle Aufgabenarten kommen vor', gen.types >= 55, gen.types + ' Arten');

  const geo = await page.evaluate(() => {
    const F = FORMEN;
    const strip = [[0, 0], [1, 0], [2, 0], [3, 0], [4, 0], [5, 0]];
    const cross = [[1, 0], [0, 1], [1, 1], [2, 1], [1, 2], [1, 3]];
    const faces = F.rollFaces(cross);
    return {
      hex: F.HEX.length, nets: F.NETS.length, easy: F.EASY_NON.every(h => !F.isNet(h)),
      strip: F.isNet(strip), cross: F.isNet(cross), opposite: (faces[0] ^ 1) === faces[4] && (faces[1] ^ 1) === faces[3],
      symT: F.isSym([[0, 0], [1, 0], [2, 0], [1, 1], [1, 2]]), symL: F.isSym([[0, 0], [0, 1], [0, 2], [1, 2]]),
      perim: F.perim([[0, 0], [1, 0], [0, 1], [1, 1]])
    };
  });
  t.check('35 Sechser-Formen, davon 11 Würfelnetze', geo.hex === 35 && geo.nets === 11, geo.hex + ' / ' + geo.nets);
  t.check('Kreuz ist ein Würfelnetz, 6er-Streifen nicht', geo.cross && !geo.strip && geo.easy);
  t.check('gegenüberliegende Flächen im Kreuz-Netz stimmen', geo.opposite);
  t.check('Symmetrie: T ja, L nein', geo.symT === 'v' && geo.symL === '', geo.symT + '/' + geo.symL);
  t.check('Umfang 2×2-Quadrat = 8', geo.perim === 8);

  /* ---------- Ganzes Spiel „Spiegeln“ am Computer: erste Aufgabe falsch, Gitter-Aufgaben ---------- */
  t.check('Start: Link „Alle Spiele“ sichtbar', await homeVisible(page));
  await page.evaluate(k => localStorage.removeItem(k), SAVE);
  await page.click('[data-topic="spiegel"]');
  t.check('Spiel: Link „Alle Spiele“ sichtbar', await homeVisible(page));
  for (let i = 0; i < 10; i++) {
    const task = await page.evaluate(() => ({ grid: !!FORMEN.task().grid, r: FORMEN.right(), n: FORMEN.task().opts ? FORMEN.task().opts.length : 0 }));
    if (i === 0) {
      if (task.grid) { await page.evaluate(() => FORMEN.fillGrid(false)); await page.click('#opts .opt'); }
      else await page.click('#opts .opt:nth-child(' + ((task.r + 1) % task.n + 1) + ')');
      const fb = await page.textContent('#fb');
      t.check('falsche Antwort: freundlicher Hinweis mit Tipp', fb.includes('Tipp:') && (await page.isHidden('#nextBtn')), fb);
    }
    if (task.grid) {
      await page.evaluate(() => FORMEN.fillGrid(true));
      await page.click('#opts .opt');
    } else await page.click('#opts .opt:nth-child(' + (task.r + 1) + ')');
    await page.waitForSelector('#nextBtn:not([hidden])');
    if (i === 0) t.check('richtige Antwort: Erklärung erscheint', (await page.textContent('#fb')).startsWith('✅'));
    if (i === 4) await t.shot(page, 'spiel-computer');
    t.check('Fortschritt „Auftrag ' + (i + 1) + ' / 10“', (await page.textContent('#progress')) === 'Auftrag ' + (i + 1) + ' / 10');
    await page.click('#nextBtn');
  }
  await page.waitForSelector('#win:not([hidden])');
  const winText = await page.textContent('#win');
  t.check('Gewinn-Bildschirm mit Rakete und „Nochmal spielen“', winText.includes('Die Rakete ist fertig') && winText.includes('Nochmal spielen') && winText.includes('9 davon'), winText.slice(0, 120));
  t.check('Gewinn: Link „Alle Spiele“ sichtbar', await homeVisible(page));
  const save = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), SAVE);
  t.check('Speicherstand: 3 Sterne für Spiegeln und Stufe gemerkt', save.best.spiegel === 3 && save.lvl.spiegel >= 1, JSON.stringify(save));
  await t.shot(page, 'gewinn');
  await page.click('#againBtn');
  t.check('„Nochmal spielen“ beginnt wieder bei Auftrag 1', (await page.textContent('#progress')) === 'Auftrag 1 / 10');
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.FORMEN && FORMEN.state() === 'start');
  t.check('Sterne erscheinen nach dem Neuladen auf dem Thema', (await page.textContent('[data-topic="spiegel"]')).includes('⭐⭐⭐'));
  await page.close();

  /* ---------- Handy: 3D-Würfelbau, Würfelnetz mit Falt-Animation, gemischtes Spiel ---------- */
  const phone = await open(PHONE);
  await phone.tap('[data-topic="bauten"]');
  await phone.waitForTimeout(500);
  t.check('Handy: Würfelbau wird in 3D gezeigt', await phone.evaluate(() => !!document.querySelector('#vis canvas') && document.querySelector('#vis canvas').clientHeight > 150));
  await t.shot(phone, 'handy-wuerfelbau');
  await phone.evaluate(() => { let q; for (let i = 0; i < 400; i++) { q = FORMEN.GEN.netze(2); if (q.key.startsWith('nj')) break; } FORMEN.render(q, 'netze'); });
  t.check('Handy: Würfelnetz als Bild', await phone.evaluate(() => !!document.querySelector('#vis svg')));
  await phone.tap('#opts .opt:nth-child(' + (await phone.evaluate(() => FORMEN.right() + 1)) + ')');
  await phone.waitForTimeout(3200);
  t.check('Handy: nach der Antwort wird das Netz in 3D gefaltet', await phone.evaluate(() => !!document.querySelector('#vis canvas') && !!document.querySelector('#vis .again')));
  await t.shot(phone, 'handy-gefaltet');
  await phone.goto(t.url + '?test', { waitUntil: 'load' });
  await phone.waitForFunction(() => window.FORMEN && FORMEN.state() === 'start');
  await phone.tap('[data-topic="mix"]');
  for (let i = 0; i < 10; i++) {
    if (await phone.evaluate(() => !!FORMEN.task().grid)) { await phone.evaluate(() => FORMEN.fillGrid(true)); await phone.tap('#opts .opt'); }
    else await phone.tap('#opts .opt:nth-child(' + (await phone.evaluate(() => FORMEN.right() + 1)) + ')');
    await phone.tap('#nextBtn');
  }
  t.check('Handy: gemischtes Spiel bis zur Rakete', await phone.isVisible('#win'));
  const overflow = await phone.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
  t.check('Handy: kein waagerechtes Scrollen', !overflow);
};
