(function(){
  var grid=document.getElementById('grid');
  var games=window.GAMES||[];
  if(!games.length){grid.innerHTML='<p class="empty">Noch keine Spiele vorhanden.</p>';return;}
  games.forEach(function(g){
    var a=document.createElement('a');a.className='tile';a.href=g.path;
    var img=document.createElement('img');img.src=g.thumbnail;img.alt='Vorschau: '+g.title;img.loading='lazy';
    var body=document.createElement('div');body.className='body';
    var h=document.createElement('h2');h.textContent=g.title;
    var p=document.createElement('p');p.textContent=g.description||'';
    body.appendChild(h);body.appendChild(p);
    if(g.age){var s=document.createElement('span');s.className='age';s.textContent='👧 '+g.age;body.appendChild(s);}
    a.appendChild(img);a.appendChild(body);grid.appendChild(a);
  });
})();
