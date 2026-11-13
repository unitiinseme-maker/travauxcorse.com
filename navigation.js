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


// One lightweight footer integration for prerendered pages and app.js navigation.
(()=>{
  let links={facebook:'',instagram:''},request=0;
  const icons={
    facebook:'<path d="M13.5 21v-8.2h2.8l.4-3.2h-3.2V7.5c0-.9.3-1.6 1.6-1.6H17V3.1c-.3 0-1.5-.1-2.7-.1-2.7 0-4.5 1.6-4.5 4.6v2H7v3.2h2.8V21z" fill="currentColor"/>',
    instagram:'<rect x="3" y="3" width="18" height="18" rx="5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="4" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="17.5" cy="6.5" r="1" fill="currentColor"/>'
  };
  function valid(value,domain){try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&[domain,'www.'+domain,'m.'+domain].includes(u.hostname)?u.href:'';}catch{return '';}}
  function update(){
    const footer=document.querySelector('.tc-footer-inner');if(!footer)return;
    const values=['facebook','instagram'].map(name=>[name,valid(links[name],name+'.com')]).filter(([,url])=>url);
    const old=footer.querySelector('.tc-social-links');
    if(!values.length){old?.remove();return;}
    const key=JSON.stringify(values);if(old?.dataset.links===key)return;
    const nav=document.createElement('nav');nav.className='tc-social-links';nav.setAttribute('aria-label','Réseaux sociaux');nav.dataset.links=key;
    for(const [network,url] of values){
      const name=network==='facebook'?'Facebook':'Instagram',a=document.createElement('a');
      a.href=url;a.target='_blank';a.rel='noopener noreferrer';a.setAttribute('aria-label',name+' TravauxCorse (nouvel onglet)');a.title=name;
      a.innerHTML='<svg viewBox="0 0 24 24" width="21" height="21" aria-hidden="true" focusable="false">'+icons[network]+'</svg>';nav.append(a);
    }
    if(old)old.replaceWith(nav);else (footer.querySelector('.tc-footer-icons')||footer).append(nav);
  }
  async function load(){
    const ticket=++request;
    try{const response=await fetch('/api/social-links',{cache:'no-store',credentials:'omit'});if(!response.ok)throw Error();const value=await response.json();if(ticket!==request)return;links=value&&typeof value==='object'?value:{};}catch{if(ticket!==request)return;links={};}
    update();
  }
  new MutationObserver(update).observe(document.body,{childList:true,subtree:true});
  window.addEventListener('pageshow',event=>{if(event.persisted)load();});
  document.addEventListener('tc-social-links-updated',load);
  document.addEventListener('visibilitychange',()=>{if(!document.hidden)load();});
  load();
})();

// Google Analytics: basic consent mode. No Google request before opt-in.
(()=>{
  if(window.tcAnalyticsInstalled || /^\/(admin|artisan|client)(\/|$)/.test(location.pathname))return;
  window.tcAnalyticsInstalled=true;
  const id='G-ZE60839KNB',key='tc-analytics-consent-v1',ttl=180*24*60*60*1000;
  let active=false,loaded=false,banner;
  function read(){try{const v=JSON.parse(localStorage.getItem(key));return v&&Date.now()-v.at<ttl&&['accepted','refused'].includes(v.value)?v.value:null;}catch{return null;}}
  function cleanUrl(value){try{const u=new URL(value);return u.origin+u.pathname;}catch{return '';}}
  function start(){
    if(active)return;active=true;window['ga-disable-'+id]=false;
    window.dataLayer=window.dataLayer||[];
    window.gtag=window.gtag||function(){window.dataLayer.push(arguments);};
    gtag('consent','default',{analytics_storage:'granted',ad_storage:'denied',ad_user_data:'denied',ad_personalization:'denied'});
    if(!loaded){
      loaded=true;gtag('js',new Date());
      gtag('config',id,{allow_google_signals:false,allow_ad_personalization_signals:false,cookie_expires:15552000,cookie_update:false,page_location:cleanUrl(location.href),page_referrer:cleanUrl(document.referrer)});
      const s=document.createElement('script');s.async=true;s.src='https://www.googletagmanager.com/gtag/js?id='+id;document.head.append(s);
    }
  }
  function clearCookies(){
    const domains=[location.hostname,'.'+location.hostname,'.travauxcorse.com'];
    document.cookie.split(';').forEach(part=>{const name=part.split('=')[0].trim();if(!/^_ga($|_)/.test(name))return;
      document.cookie=name+'=; Max-Age=0; path=/';
      domains.forEach(domain=>{document.cookie=name+'=; Max-Age=0; path=/; domain='+domain;});
    });
  }
  function choose(value){
    try{localStorage.setItem(key,JSON.stringify({value,at:Date.now()}));}catch{}
    banner?.remove();banner=null;
    if(value==='accepted'){start();}else{
      window['ga-disable-'+id]=true;clearCookies();
      if(loaded)location.reload();
    }
  }
  function show(){
    if(banner){banner.querySelector('button').focus();return;}
    banner=document.createElement('section');banner.className='tc-consent';banner.setAttribute('role','region');banner.setAttribute('aria-label','Choix des cookies de mesure d’audience');
    banner.innerHTML='<strong>Mesurer pour améliorer votre expérience</strong><p>Avec votre accord, TravauxCorse utilise Google Analytics pour mesurer les visites et les pages consultées. Vous pouvez refuser et continuer à utiliser le site normalement. <a href="/cookies/">En savoir plus</a>.</p><div><button type="button" data-consent="refused">Refuser</button><button type="button" data-consent="accepted">Accepter</button></div>';
    banner.querySelectorAll('button').forEach(b=>b.addEventListener('click',()=>choose(b.dataset.consent)));
    document.body.append(banner);
  }
  function footer(){document.querySelectorAll('.tc-footer-links').forEach(nav=>{
    if(nav.querySelector('[data-cookie-settings]'))return;
    const b=document.createElement('button');b.type='button';b.dataset.cookieSettings='';b.className='tc-cookie-settings';b.textContent='Gérer les cookies';b.addEventListener('click',show);nav.append(b);
  });}
  new MutationObserver(footer).observe(document.body,{childList:true,subtree:true});footer();
  const choice=read();if(choice==='accepted')start();else if(!choice)show();
  window.addEventListener('storage',e=>{if(e.key===key)location.reload();});
})();

// Free Cloudflare Web Analytics, separate from consent-gated Google Analytics.
(()=>{
  if(!['www.travauxcorse.com','travauxcorse.com'].includes(location.hostname))return;
  if(/^\/(admin|artisan|client|api|tests)(\/|$)/.test(location.pathname))return;
  if(document.querySelector('script[data-cf-beacon]'))return;
  const beacon=document.createElement('script');
  beacon.type='module';
  beacon.src='https://static.cloudflareinsights.com/beacon.min.js';
  beacon.setAttribute('data-cf-beacon',JSON.stringify({token:'8c8fe3e4fea244faa463804eefc882f8'}));
  document.body.appendChild(beacon);
})();

// Short first-contact form, shared by public pages and SEO guides.
(() => {
  if (/^\/(admin|artisan|client|api|tests)(\/|$)/.test(location.pathname)) return;
  if (document.querySelector('script[data-tc-leads]')) return;
  const script = document.createElement('script');
  script.src = '/lead-capture.js'; script.defer = true; script.dataset.tcLeads = ''; document.head.append(script);
})();
