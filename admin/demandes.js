(() => {
  const $=selector=>document.querySelector(selector);
  const status=$('#request-status'),list=$('#request-list'),login=$('#request-login'),setup=$('#request-setup');
  let csrf='';
  function line(parent,label,value){if(!value)return;const row=document.createElement('p');const strong=document.createElement('strong');strong.textContent=label+' : ';row.append(strong,document.createTextNode(value));parent.append(row);}
  function assignments(card,item){
    const section=document.createElement('section');section.className='request-assignments';
    const heading=document.createElement('h3');heading.textContent='Artisans affectés';section.append(heading);
    if(!item.assignedArtisans?.length){const empty=document.createElement('p');empty.textContent='Aucun artisan affecté.';section.append(empty);}
    for(const artisan of item.assignedArtisans||[]){
      const row=document.createElement('div');row.className='request-assignment';
      const label=document.createElement('span');label.textContent=artisan.name+' · '+artisan.email;
      const mail=document.createElement('a');mail.textContent='Préparer un e-mail';mail.href='mailto:'+encodeURIComponent(artisan.email)+'?subject='+encodeURIComponent('TravauxCorse — '+item.title)+'&body='+encodeURIComponent('Bonjour '+artisan.name+',\n\nNous avons un projet de travaux à '+item.commune+' : '+item.title+'\nMétiers : '+item.trades+'\n\nPouvez-vous nous confirmer votre intérêt ?\n\nTravauxCorse');
      const remove=document.createElement('button');remove.type='button';remove.className='secondary';remove.textContent='Retirer';remove.dataset.removeAssignment=artisan.id;remove.dataset.requestId=item.id;
      row.append(label,mail,remove);section.append(row);
    }
    const form=document.createElement('form');form.className='request-assign-form';form.dataset.requestId=item.id;
    const nameLabel=document.createElement('label');nameLabel.textContent='Nom de l’artisan';const name=document.createElement('input');name.name='artisanName';name.maxLength=120;name.required=true;name.autocomplete='organization';nameLabel.append(name);
    const emailLabel=document.createElement('label');emailLabel.textContent='E-mail de l’artisan';const email=document.createElement('input');email.type='email';email.name='artisanEmail';email.maxLength=254;email.required=true;email.autocomplete='email';emailLabel.append(email);
    const button=document.createElement('button');button.type='submit';button.className='primary';button.textContent='Affecter cet artisan';
    form.append(nameLabel,emailLabel,button);section.append(form);card.append(section);
  }
  function draw(items){
    list.replaceChildren();
    if(!items.length){const empty=document.createElement('p');empty.textContent='Aucune demande de travaux enregistrée.';list.append(empty);return;}
    for(const item of items){
      const card=document.createElement('article');card.className='portal-card';
      const heading=document.createElement('h2');heading.textContent=item.title||'Demande de travaux';card.append(heading);
      for(const [label,key] of [['Date (UTC)','date'],['Nom','name'],['Email','email'],['Téléphone','phone'],['Métiers','trades'],['Commune','commune'],['Délai','delay'],['Budget','budget'],['Bien','property'],['Surface','surface'],['Description','description'],['Documents et informations','details']])line(card,label,item[key]);
      assignments(card,item);list.append(card);
    }
  }
  async function load(){
    status.textContent='Chargement des demandes…';
    try{
      const response=await fetch('/api/submissions',{credentials:'same-origin',cache:'no-store'});
      const data=await response.json();
      if(response.status===401){csrf='';list.replaceChildren();login.hidden=false;setup.hidden=true;status.textContent='Connectez-vous pour consulter les demandes.';return;}
      login.hidden=true;setup.hidden=!data.setup;
      if(!response.ok)throw Error(data.error||'Impossible de charger les demandes.');
      csrf=data.csrf;draw(data.requests);status.textContent=data.requests.length+' demande(s) enregistrée(s).';
    }catch(error){status.textContent=error.message;}
  }
  async function update(payload,button){
    button.disabled=true;status.textContent='Enregistrement de l’affectation…';
    try{
      const response=await fetch('/api/assign-request',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(payload)});
      const data=await response.json();
      if(!response.ok)throw Error(data.error||'Impossible d’enregistrer l’affectation.');
      await load();status.textContent='Affectation enregistrée. Préparez un e-mail pour contacter l’artisan : aucun message n’est envoyé automatiquement.';
    }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
  }
  list.addEventListener('submit',event=>{
    const form=event.target.closest('.request-assign-form');if(!form)return;
    event.preventDefault();update({action:'assign',id:form.dataset.requestId,name:form.elements.artisanName.value,email:form.elements.artisanEmail.value},form.querySelector('button'));
  });
  list.addEventListener('click',event=>{
    const button=event.target.closest('[data-remove-assignment]');if(!button)return;
    update({action:'remove',id:button.dataset.requestId,assignmentId:button.dataset.removeAssignment},button);
  });
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
