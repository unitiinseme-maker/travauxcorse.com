(() => {
  const $=selector=>document.querySelector(selector);
  const status=$('#request-status'),list=$('#request-list'),login=$('#request-login'),setup=$('#request-setup');
  function line(parent,label,value){if(!value)return;const row=document.createElement('p');const strong=document.createElement('strong');strong.textContent=label+' : ';row.append(strong,document.createTextNode(value));parent.append(row);}
  function draw(items){
    list.replaceChildren();
    if(!items.length){const empty=document.createElement('p');empty.textContent='Aucune demande de travaux dans l’archive récente.';list.append(empty);return;}
    for(const item of items){
      const card=document.createElement('article');card.className='portal-card';
      const heading=document.createElement('h2');heading.textContent=item.title||'Demande de travaux';card.append(heading);
      for(const [label,key] of [['Date (UTC)','date'],['Nom','name'],['Email','email'],['Téléphone','phone'],['Métiers','trades'],['Commune','commune'],['Délai','delay'],['Budget','budget'],['Bien','property'],['Surface','surface'],['Description','description'],['Documents et informations','details']])line(card,label,item[key]);
      list.append(card);
    }
  }
  async function load(){
    status.textContent='Chargement des demandes…';
    try{
      const response=await fetch('/api/submissions',{credentials:'same-origin',cache:'no-store'});
      const data=await response.json();
      if(response.status===401){login.hidden=false;setup.hidden=true;status.textContent='Connectez-vous pour consulter les demandes.';return;}
      login.hidden=true;setup.hidden=!data.setup;
      if(!response.ok)throw Error(data.error||'Impossible de charger les demandes.');
      draw(data.requests);status.textContent=data.requests.length+' demande(s) dans l’archive récente.';
    }catch(error){status.textContent=error.message;}
  }
  login.addEventListener('submit',async event=>{
    event.preventDefault();const button=login.querySelector('button');button.disabled=true;status.textContent='Connexion…';
    try{
      const response=await fetch('/api/editorial',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'login',password:$('#request-password').value})});
      $('#request-password').value='';const data=await response.json();
      if(!response.ok)throw Error(data.error||'Connexion impossible.');await load();
    }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
  });
  $('#refresh-requests').addEventListener('click',load);load();
})();
