/* Durchspiel-Test für „Die Wortmonster“. Aufruf: node tools/spieltest.js deutsch-wortmonster
   Das Spiel bietet mit ?test einen Zugang window.WORTMONSTER (Generatoren GEN, aktuelle Aufgabe, solution()).
   Geprüft wird: alle Aufgaben-Generatoren, Inhalte der Arbeitsblätter, ein ganzer Bereich mit falscher Antwort,
   das Monster-Buffet mit Ziehen und Wörterschlange, der Probetest auf dem Handy bis zur Auswertung, Speicherstand. */
const SAVE = 'deutsch_wortmonster_v1';
const DESK = { viewport: { width: 1280, height: 800 } };
const PHONE = { viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true };

module.exports = async function (t) {
  const open = async options => {
    const page = await t.newPage(options);
    await page.goto(t.url + '?test', { waitUntil: 'load' });
    await page.waitForFunction(() => window.WORTMONSTER && WORTMONSTER.state() === 'start');
    return page;
  };
  const homeVisible = page => page.evaluate(() => [...document.querySelectorAll('a[href="../../"]')].some(a => a.offsetParent !== null));
  const sol = page => page.evaluate(() => WORTMONSTER.solution());
  const tapOrClick = (page, sel, touch) => touch ? page.tap(sel) : page.click(sel);

  /* eine Aufgabe richtig lösen; drag = Wörter mit der Maus zum Monster ziehen */
  async function solve(page, opts = {}) {
    for (let n = 0; n < 80; n++) {
      const s = await sol(page);
      if (s.type === 'done') return;
      if (s.type === 'wait') { await page.waitForTimeout(150); continue; }
      if (s.type === 'gaps') await tapOrClick(page, `#opts .co[data-t="${s.ok[0]}"]:not(.wrong)`, opts.touch);
      else if (s.type === 'tap') await tapOrClick(page, `#task .tw[data-i="${s.targets[0]}"]`, opts.touch);
      else if (s.type === 'cut') await tapOrClick(page, `#task .sl[data-i="${s.starts[0]}"]`, opts.touch);
      else if (s.type === 'sort') {
        const c = s.chips[0];
        if (opts.drag) {
          const a = await page.locator(`#task .chip[data-i="${c.i}"]`).boundingBox();
          const b = await page.locator(`#stage .mon[data-m="${c.m}"]`).boundingBox();
          await page.mouse.move(a.x + a.width / 2, a.y + a.height / 2);
          await page.mouse.down();
          await page.mouse.move(a.x + 40, a.y - 20, { steps: 4 });
          await page.mouse.move(b.x + b.width / 2, b.y + b.height / 2, { steps: 8 });
          await page.mouse.up();
        } else {
          await tapOrClick(page, `#task .chip[data-i="${c.i}"]`, opts.touch);
          await tapOrClick(page, `#stage .mon[data-m="${c.m}"]`, opts.touch);
        }
      }
      await page.waitForTimeout(30);
    }
    throw new Error('Aufgabe ließ sich nicht lösen: ' + JSON.stringify(await sol(page)));
  }
  /* einmal falsch antworten */
  async function wrong(page, touch) {
    const s = await sol(page);
    if (s.type === 'gaps') await tapOrClick(page, `#opts .co[data-t="${s.opts.find(o => !s.ok.includes(o))}"]`, touch);
    else if (s.type === 'tap') await tapOrClick(page, `#task .tw[data-i="${s.others[0]}"]`, touch);
    else if (s.type === 'cut') await tapOrClick(page, `#task .sl[data-i="${s.others[1]}"]`, touch);
    else if (s.type === 'sort') {
      const c = s.chips[0];
      await tapOrClick(page, `#task .chip[data-i="${c.i}"]`, touch);
      await tapOrClick(page, `#stage .mon[data-m="${c.m === 'n' ? 'v' : 'n'}"]`, touch);
    }
  }

  /* ---------- Generatoren: jede Aufgabe lösbar, genau eine richtige Karte, keine leeren Texte ---------- */
  let page = await open(DESK);
  const gen = await page.evaluate(() => {
    const W = WORTMONSTER, bad = [], kinds = {};
    let count = 0;
    for (const name of Object.keys(W.GEN)) for (let i = 0; i < 300; i++) {
      const q = W.GEN[name]();
      count++; kinds[q.kind] = 1;
      const text = JSON.stringify(q);
      let ok = q.prompt && q.exp && q.mons.length && !/undefined|NaN|null,"ok"/.test(text);
      if (q.type === 'gaps') {
        const gaps = (q.text.match(/\{\d+\}/g) || []).length;
        ok = ok && gaps === q.steps.length;
        const pool = q.pool ? q.pool.slice() : null;
        for (const st of q.steps) {
          if (pool) { const k = pool.findIndex(o => st.ok.includes(o)); ok = ok && k >= 0; if (k >= 0) pool.splice(k, 1); }
          else ok = ok && st.opts.length >= 2 && st.opts.filter(o => st.ok.includes(o)).length === 1 && new Set(st.opts).size === st.opts.length;
          ok = ok && /^Tipp: /.test(st.tip);
        }
      } else if (q.type === 'tap') ok = ok && q.need > 0 && q.toks.filter(x => x.m === q.tm).length === q.need;
      else ok = ok && q.words.length === 6 && new Set(q.words.map(w => w.w)).size === 6 && q.words.every(w => 'nva'.includes(w.m));
      if (!ok && bad.length < 4) bad.push(name + ': ' + text.slice(0, 220));
    }
    return { bad, count, kinds: Object.keys(kinds).length };
  });
  t.check(gen.count + ' Aufgaben aus allen Generatoren sind in Ordnung', gen.bad.length === 0, gen.bad.join(' | '));
  t.check('alle Aufgabenarten kommen vor', gen.kinds >= 20, gen.kinds + ' Arten');

  const inhalt = await page.evaluate(() => {
    const W = WORTMONSTER, v = g => W.VERBEN.find(x => x[0] === g), a = b => W.ADJ.find(x => x[0] === b);
    return {
      verben: v('laufen')[1][1] === 'läufst' && v('streiten')[1][2] === 'streitet' && v('tanzen')[1][4] === 'tanzt' && v('sehen')[1][5] === 'sehen',
      adj: a('groß')[1] === 'größer' && a('alt')[2] === 'am ältesten' && a('kurz')[1] === 'kürzer' && a('glatt')[2] === 'am glattesten' && W.ADJ.filter(x => x[3] != null).length === 13,
      schlange: W.SCHLANGE.map(x => x[0]).join('') === 'fröhlichWahrheitriesigspielenrundgelbTannerennenniedlichlesenBärspazierenwinterlichtanzenNebelglücklichschwimmenPfütze',
      saetze: W.SAETZE.filter(s => s.story).map(s => W.parse(s.s).map(x => x.pre + x.w + x.post).join(' ')).join(' ')
    };
  });
  t.check('Verben vom Arbeitsblatt richtig gebeugt', inhalt.verben);
  t.check('Adjektive: 13 Wörter vom Arbeitsblatt mit Vergleichsstufen', inhalt.adj);
  t.check('Wörterschlange wie auf dem Arbeitsblatt', inhalt.schlange);
  t.check('Geschichte „Das Abenteuer“ wörtlich', inhalt.saetze.startsWith('Alex spielt mit seinen Freunden im Wald. Plötzlich erkennen sie Fußspuren auf dem Boden.') &&
    inhalt.saetze.endsWith('„Es ist nur der Förster“, ruft er.'), inhalt.saetze.slice(-60));

  /* ---------- Bereich Nomen am Computer: erste Aufgabe falsch, dann alles richtig ---------- */
  t.check('Start: Link „Alle Spiele“ sichtbar', await homeVisible(page));
  await t.shot(page, 'start-computer');
  await page.evaluate(k => localStorage.removeItem(k), SAVE);
  await page.click('[data-area="nomen"]');
  t.check('Spiel: Link „Alle Spiele“ sichtbar', await homeVisible(page));
  for (let i = 0; i < 10; i++) {
    t.check('Fortschritt „Happen ' + (i + 1) + ' / 10“', (await page.textContent('#progress')) === 'Happen ' + (i + 1) + ' / 10');
    if (i === 0) {
      await wrong(page);
      const fb = await page.textContent('#fb');
      t.check('falsche Antwort: freundlicher Hinweis, neuer Versuch', fb.includes('🤔') && (await page.isHidden('#nextBtn')), fb);
    }
    if (i === 1) await t.shot(page, 'nomen-computer');
    await solve(page);
    await page.waitForSelector('#nextBtn:not([hidden])');
    if (i === 0) t.check('richtige Antwort: Erklärung erscheint', (await page.textContent('#fb')).startsWith('✅'));
    await page.click('#nextBtn');
  }
  await page.waitForSelector('#win:not([hidden])');
  const winText = await page.textContent('#win');
  t.check('Gewinn-Bildschirm: Nomi ist satt, „Nochmal spielen“', winText.includes('Nomi ist satt') && winText.includes('9 von 10') && winText.includes('Nochmal spielen'), winText.slice(0, 120));
  t.check('Gewinn: Link „Alle Spiele“ sichtbar', await homeVisible(page));
  await page.waitForTimeout(1200);
  await t.shot(page, 'gewinn');
  const save = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), SAVE);
  t.check('Speicherstand: 3 Sterne für Nomen', save.best.nomen === 3, JSON.stringify(save));

  /* ---------- Belohnung Snack-Regen ---------- */
  const reward = await page.textContent('#rewardBtn');
  t.check('Belohnungsknopf sichtbar, ohne Zeitangabe', (await page.isVisible('#rewardBtn')) && !/\d/.test(reward), reward);
  await page.click('#rewardBtn');
  await page.waitForFunction(() => WORTMONSTER.snack() && WORTMONSTER.snack().run, null, { timeout: 6000 });
  const sn = await page.evaluate(() => WORTMONSTER.snack());
  t.check('Snack-Regen: Nomi, 20 Sekunden bei 3 Sternen', sn.m === 'n' && sn.secs === 20, JSON.stringify(sn));
  t.check('Snack-Regen: Link „Alle Spiele“ sichtbar', await homeVisible(page));
  const box = await page.locator('#sbox').boundingBox();
  await page.mouse.move(box.x + box.width * 0.2, box.y + box.height / 2);
  await page.waitForTimeout(600);
  const x1 = await page.evaluate(() => WORTMONSTER.snack().x);
  t.check('Monster folgt der Maus', Math.abs(x1 - box.width * 0.2) < 70, Math.round(x1) + ' / ' + Math.round(box.width * 0.2));
  await page.evaluate(() => { WORTMONSTER.snackCalm(); for (let i = 0; i < 3; i++) WORTMONSTER.snackDrop('snack'); WORTMONSTER.snackDrop('star'); });
  await page.waitForFunction(() => WORTMONSTER.snack().score >= 8, null, { timeout: 7000 }).catch(() => {});
  const sc = await page.evaluate(() => WORTMONSTER.snack().score);
  t.check('Snacks fangen gibt Punkte', sc >= 8, sc + ' Punkte');
  await t.shot(page, 'snackregen-computer');
  await page.evaluate(() => WORTMONSTER.snackFinish());
  const snText = await page.textContent('#win');
  t.check('Snack-Ergebnis mit Rekord', snText.includes('Punkte erschnappt') && snText.includes('Rekord'), snText.slice(0, 100));
  t.check('Belohnung nur einmal pro Runde', (await page.isHidden('#rewardBtn')) && (await page.isVisible('#rewardHint')));
  t.check('Rekord gespeichert', (await page.evaluate(k => JSON.parse(localStorage.getItem(k)).snack, SAVE)) >= 5);

  /* ---------- Monster-Buffet: Ziehen mit der Maus, Wörterschlange ---------- */
  await page.click('#menuBtn');
  await page.click('[data-area="mix"]');
  let shotSnake = false, shotSort = false;
  for (let i = 0; i < 10; i++) {
    const type = await page.evaluate(() => WORTMONSTER.task().type);
    if (type === 'snake' && !shotSnake) { await t.shot(page, 'schlange-computer'); shotSnake = true; }
    if (type === 'sort' && !shotSort) { await t.shot(page, 'sortieren-computer'); shotSort = true; }
    await solve(page, { drag: true });
    await page.click('#nextBtn');
  }
  t.check('Monster-Buffet mit Ziehen bis zum Ende', await page.isVisible('#win') && (await page.textContent('#win')).includes('Alle Monster sind satt'));
  const res = await page.evaluate(() => WORTMONSTER.results().filter(r => r.ok).length);
  t.check('Ziehen zum Monster zählt als richtig', res === 10, res + ' / 10');
  await page.reload({ waitUntil: 'load' });
  await page.waitForFunction(() => window.WORTMONSTER && WORTMONSTER.state() === 'start');
  t.check('Sterne erscheinen nach dem Neuladen', (await page.textContent('[data-st="nomen"]')).includes('⭐'));
  await page.close();

  /* ---------- Probetest auf dem Handy: ein Fehler, Auswertung, Üben-Knopf ---------- */
  const phone = await open(PHONE);
  await t.shot(phone, 'start-handy');
  await phone.tap('[data-area="test"]');
  let overflow = false;
  const shots = {};
  for (let i = 0; i < 15; i++) {
    t.check('Probetest: „Aufgabe ' + (i + 1) + ' / 15“', (await phone.textContent('#progress')) === 'Aufgabe ' + (i + 1) + ' / 15');
    const kind = await phone.evaluate(() => WORTMONSTER.task().kind);
    if (['einzahl', 'tapN', 'vlueck', 'alueck', 'podest', 'schlange', 'sortieren'].includes(kind) && !shots[kind]) { shots[kind] = 1; await t.shot(phone, 'handy-' + kind); }
    if (i === 0) {
      await wrong(phone, true);
      await phone.waitForTimeout(1000);
      t.check('Probetest: Fehler wird gezeigt, kein Tipp', (await phone.textContent('#fb')).includes('❌'));
    }
    await solve(phone, { touch: true });
    overflow = overflow || await phone.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    await phone.tap('#nextBtn');
  }
  await phone.waitForSelector('#win:not([hidden])');
  const testText = await phone.textContent('#win');
  t.check('Probetest-Auswertung: 14 von 15 Punkten', testText.includes('14 von 15'), testText.slice(0, 100));
  t.check('Auswertung nach Bereichen mit Üben-Knopf', (await phone.locator('#winBox [data-go="nomen"]').count()) === 1 && testText.includes('Verben'));
  await phone.waitForTimeout(1200);
  await t.shot(phone, 'handy-auswertung');
  t.check('Handy: kein waagerechtes Scrollen', !overflow);
  await phone.tap('#rewardBtn');
  t.check('Handy: nach dem Probetest Monster aussuchen', (await phone.locator('[data-pick]').count()) === 3);
  await phone.tap('[data-pick="a"]');
  await phone.waitForFunction(() => WORTMONSTER.snack() && WORTMONSTER.snack().run, null, { timeout: 6000 });
  t.check('Handy: Ada im Snack-Regen, 20 Sekunden', await phone.evaluate(() => WORTMONSTER.snack().m === 'a' && WORTMONSTER.snack().secs === 20));
  const pb = await phone.locator('#sbox').boundingBox();
  await phone.touchscreen.tap(pb.x + pb.width * 0.8, pb.y + pb.height * 0.6);
  await phone.waitForTimeout(800);
  t.check('Handy: Antippen bewegt das Monster', await phone.evaluate(w => WORTMONSTER.snack().x > w * 0.6, pb.width));
  t.check('Handy: Snack-Regen ohne waagerechtes Scrollen', await phone.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1));
  await t.shot(phone, 'handy-snackregen');
  await phone.evaluate(() => WORTMONSTER.snackFinish());
  await t.shot(phone, 'handy-snackende');
  await phone.goto(t.url + '?test', { waitUntil: 'load' });
  await phone.waitForFunction(() => window.WORTMONSTER && WORTMONSTER.state() === 'start');
  await phone.tap('[data-area="test"]');
  for (let i = 0; i < 15; i++) {
    if (i === 0) { await wrong(phone, true); await phone.waitForTimeout(1000); }
    await solve(phone, { touch: true });
    await phone.tap('#nextBtn');
  }
  await phone.tap('#winBox [data-go="nomen"]');
  t.check('Üben-Knopf startet den Bereich Nomen', (await phone.textContent('#kicker')) === 'Nomen & Artikel');
};
