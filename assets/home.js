/* Startseite: baut aus window.GAMES (games.js) die Kacheln und die Fach-Filter. */
(function () {
  var grid = document.getElementById('grid');
  var filterBar = document.getElementById('filter');
  var games = (window.GAMES || []).filter(function (g) { return g && g.id && !g.hidden; });

  if (!games.length) {
    grid.innerHTML = '<p class="empty">Noch keine Spiele vorhanden.</p>';
    return;
  }

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text) e.textContent = text;
    return e;
  }

  var tiles = games.map(function (g) {
    var a = el('a', 'tile');
    a.href = g.path || 'games/' + g.id + '/';

    var img = el('img');
    img.src = g.thumbnail || 'games/' + g.id + '/thumbnail.jpg';
    img.alt = '';
    img.width = 900;
    img.height = 600;
    img.loading = 'lazy';
    img.onerror = function () { img.style.visibility = 'hidden'; };

    var body = el('div', 'body');
    body.appendChild(el('h2', '', g.title || g.id));
    body.appendChild(el('p', '', g.description || ''));
    var tags = el('div', 'tags');
    if (g.age) tags.appendChild(el('span', 'tag age', g.age));
    if (g.subject) tags.appendChild(el('span', 'tag subject', g.subject));
    body.appendChild(tags);

    a.appendChild(img);
    a.appendChild(body);
    grid.appendChild(a);
    return { node: a, subject: g.subject || '' };
  });

  /* Filter-Knöpfe nur zeigen, wenn es mehr als ein Fach gibt. */
  var subjects = [];
  tiles.forEach(function (t) {
    if (t.subject && subjects.indexOf(t.subject) < 0) subjects.push(t.subject);
  });
  if (subjects.length < 2) return;

  var buttons = [];
  function choose(subject) {
    tiles.forEach(function (t) { t.node.hidden = !!subject && t.subject !== subject; });
    buttons.forEach(function (b) {
      b.node.setAttribute('aria-pressed', b.subject === subject ? 'true' : 'false');
    });
  }
  /* Das gewählte Fach steht in der Adresse (z. B. …/#Mathe): Link lässt sich weitergeben,
     und nach „Zurück“ aus einem Spiel ist der Filter noch eingestellt. */
  function fromHash() {
    var h = '';
    try { h = decodeURIComponent(location.hash.slice(1)); } catch (e) {}
    return subjects.indexOf(h) >= 0 ? h : '';
  }
  [''].concat(subjects).forEach(function (subject) {
    var count = subject ? tiles.filter(function (t) { return t.subject === subject; }).length : tiles.length;
    var b = el('button', 'chip', (subject || 'Alle') + ' ');
    b.appendChild(el('span', 'count', String(count)));
    b.type = 'button';
    b.addEventListener('click', function () {
      choose(subject);
      var url = location.pathname + location.search + (subject ? '#' + encodeURIComponent(subject) : '');
      try { history.replaceState(null, '', url); } catch (e) {}
    });
    filterBar.appendChild(b);
    buttons.push({ node: b, subject: subject });
  });
  filterBar.hidden = false;
  window.addEventListener('hashchange', function () { choose(fromHash()); });
  choose(fromHash());
})();
