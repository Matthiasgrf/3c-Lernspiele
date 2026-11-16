/* Durchspiel-Test für „Robi in der Zahlenfabrik“. Aufruf: node tools/spieltest.js mathe-robi
   Das Spiel bietet mit ?test einen Zugang window.ROBI (Spielzustand, Eingaben, Zeitraffer). */
const SAVE = 'mathe_robi_v1';
const DESK = { viewport: { width: 1280, height: 800 } };
const PHONE = { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true };
const TOPICS = ['mal', 'geteilt', 'plus', 'minus', 'zehner', 'doppelt', 'nachbar', 'folgen', 'groessen', 'mix'];

module.exports = async function (t) {
  /* Seite öffnen; save = Speicherstand, der vor dem ersten Laden gesetzt wird. */
  const go = async (options, query, save) => {
    const page = await t.newPage(options);
    if (save !== undefined) {
      await page.addInitScript(([key, value]) => {
        if (!sessionStorage.getItem('gesetzt')) { localStorage.setItem(key, value); sessionStorage.setItem('gesetzt', '1'); }
      }, [SAVE, typeof save === 'string' ? save : JSON.stringify(save)]);
    }
    await page.goto(t.url + '?test' + (query || ''), { waitUntil: 'load' });
    return page;
  };
  const saved = page => page.evaluate(key => JSON.parse(localStorage.getItem(key)), SAVE);

  /* ---------- Aufgaben: jede Aufgabe hat drei verschiedene Antworten, die richtige ist dabei ---------- */
  let page = await go(DESK);
  const gen = await page.evaluate(topics => {
    const bad = [];
    let count = 0;
    for (const topic of topics) for (let stufe = 1; stufe <= 5; stufe++) for (let i = 0; i < 400; i++) {
      const q = ROBI.gen[topic](stufe);
      count++;
      const ok = q.opts.length === 3 && new Set(q.opts).size === 3 && q.opts.includes(q.ans) &&
        q.opts.every(o => Number.isInteger(o) && o > 0 && o <= 10000) && !/NaN|undefined|null/.test(q.text + q.exp + q.tip + q.full) &&
        q.tip.startsWith('Tipp: ') && q.full.includes(String(q.ans)) && !q.full.includes('?') &&
        (topic === 'groessen' || topic === 'mix' || q.ans <= 1000);
      if (!ok && bad.length < 5) bad.push(topic + ' Stufe ' + stufe + ': ' + JSON.stringify(q));
    }
    return { bad, count };
  }, TOPICS);
  t.check(gen.count + ' Aufgaben aus allen Themen und Stufen sind in Ordnung (Antworten, Tipp, Rechenweg)', gen.bad.length === 0, gen.bad.join(' | '));
  await page.close();

  /* ---------- Durchspielen mit Bot ---------- */
  const play = async (label, options, query, topic) => {
    const page = await go(options, query);
    await page.click('[data-topic="' + topic + '"]');
    await page.evaluate(() => {
      const R = window.ROBI, bot = window.BOT = { deaths: 0, wrongDone: false, lastFade: 0 };
      R.speed = 8;
      R.step = function () {
        const G = R.game(), p = G.p, L = G.L, inp = R.input;
        if (G.mode !== 'play') { inp.left = inp.right = false; return; }
        if (G.fade > 0.9 && bot.lastFade < 0.5) bot.deaths++;
        bot.lastFade = G.fade;
        const cx = p.x + p.w / 2, cur = G.cur;
        inp.left = inp.right = false;
        if (cur && !cur.solved && !cur.dead) {               /* Aufgabe: unter den richtigen Block laufen und springen */
          if (cur.locked || !cur.q) return;
          let b = cur.blocks.find(b => b.value === cur.q.ans && b.state === 'open');
          if (cur.idx === 0 && !bot.wrongDone) b = cur.blocks.find(b => b.value !== cur.q.ans && b.state === 'open') || b;
          if (!b) return;
          const bx = b.x + b.w / 2;
          if (Math.abs(cx - bx) > 6) inp[cx < bx ? 'right' : 'left'] = true;
          else if (p.onGround && Math.abs(p.vx) < 5) { inp.jumpPressed = true; if (b.value !== cur.q.ans) bot.wrongDone = true; }
          return;
        }
        if (!p.onGround) { inp.right = true; return; }
        const fx = p.x + p.w + 12, feet = p.y + p.h;
        const floor = L.solids.some(s => !s.off && s.kind !== 'gate' && s.kind !== 'wall' && fx >= s.x && fx <= s.x + s.w && s.y >= feet - 22 && s.y <= feet + 45);
        const foe = L.enemies.some(e => e.alive && e.x - (p.x + p.w) > 0 && e.x - (p.x + p.w) < 60 && Math.abs(e.y + e.h - feet) < 30);
        const onMover = p.floor && p.floor.move;
        const moverAhead = L.movers.some(m => {
          const lo = m.move.x0 + Math.min(0, m.move.dx), hi = m.move.x0 + Math.max(0, m.move.dx) + m.w;
          return fx >= lo - 5 && fx <= hi + 5;
        });
        if (floor) { inp.right = true; if (foe) inp.jumpPressed = true; }
        else if (!onMover && !moverAhead) { inp.right = true; inp.jumpPressed = true; }
        /* sonst: warten, bis die Plattform da ist */
      };
    });
    const start = Date.now();
    let s, lastX = -1, lastMove = Date.now(), why = '';
    for (;;) {
      s = await page.evaluate(() => {
        const G = ROBI.game();
        return { mode: G.mode, x: Math.round(G.p.x / 40), solved: G.solved, first: G.first, stations: G.L.stations.length, deaths: BOT.deaths };
      });
      if (s.mode === 'win') break;
      if (s.x !== lastX) { lastX = s.x; lastMove = Date.now(); }
      if (Date.now() - lastMove > 12000) { why = 'steckt fest bei Feld ' + s.x + ' nach Station ' + s.solved; break; }
      if (Date.now() - start > 180000) { why = 'zu langsam, Feld ' + s.x; break; }
      await page.waitForTimeout(200);
    }
    if (why) await t.shot(page, label + '-haengt');
    t.check(label + ': Level bis zum Gewinn-Bildschirm durchgespielt', s.mode === 'win', why || s.stations + ' Stationen, ' + s.deaths + '-mal neu gestartet');
    if (s.mode !== 'win') return null;
    /* Der Bot antwortet an Station 1 absichtlich einmal falsch, sonst immer richtig. */
    t.check(label + ': falsche Antwort wird gezählt, alle anderen beim ersten Versuch', s.first === s.stations + 3 - 1, s.first + ' von ' + (s.stations + 3));
    t.check(label + ': Bot kommt ohne viele Neustarts durch', s.deaths <= 6, s.deaths + ' Neustarts');
    await page.waitForTimeout(300);
    await t.shot(page, label + '-gewonnen');
    return page;
  };
  page = await play('alle-abschnitte', DESK, '&alle', 'mix');
  if (page) await page.close();
  page = await play('handy', PHONE, '', 'mal');
  if (page) {
    const st = await saved(page);
    t.check('Gewinn speichert Sterne und Zahnräder', !!st && st.best && st.best.mal >= 1 && st.bank > 0, JSON.stringify(st).slice(0, 120));
    await page.click('#againBtn');
    t.check('„Nochmal spielen“ startet ein neues Level', await page.evaluate(() => ROBI.game().mode === 'play' && ROBI.game().solved === 0));
    await page.close();
  }

  /* ---------- Steuerung: echte Tasten und Touch-Knöpfe ---------- */
  const pos = page => page.evaluate(() => ({ x: ROBI.game().p.x, y: ROBI.game().p.y }));
  page = await go(DESK);
  await page.click('[data-topic="mal"]');
  const a = await pos(page);
  await page.keyboard.down('ArrowRight'); await page.waitForTimeout(500); await page.keyboard.up('ArrowRight');
  const b = await pos(page);
  await page.keyboard.press('Space'); await page.waitForTimeout(200);
  const c = await pos(page);
  t.check('Tasten: Pfeil rechts läuft, Leertaste springt', b.x > a.x + 50 && c.y < b.y - 40);
  t.check('Touch-Knöpfe sind am Computer versteckt', await page.isHidden('#pad'));
  t.check('Link „Alle Spiele“ ist während des Spiels sichtbar', await page.isVisible('#hud a[href="../../"]'));
  await page.close();

  page = await go(PHONE);
  await page.tap('[data-topic="plus"]');
  const box = await page.locator('#dpad').boundingBox();
  const t0 = await pos(page);
  await page.dispatchEvent('#dpad', 'pointerdown', { clientX: box.x + box.width * 0.75, clientY: box.y + 20, pointerId: 1 });
  await page.waitForTimeout(500);
  const t1 = await pos(page);
  await page.dispatchEvent('#dpad', 'pointerup', { pointerId: 1 });
  await page.waitForTimeout(300);
  const t2 = await pos(page);
  await page.tap('#jump'); await page.waitForTimeout(200);
  const t3 = await pos(page);
  t.check('Touch: Knopf rechts läuft, Loslassen stoppt, Sprung-Knopf springt', t1.x > t0.x + 40 && Math.abs(t2.x - t1.x) < 60 && t3.y < t2.y - 40);
  await t.shot(page, 'handy-spiel');
  await page.close();

  /* ---------- Ton-Knopf: alles an → nur Geräusche → aus ---------- */
  page = await go(DESK, '', { mute: false });               /* alter Speicherstand ohne „music“ */
  await page.click('[data-topic="mal"]');
  const ton = [];
  const tonState = async () => { const st = await saved(page) || {}; ton.push((await page.textContent('#mute')) + (st.mute ? ' stumm' : st.music === false ? ' ohne Musik' : ' alles')); };
  ton.push(await page.textContent('#mute'));
  await page.click('#mute'); await tonState();
  const quiet = await page.evaluate(() => ROBI.music.out.gain.value);
  await page.click('#mute'); await tonState();
  await page.click('#mute'); await tonState();
  t.check('Ton-Knopf schaltet in drei Schritten und speichert', ton.join(' → ') === '🔊 → 🔉 ohne Musik → 🔇 stumm → 🔊 alles' && quiet === 0, ton.join(' → '));
  await page.click('#mute');
  await page.reload({ waitUntil: 'load' });
  t.check('Ton-Einstellung bleibt nach dem Neuladen', (await page.textContent('#mute')) === '🔉');
  await page.close();
  page = await go({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
  t.check('Hochformat auf dem Handy: Hinweis zum Drehen sichtbar', await page.isVisible('.turn'));
  await t.shot(page, 'start-hochformat');
  await page.close();
  page = await go(PHONE);
  t.check('Querformat: kein Hinweis zum Drehen', await page.isHidden('.turn'));
  await t.shot(page, 'start-querformat');
  await page.close();

  /* ---------- Robis Werkstatt ---------- */
  page = await go(DESK, '', { best: { mal: 2 }, mute: false, bank: 100 });          /* alter Speicherstand ohne own/wear */
  t.check('Werkstatt: alter Speicherstand lädt, Konto wird angezeigt', (await page.textContent('#shopBank')).includes('100'));
  await page.click('#shopBtn');
  await page.click('[data-item="krone"]');
  t.check('Werkstatt: zu teures Teil wird nicht gekauft', (await saved(page)).bank === 100 && /fehlen dir noch 20/.test(await page.textContent('#shopMsg')));
  await page.click('[data-item="blau"]'); await page.click('[data-item="zylinder"]');
  await page.click('[data-item="orange"]'); await page.click('[data-item="blau"]');     /* umziehen kostet nichts */
  let st = await saved(page);
  t.check('Werkstatt: Kaufen zieht Zahnräder ab und zieht das Teil an', st.bank === 20 && st.own.join() === 'blau,zylinder' && st.wear.farbe === 'blau' && st.wear.hut === 'zylinder');
  await page.waitForTimeout(200);
  await t.shot(page, 'werkstatt');
  await page.reload({ waitUntil: 'load' });
  st = await saved(page);
  t.check('Werkstatt: Käufe bleiben nach dem Neuladen erhalten', st.bank === 20 && st.wear.hut === 'zylinder' && (await page.textContent('#shopBank')).includes('20'));
  await page.close();
  page = await go(DESK, '', '{"best":5,"bank":"viel","own":"x","wear":{"farbe":"gold","hut":"gibtsnicht"}}');
  await page.click('#shopBtn');
  const worn = await page.$$eval('.item.on', list => list.map(b => b.dataset.item).join());
  t.check('Kaputter Speicherstand: Spiel lädt mit Standard-Robi', worn === 'orange,ohne,kugel' && (await page.textContent('#bank')).includes(' 0 '), worn);
  await page.close();

  /* ---------- Stufen: richtige Antworten machen es schwerer, Fehler leichter ---------- */
  page = await go(DESK, '', { lvl: { mal: 4, plus: 9, minus: 'x' } });
  await page.click('[data-topic="mal"]');
  const stufen = await page.evaluate(() => {
    const G = ROBI.game(), L = G.L, log = [];
    const level = () => Math.floor(G.skill);
    const solve = (i, wrongFirst) => {
      const s = L.stations[i];
      if (wrongFirst) ROBI.bump(s.blocks.find(b => b.value !== s.q.ans));
      ROBI.bump(s.blocks.find(b => b.value === s.q.ans));
    };
    log.push('Start ' + level());                       /* gespeichert 4 → Start 3 */
    log.push('später noch leer: ' + (L.stations[1].q === null && L.stations[1].blocks[0].value === null));
    solve(0); log.push(level()); solve(1); log.push(level());      /* 2 richtig → 4 */
    solve(2, true); log.push(level());                  /* Fehler → 3 */
    solve(3); solve(4); solve(5); solve(6); solve(7); solve(8); log.push(level());   /* höchstens 5 */
    return log.join(' | ');
  });
  t.check('Stufen: Start eine unter der gespeicherten, 2 richtige heben, ein Fehler senkt, höchstens 5',
    stufen === 'Start 3 | später noch leer: true | 3 | 4 | 3 | 5', stufen);
  await page.waitForTimeout(200);
  t.check('Stufe steht in der Anzeige', /^Stufe 5 · Serie/.test(await page.textContent('#streak')), await page.textContent('#streak'));
  await page.close();
  page = await go(DESK);
  await page.click('[data-topic="plus"]');
  t.check('Erstes Spiel beginnt mit Stufe 1', await page.evaluate(() => ROBI.game().skill === 1));
  await page.close();

  /* ---------- Lernen: Tipp, Wiederholung beim Endgegner und im nächsten Spiel, Rückblick ---------- */
  const learnSetup = () => {
    window.solve = (o, wrongFirst) => {
      if (wrongFirst) ROBI.bump(o.blocks.find(b => b.value !== o.q.ans));
      ROBI.bump(o.blocks.find(b => b.value === o.q.ans));
    };
    /* Endgegner besiegen, ohne auf die Pausen zwischen den Aufgaben zu warten */
    window.beatBoss = async () => {
      const G = ROBI.game(), B = G.L.boss, asked = [];
      for (let i = 0; i < 3; i++) {
        asked.push({ text: B.q.text, replay: !!B.q.replay });
        solve(B);
        B.wait = 0.01;
        await new Promise(r => setTimeout(r, 150));
      }
      G.p.x = G.L.goal.x - 30; G.p.y = 280;
      return asked;
    };
  };
  page = await go(DESK);
  await page.click('[data-topic="mal"]');
  await page.evaluate(learnSetup);
  const learn = await page.evaluate(async () => {
    const G = ROBI.game(), L = G.L, out = {};
    solve(L.stations[0]); solve(L.stations[1]);
    const hard = L.stations[2];
    out.text = hard.q.text; out.full = hard.q.full; out.ans = hard.q.ans;
    ROBI.bump(hard.blocks.find(b => b.value !== hard.q.ans));
    out.tip = hard.msg;
    ROBI.bump(hard.blocks.find(b => b.value === hard.q.ans));
    for (let i = 3; i < L.stations.length; i++) solve(L.stations[i]);
    out.boss = await beatBoss();
    return out;
  });
  t.check('Tipp nach dem ersten Fehler, ohne die Lösung zu verraten',
    learn.tip.startsWith('🤔 Noch nicht ganz. Tipp: ') && !new RegExp('= ' + learn.ans + '\\b').test(learn.tip), learn.tip);
  t.check('Endgegner fragt die verpasste Aufgabe noch einmal, danach neue',
    learn.boss[0].text === learn.text && learn.boss[0].replay && !learn.boss[1].replay && learn.boss[1].text !== learn.text,
    JSON.stringify(learn.boss));
  await page.waitForSelector('#win:not([hidden])', { timeout: 10000 });
  const review = await page.textContent('#review');
  t.check('Rückblick nennt die knifflige Aufgabe mit Lösung', review.includes('knifflig') && review.includes(learn.full), review);
  await t.shot(page, 'rueckblick');
  let mem = await saved(page);
  t.check('Verpasste Aufgabe und erreichte Stufe werden gespeichert',
    mem.again.mal.length === 1 && mem.again.mal[0].text === learn.text && mem.lvl.mal >= 2, JSON.stringify(mem.again) + ' Stufe ' + mem.lvl.mal);
  /* nächstes Spiel im selben Thema: die Aufgabe kommt an Station 2 wieder */
  await page.click('#againBtn');
  await page.evaluate(learnSetup);
  const again = await page.evaluate(() => {
    const G = ROBI.game(), L = G.L;
    solve(L.stations[0]);
    const q = L.stations[1].q;
    solve(L.stations[1]);
    return { text: q.text, again: !!q.again };
  });
  mem = await saved(page);
  t.check('Nächstes Spiel: Aufgabe kommt wieder und ist nach richtigem ersten Versuch abgehakt',
    again.again && again.text === learn.text && mem.again.mal.length === 0, JSON.stringify(again) + ' ' + JSON.stringify(mem.again));
  await page.evaluate(async () => {
    const L = ROBI.game().L;
    for (let i = 2; i < L.stations.length; i++) solve(L.stations[i]);
    await beatBoss();
  });
  await page.waitForSelector('#win:not([hidden])', { timeout: 10000 });
  t.check('Rückblick ohne Fehler lobt', (await page.textContent('#review')).includes('Alle Aufgaben beim ersten Versuch'));
  await page.close();
  page = await go(DESK, '', { again: { mal: [{ text: 'kaputt' }, 7, { text: '3 · 3 = ?', ans: 9, opts: [9, 9, 8], exp: '', tip: '', full: '' }] } });
  t.check('Kaputte Merkliste wird beim Laden verworfen', await page.evaluate(() => { document.querySelector('[data-topic="mal"]').click(); return ROBI.game().again.length === 0; }));
  await page.close();

  /* ---------- Serien-Bonus ---------- */
  page = await go(PHONE);
  await page.tap('[data-topic="mal"]');
  const serie = await page.evaluate(() => {
    const G = ROBI.game(), L = G.L, log = [];
    const solve = (i, wrongFirst) => {
      const s = L.stations[i];
      if (wrongFirst) ROBI.bump(s.blocks.find(b => b.value !== s.q.ans));
      ROBI.bump(s.blocks.find(b => b.value === s.q.ans));
    };
    const powers = () => Object.keys(G.power).filter(k => G.power[k]).join('+') || '-';
    solve(0); solve(1); log.push(powers());           /* 2 richtig: noch nichts */
    solve(2); log.push(powers());                     /* 3 richtig: Schild */
    solve(3, true); solve(4); solve(5); log.push(powers());   /* Fehler setzt zurück: nach 2 richtigen nichts Neues */
    solve(6); log.push(powers());                     /* 3 richtig: Magnet dazu */
    G.p.inv = 0; ROBI.hurt(); log.push(G.p.dead > 0 ? 'tot' : 'lebt');
    G.p.inv = 0; ROBI.hurt(); log.push(G.p.dead > 0 ? 'tot' : 'lebt');
    return log.join(' | ');
  });
  t.check('Serien-Bonus: Vergabe nach 3 richtigen, Fehler setzt zurück, Schild fängt einen Treffer ab',
    serie === '- | shield | shield | shield+magnet | lebt | tot', serie);
  await page.close();
};
