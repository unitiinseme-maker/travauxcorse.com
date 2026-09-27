(() => {
  const status=document.querySelector('#artisan-status'),login=document.querySelector('#artisan-login'),projects=document.querySelector('#artisan-projects'),logout=document.querySelector('#artisan-logout');
  const line=(card,label,value)=>{if(!value)return;const p=document.createElement('p'),strong=document.createElement('strong');strong.textContent=label+' : ';p.append(strong,document.createTextNode(value));card.append(p);};
  function show(data){
    login.hidden=true;logout.hidden=false;projects.replaceChildren();
    status.textContent='Bienvenue '+data.artisan.name+'. '+data.projects.length+' projet(s) affecté(s).';
    if(!data.projects.length){const p=document.createElement('p');p.textContent='Aucun projet affecté pour le moment.';projects.append(p);return;}
    for(const item of data.projects){
      const card=document.createElement('article');card.className='portal-card';
      const heading=document.createElement('h2');heading.textContent=item.title;card.append(heading);
      for(const [label,key] of [['Date','date'],['Commune','commune'],['Métiers','trades'],['Délai','delay'],['Budget','budget'],['Bien','property'],['Description','description']])line(card,label,item[key]);
      const h=document.createElement('h3');h.textContent='Contact du client';card.append(h);
      line(card,'Nom',item.client.name);line(card,'Téléphone',item.client.phone);
      const p=document.createElement('p');p.textContent='E-mail : ';
      const a=document.createElement('a');a.href='mailto:'+encodeURIComponent(item.client.email);a.textContent=item.client.email;p.append(a);card.append(p);projects.append(card);
    }
  }
  async function load(){
    const response=await fetch('/api/artisan-access',{credentials:'same-origin',cache:'no-store'}),data=await response.json();
    if(!response.ok){login.hidden=false;logout.hidden=true;projects.replaceChildren();status.textContent=data.error||'Accès privé requis.';return;}
    show(data);
  }
  async function action(payload){const response=await fetch('/api/artisan-access',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});const data=await response.json();if(!response.ok)throw Error(data.error||'Action impossible.');return data;}
  (async()=>{
    const fragment=new URLSearchParams(location.hash.slice(1)),token=fragment.get('invitation');
    if(token){history.replaceState(null,'',location.pathname);try{await action({action:'redeem',token});}catch(error){status.textContent=error.message;login.hidden=false;return;}}
    try{await load();}catch{status.textContent='La connexion est momentanément indisponible.';login.hidden=false;}
  })();
  login.addEventListener('submit',async event=>{
    event.preventDefault();const button=login.querySelector('button');button.disabled=true;
    try{await action({action:'request-link',email:new FormData(login).get('email')});status.textContent='Si votre adresse est enregistrée et l’envoi d’e-mails activé, un lien vient de vous être envoyé. Sinon, contactez TravauxCorse.';}
    catch(error){status.textContent=error.message;}finally{button.disabled=false;}
  });
  logout.addEventListener('click',async()=>{try{await action({action:'logout'});await load();}catch(error){status.textContent=error.message;}});
})();
