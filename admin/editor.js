(() => {
  const $=selector=>document.querySelector(selector);
  const e=value=>String(value||'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  let entries=[],version='',csrf='',current=null,images=[],dirty=false,busy=false,configured=false;
  let kind=new URLSearchParams(location.search).get('type')==='realisation'?'realisation':'guide';
  function message(text,error=false){$('#editor-status').textContent=text;$('#editor-status').classList.toggle('form-error',error);}
  function controls(){document.querySelectorAll("#new-content,#reload-content,[data-kind],[data-open],#editor-upload,#content-form input,#content-form textarea,#content-form button").forEach(el=>el.disabled=busy);document.querySelectorAll('[data-write]').forEach(el=>el.disabled=!configured||busy);}
  async function api(body,id){
    const response=await fetch('/api/editorial'+(id?'?id='+encodeURIComponent(id):''),{method:body?'POST':'GET',credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(60000),headers:body?{'Content-Type':'application/json','X-CSRF-Token':csrf}:{},body:body?JSON.stringify(body):undefined});
    let result;try{result=await response.json();}catch{throw Error('Le service de publication est indisponible. Votre saisie reste affichée.');}
    if(response.status===401){$('#editor-login').hidden=false;configured=false;controls();}
    if(!response.ok){if(result.configured===false){$('#editor-setup').hidden=false;$('#editor-login').hidden=true;}throw Error(result.error||'Impossible de contacter le serveur.');}
    return result;
  }
  function list(){
    $('#content-list').innerHTML=entries.filter(item=>item.draft.kind===kind).map(item=>`<button type="button" data-open="${e(item.id)}" class="content-list-item ${current===item.id?'active':''}"><strong>${e(item.draft.title)}</strong><span>${item.published?'Publié':'Brouillon'}${item.hasUnpublishedChanges?' · modifications non publiées':''}</span></button>`).join('')||'<p>Aucun contenu pour le moment.</p>';
    document.querySelectorAll('[data-open]').forEach(button=>button.onclick=()=>{if(!busy&&discard())open(entries.find(item=>item.id===button.dataset.open));});
    $('#editor-kind-title').textContent=kind==='guide'?'Conseils & guides':'Réalisations';
    document.querySelectorAll('[data-kind]').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.kind===kind)));
  }
  function discard(){return !dirty||confirm('Abandonner les modifications non enregistrées ?');}
  let opening=0;
  async function open(entry){
    const ticket=++opening;
    if(entry&&configured){try{const loaded=await api(undefined,entry.id);if(ticket!==opening)return;entry=loaded.entry;version=loaded.version;}catch(error){message(error.message,true);return;}}
    current=entry?.id||crypto.randomUUID();images=structuredClone(entry?.draft.images||[]);
    const doc=entry?.draft||{kind,title:'',slug:'',summary:'',body:'',commune:'',trades:''};
    $('#content-form').reset();
    for(const name of ['title','slug','summary','body','commune','trades'])$('#content-form').elements[name].value=doc[name]||'';
    $('#content-form').elements.slug.readOnly=!!entry;
    $('#realisation-fields').hidden=kind!=='realisation';
    $('#delete-content').hidden=!entry;$('#unpublish-content').hidden=!entry?.published;
    $('#editor-public-link').hidden=!entry?.published;
    if(entry?.published)$('#editor-public-link').href=`/${kind==='guide'?'conseils':'realisations'}/${doc.slug}/`;
    $('#content-form').hidden=false;$('#editor-preview').hidden=true;dirty=false;gallery();list();
  }
  function gallery(){
    $('#editor-images').innerHTML=images.map((img,i)=>`<div class="editor-image"><img src="${img.data}" alt="${e(img.caption)}"><label>Légende (ex. Avant / Après)<input data-caption="${i}" maxlength="180" value="${e(img.caption)}"></label><button type="button" class="secondary" data-remove-image="${i}">Retirer la photo</button></div>`).join('');
    document.querySelectorAll('[data-caption]').forEach(el=>el.oninput=()=>{images[Number(el.dataset.caption)].caption=el.value;dirty=true;});
    document.querySelectorAll('[data-remove-image]').forEach(el=>el.onclick=()=>{images.splice(Number(el.dataset.removeImage),1);dirty=true;gallery();});
  }
  function doc(){const data=Object.fromEntries(new FormData($('#content-form')));return {id:current,kind,slug:data.slug,title:data.title,summary:data.summary,body:data.body,commune:data.commune||'',trades:data.trades||'',images};}
  async function save(action){
    if(busy||!configured)return;
    if(['draft','publish'].includes(action)&&!$('#content-form').reportValidity())return;
    if(action==='publish'&&!confirm('Publier ce contenu et ses photos pour tous les visiteurs du site ?'))return;
    if(['delete','unpublish'].includes(action)&&!confirm(action==='delete'?'Supprimer ce contenu et sa page publique ?':'Retirer cette page du site public et conserver le brouillon ?'))return;
    const content=doc();
    busy=true;controls();message(action==='draft'?'Enregistrement du brouillon…':'Enregistrement de la publication…');
    try{
      const result=await api({action,id:current,doc:content,version});entries=result.entries;version=result.version;dirty=false;
      const updated=entries.find(item=>item.id===current);await open(updated);
      message(result.publicationQueued?'Enregistré. La mise à jour du site est en cours ; elle apparaîtra après le déploiement.':'Brouillon enregistré en ligne. Le contenu public reste inchangé.');
    }catch(error){message(error.message,true);}finally{busy=false;controls();}
  }
  async function load(){
    try{const result=await api();if(!result.authenticated){$('#editor-login').hidden=false;return;}
      configured=true;$('#editor-login').hidden=true;$('#editor-setup').hidden=true;$('#editor-logout').hidden=false;csrf=result.csrf;version=result.version;entries=result.entries;
      if(!dirty)await open(entries.find(item=>item.draft.kind===kind));else list();
      message('Connecté. Les enregistrements sont partagés en ligne.');
    }catch(error){message(error.message,true);if(!current)open();}finally{controls();}
  }
  $('#editor-login').onsubmit=async event=>{event.preventDefault();busy=true;controls();try{await api({action:'login',password:$('#editor-password').value});$('#editor-password').value='';await load();}catch(error){message(error.message,true);}finally{busy=false;controls();}};
  $('#content-form').onsubmit=event=>{event.preventDefault();save('draft');};
  $('#content-form').oninput=()=>{dirty=true;};
  $('#publish-content').onclick=()=>save('publish');$('#delete-content').onclick=()=>save('delete');$('#unpublish-content').onclick=()=>save('unpublish');
  $('#new-content').onclick=()=>{if(!busy&&discard())open();};
  $('#reload-content').onclick=()=>{if(discard()){dirty=false;load();}};
  document.querySelectorAll('[data-kind]').forEach(button=>button.onclick=()=>{if(busy||!discard())return;kind=button.dataset.kind;open(entries.find(item=>item.draft.kind===kind));});
  $('#editor-logout').onclick=async()=>{if(!discard())return;try{await api({action:'logout'});location.reload();}catch(error){message(error.message,true);}};
  $('#content-form').elements.title.addEventListener('input',event=>{if(!entries.some(item=>item.id===current))$('#content-form').elements.slug.value=event.target.value.normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'').slice(0,100).replace(/-$/,'');});
  $('#preview-content').onclick=()=>{
    const data=doc(),preview=$('#editor-preview');preview.replaceChildren();
    for(const [tag,text] of [['h2',data.title],['p',data.summary],...data.body.split(/\n\s*\n/).map(block=>[block.startsWith('## ')?'h3':'p',block.replace(/^## /,'')])]){const node=document.createElement(tag);node.textContent=text;preview.appendChild(node);}
    for(const image of images){const figure=document.createElement('figure'),img=document.createElement('img'),caption=document.createElement('figcaption');img.src=image.data;img.alt=image.caption;caption.textContent=image.caption;figure.append(img,caption);preview.appendChild(figure);}
    preview.hidden=false;preview.scrollIntoView({behavior:'smooth',block:'start'});
  };
  async function reduceImage(file){
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||file.size>12000000)throw Error('Choisissez une photo JPG, PNG ou WebP de moins de 12 Mo.');
    const bitmap=await createImageBitmap(file);const ratio=Math.min(1,1400/Math.max(bitmap.width,bitmap.height));
    const canvas=document.createElement('canvas');canvas.width=Math.round(bitmap.width*ratio);canvas.height=Math.round(bitmap.height*ratio);canvas.getContext('2d').drawImage(bitmap,0,0,canvas.width,canvas.height);bitmap.close();
    let data;for(const quality of [.82,.68,.5,.35]){data=canvas.toDataURL('image/webp',quality);if(data.length<330000)break;}
    if(data.length>=330000)throw Error('Cette image reste trop volumineuse. Choisissez une version plus petite.');
    return {data,caption:''};
  }
  $('#editor-upload').onchange=async event=>{
    const files=[...event.target.files];if(images.length+files.length>4){message('Quatre photos maximum par contenu.',true);event.target.value='';return;}
    busy=true;controls();try{const additions=[];for(const file of files)additions.push(await reduceImage(file));images.push(...additions);dirty=true;gallery();message('Photos ajoutées. Enregistrez le brouillon ou publiez.');}catch(error){message(error.message,true);}finally{busy=false;controls();event.target.value='';}
  };
  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  open();load();
})();
