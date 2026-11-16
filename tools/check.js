#!/usr/bin/env node
/* Prüft die Regeln des Repositorys, ohne einen Browser zu starten.
   Aufruf:  node tools/check.js
   Fehler (✗) müssen behoben werden, Hinweise (!) sollte man sich ansehen. */
const fs = require('fs');
const path = require('path');
const { ROOT, GAMES_DIR, loadGames } = require('./lib');

const errors = [];
const warnings = [];
const err = (where, msg) => errors.push(where + ': ' + msg);
const warn = (where, msg) => warnings.push(where + ': ' + msg);

/* Breite und Höhe aus einer JPEG-Datei lesen (SOF-Abschnitt). */
function jpegSize(buf) {
  if (buf.length < 4 || buf[0] !== 0xff || buf[1] !== 0xd8) return null;
  let i = 2;
  while (i + 9 < buf.length) {
    if (buf[i] !== 0xff) { i++; continue; }
    const marker = buf[i + 1];
    if (marker === 0xff) { i++; continue; }
    if (marker >= 0xd0 && marker <= 0xd9) { i += 2; continue; }
    const len = buf.readUInt16BE(i + 2);
    const isSOF = marker >= 0xc0 && marker <= 0xcf && marker !== 0xc4 && marker !== 0xc8 && marker !== 0xcc;
    if (isSOF) return { height: buf.readUInt16BE(i + 5), width: buf.readUInt16BE(i + 7) };
    i += 2 + len;
  }
  return null;
}

