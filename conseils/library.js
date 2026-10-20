(()=>{
  const grid=document.getElementById('guides-grid');if(!grid)return;
  const cards=[...grid.querySelectorAll('.guide-card')],search=document.getElementById('guide-search'),filters=document.querySelector('.guides-filters'),more=document.getElementById('guides-more'),count=document.getElementById('guide-count'),empty=document.getElementById('guides-empty');
  const normal=value=>value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
  function category(card){
    if(card.dataset.guideCategory)return card.dataset.guideCategory;
    const title=normal(card.querySelector('h2')?.textContent||'');
    for(const [pattern,label] of [[/electri/,'Électricité'],[/plomb|sanitaire|chauffe.eau/,'Plomberie'],[/climatis/,'Climatisation'],[/vmc|ventilation/,'Ventilation'],[/budget|devis|prix|materiaux/,'Budget & devis'],[/renov/,'Rénovation'],[/maconn/,'Maçonnerie'],[/menuis/,'Menuiserie'],[/energie|isola|solaire/,'Énergie']])if(pattern.test(title))return label;
    return 'Conseils';
  }
  const entries=cards.map(card=>{
    const label=category(card),badge=card.querySelector('small'),link=card.querySelector('a'),title=card.querySelector('h2')?.textContent||'';
    if(badge)badge.textContent=label;
    if(link)link.setAttribute('aria-label','Lire le guide : '+title);
    return {card,category:label,text:normal(card.textContent)};
  });
  let selected='Tous',limit=9;
  const buttons=[];
  function update(){
    const words=normal(search.value.trim()).split(/\s+/).filter(Boolean);
    const matches=entries.filter(entry=>(selected==='Tous'||entry.category===selected)&&words.every(word=>entry.text.includes(word)));
    const shown=new Set(matches.slice(0,limit));entries.forEach(entry=>{entry.card.hidden=!shown.has(entry);});
    count.textContent=matches.length?`${Math.min(limit,matches.length)} guide${Math.min(limit,matches.length)>1?'s':''} affiché${Math.min(limit,matches.length)>1?'s':''} sur ${matches.length}`:'Aucun guide trouvé';
    more.hidden=matches.length<=limit;empty.hidden=matches.length!==0;
    buttons.forEach(button=>button.setAttribute('aria-pressed',String(button.textContent===selected)));
  }
  for(const label of ['Tous',...new Set(entries.map(entry=>entry.category))]){
    const button=document.createElement('button');button.type='button';button.textContent=label;button.setAttribute('aria-controls','guides-grid');button.setAttribute('aria-pressed',String(label==='Tous'));
    button.addEventListener('click',()=>{selected=label;limit=9;update();});filters.append(button);buttons.push(button);
  }
  search.addEventListener('input',()=>{limit=9;update();});
  more.addEventListener('click',()=>{
    const previousVisible=new Set(entries.filter(entry=>!entry.card.hidden));limit+=9;update();
    entries.find(entry=>!entry.card.hidden&&!previousVisible.has(entry))?.card.querySelector('a')?.focus({preventScroll:true});
  });
  document.querySelector('.guides-controls').hidden=false;update();
})();
