/* Durchspiel-Test für „Flug über die Welt“. Aufruf: node tools/spieltest.js weltflug
   Das Spiel bietet mit ?test einen Zugang window.WELTFLUG (Flugzeug P, Bauwerke BW, Länder C, Zustand).
   Geprüft wird: zu jedem der 10 Bauwerke fliegen, landen, Infos lesen, weiterfliegen; Speicherstand; Landung in einem Land. */
const SAVE = 'weltflug_v1';
const DESK = { viewport: { width: 1280, height: 800 } };
const PHONE = { viewport: { width: 844, height: 390 }, isMobile: true, hasTouch: true };

module.exports = async function (t) {
  const open = async options => {
    const page = await t.newPage(options);
    await page.goto(t.url + '?test', { waitUntil: 'load' });
    await page.waitForFunction(() => window.WELTFLUG && WELTFLUG.state() === 'menu', null, { timeout: 30000 });
    await page.click('#ov .btn');
    await page.waitForFunction(() => WELTFLUG.state() === 'fly');
    return page;
  };
  /* Flugzeug an einen Punkt setzen und warten, bis dort der Landen-Knopf für id erscheint */
  const hover = (page, id, x, z) => page.waitForFunction(([id, x, z]) => {
    const P = WELTFLUG.P; P.x = x; P.z = z;
    return WELTFLUG.near() === id && !document.getElementById('land').classList.contains('hidden');
  }, [id, x, z], { timeout: 5000 });
  /* Hinfliegen und im selben Augenblick auf „Landen“ tippen (das Flugzeug fliegt sonst weiter) */
  const land = (page, id, x, z) => page.waitForFunction(([id, x, z]) => {
    const P = WELTFLUG.P; P.x = x; P.z = z;
    if (WELTFLUG.near() !== id) return false;
    document.getElementById('land').click();
    return WELTFLUG.state() === 'landing';
  }, [id, x, z], { timeout: 5000 });

  const page = await open(DESK);
  const list = await page.evaluate(() => WELTFLUG.BW.map(b => ({ id: b.id, name: b.name, info: b.info, at: b.at })));
  t.check('10 Bauwerke sind im Spiel', list.length === 10, list.length);

  for (let i = 0; i < list.length; i++) {
    const b = list[i];
    /* Anflug von Süden: Bauwerk im Blick */
    await page.evaluate(id => { const b = WELTFLUG.BW.find(x => x.id === id), P = WELTFLUG.P; P.x = b.x - 2.6; P.z = b.z + 13 + b.h; P.yaw = 0; }, b.id);
    await page.waitForTimeout(900);
    await t.shot(page, 'anflug-' + b.id.slice(3));
    const pos = await page.evaluate(id => { const b = WELTFLUG.BW.find(x => x.id === id); return [b.pin.x, b.pin.z]; }, b.id);
    await hover(page, b.id, pos[0], pos[1]);
    const btn = await page.textContent('#land');
    t.check(b.name + ': Landen-Knopf', btn.includes(b.at), btn);
    await land(page, b.id, pos[0], pos[1]);
    await page.waitForSelector('.bwcard', { timeout: 5000 });
    await page.waitForTimeout(400);
    const text = await page.textContent('.bwcard');
    t.check(b.name + ': Infos werden gezeigt', text.includes(b.name) && b.info.every(s => text.includes(s)) && text.includes('Bauwerk ' + (i + 1) + ' von 10'));
    await t.shot(page, 'info-' + b.id.slice(3));
    await page.click('.bwcard .btn');
    await page.waitForFunction(() => WELTFLUG.state() === 'fly');
    /* Nicht sofort wieder am selben Ort landen */
    t.check(b.name + ': nach dem Weiterfliegen kein neuer Landen-Knopf am selben Bauwerk', await page.evaluate(id => WELTFLUG.near() !== id, b.id));
  }
  const save = await page.evaluate(k => JSON.parse(localStorage.getItem(k)), SAVE);
  t.check('Speicherstand enthält alle Bauwerke', Object.keys(save.bw || {}).length === 10, JSON.stringify(save.bw));
  t.check('Anzeige 🏛️ 10/10', (await page.textContent('#score')).includes('10/10'));

  /* Ein Land anfliegen: Quiz startet wie bisher */
  const de = await page.evaluate(() => { const c = WELTFLUG.C.find(x => x.id === 'JP'); return [c.pin.bx, c.pin.z]; });
  await land(page, 'JP', de[0], de[1]);
  await page.waitForSelector('#ov .card h2', { timeout: 8000 });
  t.check('Landung in einem Land startet das Quiz', /Gelandet in Japan/.test(await page.textContent('#ov .card')));
  await page.close();

  /* Handy: Speicherstand bleibt, Bauwerk sieht gut aus */
  const phone = await t.newPage(PHONE);
  await phone.goto(t.url + '?test', { waitUntil: 'load' });
  await phone.evaluate(([k, v]) => localStorage.setItem(k, v), [SAVE, JSON.stringify(save)]);
  await phone.reload({ waitUntil: 'load' });
  await phone.waitForFunction(() => window.WELTFLUG && WELTFLUG.state() === 'menu', null, { timeout: 30000 });
  await phone.click('#ov .btn');
  await phone.evaluate(() => { const b = WELTFLUG.BW.find(x => x.id === 'bw_eiffel'), P = WELTFLUG.P; P.x = b.x - 2.6; P.z = b.z + 13 + b.h; P.yaw = 0; });
  await phone.waitForTimeout(900);
  t.check('Handy: Spielstand mit Bauwerken geladen', (await phone.textContent('#score')).includes('10/10'));
  await t.shot(phone, 'handy-eiffelturm');
};