/* localStorage-Schlüssel finden: direkt als Text oder über eine Variable wie  var SAVE='name_v1'. */
function storageKeys(html) {
  const keys = new Set();
  let unknown = false;
  const re = /localStorage\s*\.\s*(?:getItem|setItem|removeItem)\s*\(\s*(?:(['"`])([^'"`]+)\1|([A-Za-z_$][\w$]*))/g;
  let m;
  while ((m = re.exec(html))) {
    if (m[2]) { keys.add(m[2]); continue; }
    const def = new RegExp('(?:var|let|const)\\s+' + m[3].replace(/\$/g, '\\$') + '\\s*=\\s*([\'"`])([^\'"`]+)\\1').exec(html);
    if (def) keys.add(def[2]); else unknown = true;
  }
  if (/localStorage\s*\.\s*clear\s*\(/.test(html)) keys.add('*clear*');
  return { keys: [...keys], unknown };
}

function checkGameHtml(id, dir, html) {
  const where = 'games/' + id + '/index.html';

  if (!/<html[^>]*\blang=["']de/i.test(html)) warn(where, '<html lang="de"> fehlt.');
  if (!/<meta[^>]+name=["']viewport["']/i.test(html)) err(where, 'viewport-Meta-Tag fehlt (wichtig für Handy und Tablet).');
  if (!/<title>\s*\S/i.test(html)) warn(where, '<title> fehlt oder ist leer.');

  if (!/href\s*=\s*\\?["']\.\.\/\.\.\/\\?["']/.test(html)) err(where, 'Link zurück zur Übersicht (href="../../") fehlt.');
  const homeTexts = (html.match(/Alle Spiele/g) || []).length;
  if (homeTexts === 0) err(where, 'Text „🏠 Alle Spiele“ für den Link zur Übersicht fehlt.');

  /* Nichts von fremden Servern laden: Datenschutz, und das Spiel läuft auch bei CDN-Ausfall. */
  const external = new Set();
  let m;
  const tagRe = /<(?:script|link|img|iframe|audio|video|source|embed|object)\b[^>]*?\b(?:src|href|data)\s*=\s*["'](?:https?:)?\/\/([^"'\/]+)/gi;
  while ((m = tagRe.exec(html))) external.add(m[1]);
  const cssRe = /(?:url\(\s*["']?|@import\s+["'])(?:https?:)?\/\/([^"')\/]+)/gi;
  while ((m = cssRe.exec(html))) external.add(m[1]);
  external.forEach(host => err(where, 'lädt etwas von ' + host + ' – Bibliotheken bitte in assets/vendor/ ablegen und relativ einbinden.'));

  /* Pfade: kein führendes "/", und fest eingetragene lokale Dateien müssen existieren. */
  const refRe = /<(?:script|link|img|audio|video|source|a)\b[^>]*?\b(?:src|href)\s*=\s*["']([^"']*)["']/gi;
  while ((m = refRe.exec(html))) {
    const ref = m[1];
    if (/^\/(?!\/)/.test(ref)) { err(where, 'absoluter Pfad "' + ref + '" – nur relative Pfade verwenden.'); continue; }
    if (!ref || /^(?:[a-z][a-z0-9+.-]*:|\/\/|#)/i.test(ref) || /[+{}$<>]/.test(ref)) continue;
    const target = path.resolve(dir, decodeURIComponent(ref.split(/[?#]/)[0]));
    if (!target.startsWith(ROOT)) err(where, 'Pfad "' + ref + '" zeigt aus dem Repository heraus.');
    else if (!fs.existsSync(target)) err(where, 'Datei "' + ref + '" gibt es nicht.');
  }
}

function main() {
  let games;
  try { games = loadGames(); } catch (e) { err('games.js', 'lässt sich nicht lesen: ' + e.message); }
  if (games && !Array.isArray(games)) { err('games.js', 'window.GAMES muss eine Liste sein.'); games = null; }
  games = games || [];

  const folders = fs.readdirSync(GAMES_DIR, { withFileTypes: true }).filter(d => d.isDirectory()).map(d => d.name);
  fs.readdirSync(GAMES_DIR, { withFileTypes: true }).filter(d => !d.isDirectory())
    .forEach(d => warn('games/' + d.name, 'Datei liegt direkt in games/ und wird nicht benutzt.'));

  const seen = new Set();
  const keyOwner = {};

  games.forEach((g, i) => {
    const where = 'games.js Eintrag ' + (i + 1) + (g && g.id ? ' (' + g.id + ')' : '');
    if (!g || typeof g !== 'object') { err(where, 'ist kein Objekt.'); return; }
    ['id', 'title', 'description', 'age', 'subject'].forEach(f => {
      if (typeof g[f] !== 'string' || !g[f].trim()) err(where, 'Feld "' + f + '" fehlt.');
    });
    if (typeof g.id !== 'string' || !g.id) return;
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]*$/.test(g.id)) err(where, 'id darf nur Buchstaben (ohne Umlaute), Ziffern, - und _ enthalten.');
    if (seen.has(g.id.toLowerCase())) err(where, 'id kommt doppelt vor.');
    seen.add(g.id.toLowerCase());
    if (/TODO/.test(g.title + g.description)) err(where, 'enthält noch „TODO“.');
    if (g.description && g.description.length > 140) warn(where, 'Beschreibung ist lang (' + g.description.length + ' Zeichen) – ein kurzer Satz passt besser auf die Kachel.');
    if (g.path && g.path !== 'games/' + g.id + '/') warn(where, '"path" weicht vom Standard games/<id>/ ab.');

    /* Groß-/Kleinschreibung muss stimmen: GitHub Pages unterscheidet sie, Windows und macOS nicht. */
    if (!folders.includes(g.id)) {
      const similar = folders.find(f => f.toLowerCase() === g.id.toLowerCase());
      err(where, similar ? 'Ordner heißt "' + similar + '" – Groß-/Kleinschreibung muss genau stimmen.' : 'Ordner games/' + g.id + '/ fehlt.');
      return;
    }
    const dir = path.join(GAMES_DIR, g.id);
    const files = fs.readdirSync(dir);
    const base = 'games/' + g.id + '/';

    if (!files.includes('index.html')) err(base, 'index.html fehlt.');
    else {
      const html = fs.readFileSync(path.join(dir, 'index.html'), 'utf8');
      checkGameHtml(g.id, dir, html);
      const s = storageKeys(html);
      if (s.unknown) warn(base + 'index.html', 'localStorage-Schlüssel nicht erkennbar – bitte von Hand prüfen, dass er nur zu diesem Spiel gehört.');
      s.keys.forEach(k => {
        if (k === '*clear*') { err(base + 'index.html', 'localStorage.clear() löscht auch die Spielstände der anderen Spiele.'); return; }
        if (keyOwner[k] && keyOwner[k] !== g.id) err(base + 'index.html', 'localStorage-Schlüssel "' + k + '" wird auch von ' + keyOwner[k] + ' benutzt.');
        keyOwner[k] = g.id;
      });
    }

    const thumbName = g.thumbnail ? null : 'thumbnail.jpg';
    if (thumbName) {
      if (!files.includes(thumbName)) err(base, 'thumbnail.jpg fehlt (900×600, JPEG) – siehe tools/thumbnail.js.');
      else {
        const buf = fs.readFileSync(path.join(dir, thumbName));
        const size = jpegSize(buf);
        if (!size) err(base + thumbName, 'ist keine JPEG-Datei.');
        else if (size.width !== 900 || size.height !== 600) err(base + thumbName, 'ist ' + size.width + '×' + size.height + ' statt 900×600.');
        if (buf.length > 250 * 1024) warn(base + thumbName, 'ist ' + Math.round(buf.length / 1024) + ' KB groß – unter 250 KB lädt die Startseite schneller.');
      }
    } else if (!fs.existsSync(path.join(ROOT, g.thumbnail))) err(where, 'Bild "' + g.thumbnail + '" gibt es nicht.');

    const readme = files.find(f => f.toLowerCase() === 'readme.md');
    if (!readme) err(base, 'readme.md fehlt.');
    else {
      const text = fs.readFileSync(path.join(dir, readme), 'utf8');
      if (text.trim().length < 40) err(base + readme, 'ist leer oder zu kurz (Inhalt, Steuerung, Besonderheiten).');
      if (/TODO/.test(text)) err(base + readme, 'enthält noch „TODO“.');
    }
  });

  folders.forEach(f => {
    if (!games.some(g => g && g.id === f)) err('games/' + f + '/', 'hat keinen Eintrag in games.js (oder: Eintrag mit hidden: true anlegen).');
  });

  warnings.forEach(w => console.log('  ! ' + w));
  errors.forEach(e => console.log('  ✗ ' + e));
  console.log((errors.length ? '✗ ' : '✓ ') + games.length + ' Spiele geprüft: ' + errors.length + ' Fehler, ' + warnings.length + ' Hinweise.');
  process.exit(errors.length ? 1 : 0);
}

main();
