(() => {
  const $=selector=>document.querySelector(selector);
  const status=$('#request-status'),list=$('#request-list'),login=$('#request-login'),setup=$('#request-setup');
  const directory=$('.artisan-directory'),directoryList=$('#artisan-directory-list'),directoryStatus=$('#artisan-directory-status'),invitation=$('#artisan-invitation');
  let csrf='',roster=[];
  function showInvite(url,artisan){
    invitation.replaceChildren();invitation.hidden=false;
    const p=document.createElement('p');p.textContent='L’artisan est enregistré, mais l’envoi automatique d’e-mails n’est pas encore activé. Transmettez-lui ce lien personnel (valable 7 jours) :';
    const input=document.createElement('input');input.readOnly=true;input.value=url;input.setAttribute('aria-label','Lien personnel de connexion');input.style.width='100%';
    const mail=document.createElement('a');mail.textContent='Préparer l’invitation par e-mail';mail.href='mailto:'+encodeURIComponent(artisan.email)+'?subject='+encodeURIComponent('Votre accès TravauxCorse')+'&body='+encodeURIComponent('Bonjour '+artisan.name+',\n\nVoici votre accès personnel aux projets TravauxCorse :\n'+url+'\n\nCe lien est valable 7 jours.');
    invitation.append(p,input,mail);
  }
  function renderRoster(){
    directoryList.replaceChildren();
    if(!roster.length){directoryStatus.textContent='Aucun artisan réel enregistré. Ajoutez le premier artisan ci-dessus.';return;}
    directoryStatus.textContent=roster.length+' artisan(s) enregistré(s).';
    for(const artisan of roster){const row=document.createElement('div');row.className='request-assignment';const label=document.createElement('span');label.textContent=artisan.name+' · '+artisan.trades+' · '+artisan.email;const button=document.createElement('button');button.className='secondary';button.type='button';button.textContent='Envoyer un nouvel accès';button.dataset.inviteArtisan=artisan.id;row.append(label,button);directoryList.append(row);}
  }
  async function loadRoster(){const response=await fetch('/api/artisans',{credentials:'same-origin',cache:'no-store'}),data=await response.json();if(!response.ok)throw Error(data.error||'Répertoire indisponible.');roster=data.artisans;renderRoster();}
  function line(parent,label,value){if(!value)return;const row=document.createElement('p');const strong=document.createElement('strong');strong.textContent=label+' : ';row.append(strong,document.createTextNode(value));parent.append(row);}
  function assignments(card,item){
    const section=document.createElement('section');section.className='request-assignments';
    const heading=document.createElement('h3');heading.textContent='Artisans affectés';section.append(heading);
    if(!item.assignedArtisans?.length){const empty=document.createElement('p');empty.textContent='Aucun artisan affecté.';section.append(empty);}
    for(const artisan of item.assignedArtisans||[]){
      const row=document.createElement('div');row.className='request-assignment';
      const label=document.createElement('span');label.textContent=artisan.name+' · '+artisan.email;
      const mail=document.createElement('a');mail.textContent=artisan.notified?'Notification envoyée':'Préparer un e-mail';mail.href=artisan.notified?'#artisan-directory-list':'mailto:'+encodeURIComponent(artisan.email)+'?subject='+encodeURIComponent('TravauxCorse — '+item.title)+'&body='+encodeURIComponent('Bonjour '+artisan.name+',\n\nNous avons un projet de travaux à '+item.commune+' : '+item.title+'\nMétiers : '+item.trades+'\n\nPouvez-vous nous confirmer votre intérêt ?\n\nTravauxCorse');
      const remove=document.createElement('button');remove.type='button';remove.className='secondary';remove.textContent='Retirer';remove.dataset.removeAssignment=artisan.id;remove.dataset.requestId=item.id;
      row.append(label,mail,remove);section.append(row);
    }
    const form=document.createElement('form');form.className='request-assign-form';form.dataset.requestId=item.id;
    const selectLabel=document.createElement('label');selectLabel.textContent='Choisir un artisan enregistré';const select=document.createElement('select');select.name='artisanId';const emptyOption=document.createElement('option');emptyOption.value='';emptyOption.textContent='Sélectionner un artisan';select.append(emptyOption);for(const artisan of roster){const option=document.createElement('option');option.value=artisan.id;option.textContent=artisan.name+' — '+artisan.trades;select.append(option);}selectLabel.append(select);
    const nameLabel=document.createElement('label');nameLabel.textContent='Nom de l’artisan';const name=document.createElement('input');name.name='artisanName';name.maxLength=120;name.required=true;name.autocomplete='organization';nameLabel.append(name);
    const emailLabel=document.createElement('label');emailLabel.textContent='E-mail de l’artisan';const email=document.createElement('input');email.type='email';email.name='artisanEmail';email.maxLength=254;email.required=true;email.autocomplete='email';emailLabel.append(email);
    const button=document.createElement('button');button.type='submit';button.className='primary';button.textContent='Affecter cet artisan';
    select.addEventListener('change',()=>{name.required=email.required=!select.value;nameLabel.hidden=emailLabel.hidden=!!select.value;});
    form.append(selectLabel,nameLabel,emailLabel,button);section.append(form);card.append(section);
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
      if(response.status===401){csrf='';list.replaceChildren();directory.hidden=true;login.hidden=false;setup.hidden=true;status.textContent='Connectez-vous pour consulter les demandes.';return;}
      login.hidden=true;setup.hidden=!data.setup;
      if(!response.ok)throw Error(data.error||'Impossible de charger les demandes.');
      csrf=data.csrf;directory.hidden=false;try{await loadRoster();}catch(error){directoryStatus.textContent=error.message;roster=[];}draw(data.requests);status.textContent=data.requests.length+' demande(s) enregistrée(s).';
    }catch(error){status.textContent=error.message;}
  }
  async function update(payload,button){
    button.disabled=true;status.textContent='Enregistrement de l’affectation…';
    try{
      const response=await fetch('/api/assign-request',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(payload)});
      const data=await response.json();
      if(!response.ok)throw Error(data.error||'Impossible d’enregistrer l’affectation.');
      await load();
      if(payload.action==='remove')status.textContent='Affectation retirée.';
      else if(data.notificationSent)status.textContent='Affectation enregistrée. La notification a été envoyée au service d’e-mail.';
      else if(data.inviteUrl){status.textContent='Affectation enregistrée. L’e-mail automatique est indisponible ; transmettez l’invitation ci-dessous.';const artisan=roster.find(a=>a.id===payload.artisanId);if(artisan)showInvite(data.inviteUrl,artisan);}
      else status.textContent='Affectation enregistrée. Pour cet artisan non enregistré, préparez un e-mail de contact.';
    }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
  }
  list.addEventListener('submit',event=>{
    const form=event.target.closest('.request-assign-form');if(!form)return;
    event.preventDefault();update({action:'assign',id:form.dataset.requestId,artisanId:form.elements.artisanId.value,name:form.elements.artisanName.value,email:form.elements.artisanEmail.value},form.querySelector('button'));
  });
  list.addEventListener('click',event=>{
    const button=event.target.closest('[data-remove-assignment]');if(!button)return;
    update({action:'remove',id:button.dataset.requestId,assignmentId:button.dataset.removeAssignment},button);
  });
  async function saveArtisan(payload,button){button.disabled=true;directoryStatus.textContent='Enregistrement…';try{const response=await fetch('/api/artisans',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(payload)}),data=await response.json();if(!response.ok)throw Error(data.error||'Impossible d’enregistrer l’artisan.');await load();directoryStatus.textContent=data.invitationSent?'Artisan enregistré : invitation envoyée par e-mail.':'Artisan enregistré : transmettez son invitation ci-dessous.';if(data.inviteUrl)showInvite(data.inviteUrl,data.artisan);}catch(error){directoryStatus.textContent=error.message;}finally{button.disabled=false;}}
  $('#artisan-register').addEventListener('submit',event=>{event.preventDefault();const form=event.currentTarget;saveArtisan({action:'add',name:form.elements.namedItem('name').value,email:form.elements.namedItem('email').value,trades:form.elements.namedItem('trades').value},form.querySelector('button'));});
  directoryList.addEventListener('click',event=>{const button=event.target.closest('[data-invite-artisan]');if(button)saveArtisan({action:'invite',id:button.dataset.inviteArtisan},button);});
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
