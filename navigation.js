(function(){function close(){var b=document.querySelector("[data-tc-menu]"),n=document.getElementById("tc-navigation");if(b&&n){b.setAttribute("aria-expanded","false");n.classList.remove("open");}}document.addEventListener("click",function(e){var b=e.target.closest("[data-tc-menu]");if(b){var n=document.getElementById("tc-navigation");if(n)b.setAttribute("aria-expanded",String(n.classList.toggle("open")));}else if(!e.target.closest(".tc-nav")||e.target.closest("a")){close();}});document.addEventListener("keydown",function(e){if(e.key==="Escape"){var b=document.querySelector("[data-tc-menu]");if(b&&b.getAttribute("aria-expanded")==="true"){close();b.focus();}}});})();

// Filters are generated from real published projects, never from invented examples.
(function(){
  const cards=[...document.querySelectorAll('[data-project-trades]')];
  if(!cards.length)return;
  const grid=cards[0].parentElement,bar=document.createElement('nav');bar.className='realisation-filters';bar.setAttribute('aria-label','Filtrer les réalisations par métier');
  const status=document.createElement('p');status.setAttribute('role','status');
  const categories=[...new Set(cards.flatMap(card=>card.dataset.projectTrades.split(',').map(x=>x.trim()).filter(Boolean)))];
  for(const category of ['Toutes',...categories]){const button=document.createElement('button');button.type='button';button.textContent=category;button.setAttribute('aria-pressed',String(category==='Toutes'));button.onclick=()=>{bar.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b===button)));let count=0;cards.forEach(card=>{card.hidden=category!=='Toutes'&&!card.dataset.projectTrades.split(',').map(x=>x.trim()).includes(category);if(!card.hidden)count++;});status.textContent=`${count} réalisation${count>1?'s':''} affichée${count>1?'s':''}`;};bar.appendChild(button);}
  grid.before(bar,status);
})();
