#!/usr/bin/env node
/* Passt ein (hochgeladenes) Spiel an die Regeln des Repositorys an – nur die technischen Punkte,
   die den Inhalt nicht verändern:
     - <html lang="de">
     - viewport mit Zoom-Schutz (maximum-scale=1,user-scalable=no) und ../../assets/zoom-schutz.js
     - Three.js r128 vom CDN  → ../../assets/vendor/three-r128.min.js
     - Google-Schriften entfernen (das Spiel nimmt dann die Schrift des Geräts)
   Was nur von Hand geht (Link „🏠 Alle Spiele“, andere fremde Server), wird am Ende aufgelistet.

   Aufruf:  node tools/anpassen.js <ordner>               ändert games/<ordner>/index.html
            node tools/anpassen.js <ordner> --nur-zeigen  zeigt nur, was geändert würde

   neues-spiel.js ruft das automatisch auf, wenn im Ordner schon eine index.html liegt. */
const fs = require('fs');
const path = require('path');
const { GAMES_DIR } = require('./lib');

const ZOOM_TAG = '<script src="../../assets/zoom-schutz.js"></script>';
const VIEWPORT = 'width=device-width,initial-scale=1,maximum-scale=1,user-scalable=no';

function anpassen(html) {
  const changes = [], todo = [];

  /* Sprache */
  if (!/<html[^>]*\blang=/i.test(html) && /<html\b/i.test(html)) {
    html = html.replace(/<html\b/i, '<html lang="de"');
    changes.push('<html lang="de"> ergänzt');
  }

  /* viewport */
  const vp = /<meta[^>]+name=["']viewport["'][^>]*>/i.exec(html);
  if (!vp) {
    const tag = '<meta name="viewport" content="' + VIEWPORT + '">';
    if (/<meta[^>]+charset[^>]*>/i.test(html)) html = html.replace(/(<meta[^>]+charset[^>]*>)/i, '$1\n' + tag);
    else if (/<head[^>]*>/i.test(html)) html = html.replace(/(<head[^>]*>)/i, '$1\n' + tag);
    else todo.push('kein <head> gefunden – viewport-Tag von Hand einsetzen');
    if (html.includes(tag)) changes.push('viewport-Tag mit Zoom-Schutz ergänzt');
  } else if (!/user-scalable\s*=\s*no/i.test(vp[0])) {
    const content = (/content=["']([^"']*)["']/i.exec(vp[0]) || [, ''])[1];
    const rest = content.split(',').map(s => s.trim())
      .filter(s => s && !/^(width|initial-scale|maximum-scale|minimum-scale|user-scalable)\s*=/i.test(s));
    const fixed = vp[0].replace(/content=["'][^"']*["']/i, 'content="' + [VIEWPORT].concat(rest).join(',') + '"');
    html = html.replace(vp[0], fixed);
    changes.push('viewport-Tag: maximum-scale=1,user-scalable=no ergänzt');
  }

  /* Zoom-Schutz-Skript direkt nach dem viewport-Tag */
  if (!/<script[^>]+src=["']\.\.\/\.\.\/assets\/zoom-schutz\.js["']/i.test(html)) {
    const v = /<meta[^>]+name=["']viewport["'][^>]*>/i.exec(html);
    if (v) { html = html.replace(v[0], v[0] + '\n' + ZOOM_TAG); changes.push('Zoom-Schutz (assets/zoom-schutz.js) eingebunden'); }
  }

  /* Three.js r128 vom CDN → lokale Datei */
  html = html.replace(/<script([^>]*?)\bsrc=["'](?:https?:)?\/\/[^"']*?three(?:@|\/|\.js\/)(?:r?0?\.?128(?:\.\d+)?|r128)[^"']*?three(?:\.min)?\.js["']([^>]*)><\/script>/gi, (m, a, b) => {
    changes.push('Three.js r128 vom CDN durch ../../assets/vendor/three-r128.min.js ersetzt');
    return '<script' + a.replace(/\s+(?:integrity|crossorigin)=["'][^"']*["']/gi, '') + 'src="../../assets/vendor/three-r128.min.js"' +
      b.replace(/\s+(?:integrity|crossorigin)(?:=["'][^"']*["'])?/gi, '') + '></script>';
  });

  /* Google-Schriften: Links entfernen */
  html = html.replace(/[ \t]*<link[^>]+href=["'](?:https?:)?\/\/fonts\.(?:googleapis|gstatic)\.com[^"']*["'][^>]*>[ \t]*\r?\n?/gi, m => {
    if (/stylesheet/i.test(m)) changes.push('Google-Schrift entfernt (Spiel nimmt die Schrift des Geräts) – Aussehen prüfen');
    return '';
  });
  html = html.replace(/@import\s+url\(\s*["']?(?:https?:)?\/\/fonts\.googleapis\.com[^)]*\)\s*;?/gi, () => {
    changes.push('Google-Schrift (@import) entfernt – Aussehen prüfen');
    return '';
  });

  /* Was von Hand bleibt */
  const hosts = new Set();
  const re = /<(?:script|link|img|iframe|audio|video|source)\b[^>]*?\b(?:src|href)\s*=\s*["'](?:https?:)?\/\/([^"'\/]+)/gi;
  let m;
  while ((m = re.exec(html))) hosts.add(m[1]);
  hosts.forEach(h => todo.push('lädt noch etwas von ' + h + ' – Datei nach assets/vendor/ holen (siehe CLAUDE.md)'));
  if (!/href\s*=\s*\\?["']\.\.\/\.\.\/\\?["']/.test(html)) {
    todo.push('Link „🏠 Alle Spiele“ (href="../../") fehlt – auf Start-Bildschirm, während des Spiels und auf dem End-Bildschirm einbauen');
  }

  return { html, changes: [...new Set(changes)], todo };
}

module.exports = { anpassen };

if (require.main === module) {
  const args = process.argv.slice(2);
  const dry = args.includes('--nur-zeigen');
  const id = args.find(a => !a.startsWith('--'));
  const file = id && path.join(GAMES_DIR, id, 'index.html');
  if (!file || !fs.existsSync(file)) {
    console.log('Aufruf: node tools/anpassen.js <ordner> [--nur-zeigen]');
    process.exit(1);
  }
  const before = fs.readFileSync(file, 'utf8');
  const r = anpassen(before);
  if (!dry && r.html !== before) fs.writeFileSync(file, r.html);
  r.changes.forEach(c => console.log('  ' + (dry ? 'würde: ' : '✓ ') + c));
  if (!r.changes.length) console.log('  ✓ technisch schon in Ordnung, nichts geändert');
  r.todo.forEach(t => console.log('  ! von Hand: ' + t));
}
