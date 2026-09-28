(()=>{
  const $=selector=>document.querySelector(selector);
  const status=$('#partner-status'),login=$('#partner-login'),privateArea=$('#partner-private'),form=$('#partner-form'),list=$('#partner-list');
  let csrf='',partners=[],selected=null,busy=false;
  function message(value){status.textContent=value;}
  async function json(response){const data=await response.json();if(!response.ok)throw Error(data.error||'Opération impossible.');return data;}
  function reset(){selected=null;form.reset();$('#partner-form-heading').textContent='Ajouter un partenaire';$('#partner-submit').textContent='Enregistrer le partenaire';$('#partner-cancel').hidden=true;$('#partner-image-preview').replaceChildren();$('.partner-remove-image').hidden=true;}
  function line(element,label,value){if(!value)return;const p=document.createElement('p');const strong=document.createElement('strong');strong.textContent=label+' : ';p.append(strong,document.createTextNode(value));element.append(p);}
  function button(label,callback,cls='secondary'){const b=document.createElement('button');b.type='button';b.className=cls;b.textContent=label;b.addEventListener('click',callback);return b;}
  function renderList(){
    list.replaceChildren();
    if(!partners.length){const p=document.createElement('p');p.textContent='Aucun partenaire enregistré. Ajoutez une vraie entreprise avec le formulaire.';list.append(p);return;}
    for(const partner of partners){
      const card=document.createElement('article');card.className='partner-admin-card';
      const title=document.createElement('h3');title.textContent=partner.name;card.append(title);
      line(card,'Activité',partner.category);line(card,'Zone',partner.zone);line(card,'État',partner.active?'Publié':'Masqué');
      const actions=document.createElement('div');actions.className='editor-toolbar';
      actions.append(button('Modifier',()=>edit(partner)),button(partner.active?'Masquer':'Publier',()=>act({action:'toggle',id:partner.id},partner.active?'Partenaire masqué.':'Partenaire publié.')),button('Supprimer',()=>{if(window.confirm('Êtes-vous sûr de vouloir supprimer définitivement ce partenaire ?'))act({action:'delete',id:partner.id},'Partenaire supprimé.');},'danger-btn'));
      card.append(actions);list.append(card);
    }
  }
  function edit(partner){
    selected=partner;
    for(const name of ['name','category','zone','phone','email','website','description','specialties'])form.elements[name].value=partner[name]||'';
    form.elements.imageFile.value='';form.elements.removeImage.checked=false;$('.partner-remove-image').hidden=!partner.image;
    const preview=$('#partner-image-preview');preview.replaceChildren();if(partner.image){const img=document.createElement('img');img.src=partner.image;img.alt='Photo actuelle de '+partner.name;img.className='partner-preview';preview.append(img);}
    $('#partner-form-heading').textContent='Modifier '+partner.name;$('#partner-submit').textContent='Enregistrer les modifications';$('#partner-cancel').hidden=false;
    form.scrollIntoView({behavior:'smooth',block:'start'});
  }
  async function load(){
    try{
      const session=await json(await fetch('/api/editorial',{cache:'no-store',credentials:'same-origin'}));
      if(!session.authenticated){login.hidden=false;privateArea.hidden=true;message('Connectez-vous avec votre mot de passe privé de publication.');return;}
      csrf=session.csrf;
      const data=await json(await fetch('/api/partners?admin=1',{cache:'no-store',credentials:'same-origin'}));
      partners=data.partners;login.hidden=true;privateArea.hidden=false;renderList();message(partners.length+' partenaire(s) enregistré(s).');
    }catch(error){message(error.message);}
  }
  async function act(payload,success){
    if(busy)return;busy=true;message('Enregistrement…');
    try{
      await json(await fetch('/api/partners',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json','X-CSRF-Token':csrf},body:JSON.stringify(payload)}));
      const data=await json(await fetch('/api/partners?admin=1',{cache:'no-store',credentials:'same-origin'}));partners=data.partners;renderList();
      if(payload.action==='delete'&&selected?.id===payload.id)reset();
      message(success);
    }catch(error){message(error.message);}
    finally{busy=false;}
  }
  async function photo(file){
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>10000000)throw Error('Utilisez une image JPEG, PNG ou WebP de moins de 10 Mo.');
    const bitmap=await createImageBitmap(file);const scale=Math.min(1,800/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');canvas.width=Math.max(1,Math.round(bitmap.width*scale));canvas.height=Math.max(1,Math.round(bitmap.height*scale));
    canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    for(const quality of [.85,.7,.5]){const data=canvas.toDataURL('image/jpeg',quality);if(data.length<400000)return data;}
    throw Error('Cette image reste trop volumineuse : choisissez une photo plus petite.');
  }
  login.addEventListener('submit',async event=>{event.preventDefault();message('Connexion…');try{await json(await fetch('/api/editorial',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'login',password:$('#partner-password').value})}));$('#partner-password').value='';await load();}catch(error){message(error.message);}});
  form.addEventListener('submit',async event=>{
    event.preventDefault();if(busy)return;
    try{
      const payload={action:'save',id:selected?.id};for(const name of ['name','category','zone','phone','email','website','description','specialties'])payload[name]=form.elements[name].value;
      if(form.elements.removeImage.checked)payload.image='';
      if(form.elements.imageFile.files[0]){message('Préparation de la photo…');payload.image=await photo(form.elements.imageFile.files[0]);}
      await act(payload,selected?'Partenaire modifié.':'Partenaire enregistré (masqué).');
      if(status.textContent.startsWith('Partenaire '))reset();
    }catch(error){message(error.message);}
  });
  $('#partner-cancel').addEventListener('click',reset);
  load();
})();
