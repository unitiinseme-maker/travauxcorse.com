(() => {
  const status=document.querySelector('#client-status'),login=document.querySelector('#client-login'),projects=document.querySelector('#client-projects'),logout=document.querySelector('#client-logout');
  const el=(tag,text,className)=>{const x=document.createElement(tag);if(text!=null)x.textContent=text;if(className)x.className=className;return x;};
  const field=(parent,label,value)=>{if(value===undefined||value===null||value==='')return;const p=el('p');p.append(el('strong',label+' : '),document.createTextNode(String(value)));parent.append(p);};
  const date=x=>x?new Date(x).toLocaleDateString('fr-FR'):'';
  const euro=x=>new Intl.NumberFormat('fr-FR',{style:'currency',currency:'EUR'}).format(x);
  async function action(body){
    const response=await fetch('/api/client-access',{method:'POST',credentials:'same-origin',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
    const data=await response.json();
    if(!response.ok)throw Error(data.error||'Une erreur est survenue.');
    return data;
  }
  function form(type,project,fields,label){
    const f=el('form');f.dataset.action=type;f.dataset.project=project;
    for(const [name,title,tag,required] of fields){
      const l=el('label',title),input=el(tag||'input');
      input.name=name;if(tag!=='textarea')input.type=name==='amount'||name==='vat'?'number':name==='validUntil'?'date':'text';
      if(name==='amount')input.step='0.01';if(name==='vat'){input.step='0.01';input.value='20';}
      input.required=!!required;l.append(input);f.append(l);
    }
    const b=el('button',label,'primary');b.type='submit';f.append(b);return f;
  }
  function render(data){
    login.hidden=true;logout.hidden=false;projects.replaceChildren();
    const list=data.projects||[];
    status.textContent='Bienvenue '+(data.profile.name||'').toString()+'. '+list.length+' demande(s) retrouvée(s).';
    const nav=el('p');const newRequest=el('a','Déposer une nouvelle demande','primary');newRequest.href='/deposer-une-demande/';nav.append(newRequest);projects.append(nav);
    if(list.length){
      const notice=el('section',null,'portal-card');notice.append(el('h2','Notifications récentes'));
      const events=list.flatMap(p=>(p.history||[]).map(h=>({...h,title:p.title}))).sort((a,b)=>b.at.localeCompare(a.at)).slice(0,5);
      if(events.length){const ul=el('ul');for(const entry of events)ul.append(el('li',date(entry.at)+' · '+entry.title+' : '+entry.text));notice.append(ul);}
      else notice.append(el('p','Votre demande a bien été enregistrée.'));
      projects.append(notice);
    }
    if(!list.length){projects.append(el('p','Aucune demande liée à cette adresse. Vérifiez l’adresse utilisée lors du dépôt.'));}
    for(const item of list){
      const card=el('article',null,'portal-card');card.append(el('h2',item.title));
      for(const [label,key] of [['Date','date'],['Commune','commune'],['Métiers','trades'],['Statut','status'],['Description','description'],['Délai','delay'],['Budget indicatif','budget']])field(card,label,key==='date'?date(item[key]):item[key]);
      const count=el('p',item.assignedArtisans.length+' entreprise(s) affectée(s) · '+item.assignedArtisans.filter(a=>a.response).length+' réponse(s) · '+item.quotes.length+' devis');
      card.append(count);
      const companies=el('section');companies.append(el('h3','Mes entreprises affectées'));
      if(!item.assignedArtisans.length)companies.append(el('p','TravauxCorse étudie votre demande. Les entreprises affectées apparaîtront ici.'));
      for(const company of item.assignedArtisans){
        const block=el('div',null,'request-assignment');const info=el('div');
        info.append(el('h4',company.name));field(info,'Affectée le',date(company.at));field(info,'Statut',company.status);field(info,'Réponse',company.response);
        block.append(info);companies.append(block);
      }
      card.append(companies);
      const quotes=el('section');quotes.append(el('h3','Mes devis'));
      if(!item.quotes.length)quotes.append(el('p','Aucun devis reçu pour le moment.'));
      for(const q of item.quotes){
        const company=item.assignedArtisans.find(a=>a.id===q.assignmentId);if(!company)continue;
        const box=el('div',null,'request-assignment');const info=el('div');info.append(el('strong',company.name));
        field(info,'Description',q.description);field(info,'Date',date(q.at));field(info,'Montant HT',euro(q.amount));field(info,'TVA',q.vat+' %');field(info,'Montant TTC',euro(q.amount*(1+q.vat/100)));field(info,'Valable jusqu’au',q.validUntil);field(info,'Décision',q.status);
        box.append(info);
        if(q.pdfPath){const a=el('a','Télécharger le devis PDF','secondary');a.href='/api/client-access?project='+encodeURIComponent(item.id)+'&file='+encodeURIComponent(q.pdfPath);box.append(a);}
        if(q.status==='Envoyé'){for(const choice of ['Accepté','Refusé']){const button=el('button',choice==='Accepté'?'Accepter le devis':'Refuser le devis','secondary');button.type='button';button.dataset.quote=q.id;button.dataset.status=choice;button.dataset.project=item.id;box.append(button);}}
        quotes.append(box);
      }
      card.append(quotes);
      const docs=el('section');docs.append(el('h3','Photos et documents'));
      if(!item.documents.length)docs.append(el('p','Aucun document ajouté.'));
      for(const doc of item.documents){const p=el('p'),a=el('a',doc.name);a.href='/api/client-access?project='+encodeURIComponent(item.id)+'&file='+encodeURIComponent(doc.path);p.append(a,document.createTextNode(' · '+date(doc.at)));docs.append(p);}
      const upload=el('form');upload.dataset.action='upload';upload.dataset.project=item.id;
      const label=el('label','Ajouter une photo ou un document (JPEG, PNG, WebP ou PDF, 2 Mo maximum)');
      const input=el('input');input.type='file';input.accept='image/jpeg,image/png,image/webp,application/pdf';input.name='file';input.required=true;label.append(input);upload.append(label);
      const up=el('button','Ajouter','secondary');up.type='submit';upload.append(up);docs.append(upload);card.append(docs);
      const history=el('section');history.append(el('h3','Historique du projet'));
      const listHistory=el('ul');
      const events=item.history.length?item.history:[{at:item.date,text:'Demande créée'}];
      for(const event of events)listHistory.append(el('li',date(event.at)+' — '+event.text));
      history.append(listHistory);card.append(history);
      const messages=el('section');messages.append(el('h3','Écrire à TravauxCorse'));
      for(const m of item.messages)messages.append(el('p',date(m.at)+' · '+m.from+' : '+m.text));
      messages.append(form('message',item.id,[['text','Votre message','textarea',true]],'Envoyer le message'));card.append(messages);
      if(item.status==='Demande reçue'){
        const edit=form('edit',item.id,[['description','Description complémentaire','textarea'],['delay','Délai souhaité'],['budget','Budget indicatif']],'Enregistrer les compléments');
        edit.elements.description.value=item.description||'';edit.elements.delay.value=item.delay||'';edit.elements.budget.value=item.budget||'';
        const section=el('section');section.append(el('h3','Compléter mon projet'),edit);card.append(section);
      }
      projects.append(card);
    }
    const profile=el('section',null,'portal-card');profile.append(el('h2','Mon profil'));
    const formProfile=form('profile','',[['name','Nom'],['phone','Téléphone'],['commune','Commune'],['address','Adresse'],['postcode','Code postal']],'Mettre à jour mon profil');
    for(const name of ['name','phone','commune','address','postcode'])formProfile.elements[name].value=data.profile[name]||'';
    profile.append(formProfile);projects.append(profile);
  }
  async function load(){
    const response=await fetch('/api/client-access',{credentials:'same-origin',cache:'no-store'}),data=await response.json();
    if(!response.ok){login.hidden=false;logout.hidden=true;projects.replaceChildren();status.textContent=data.error||'Accès privé requis.';return;}
    render(data);
  }
  (async()=>{
    const params=new URLSearchParams(location.hash.slice(1)),token=params.get('invitation'),email=params.get('email');
    if(token){history.replaceState(null,'',location.pathname);try{await action({action:'redeem',token,email});}catch(error){status.textContent=error.message;login.hidden=false;return;}}
    try{await load();}catch{status.textContent='Accès momentanément indisponible.';login.hidden=false;}
  })();
  login.addEventListener('submit',async event=>{
    event.preventDefault();const button=login.querySelector('button');button.disabled=true;
    try{const result=await action({action:'request-link',email:new FormData(login).get('email')});status.textContent=result.message;}
    catch(error){status.textContent=error.message;}finally{button.disabled=false;}
  });
  logout.addEventListener('click',async()=>{try{await action({action:'logout'});await load();}catch(error){status.textContent=error.message;}});
  projects.addEventListener('click',async event=>{
    const button=event.target.closest('[data-quote]');if(!button)return;
    if(!confirm('Confirmer votre décision pour ce devis ?'))return;
    button.disabled=true;try{await action({action:'quote',project:button.dataset.project,quoteId:button.dataset.quote,status:button.dataset.status});await load();}catch(error){status.textContent=error.message;button.disabled=false;}
  });
  projects.addEventListener('submit',async event=>{
    const form=event.target.closest('form[data-action]');if(!form)return;event.preventDefault();
    const button=form.querySelector('button[type="submit"]');button.disabled=true;
    try{
      const payload={action:form.dataset.action,project:form.dataset.project};
      if(payload.action==='upload'){
        const file=form.elements.file.files[0];if(!file||file.size>2*1024*1024)throw Error('Fichier limité à 2 Mo.');
        payload.name=file.name;payload.type=file.type;
        payload.data=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});
      }else Object.assign(payload,Object.fromEntries(new FormData(form)));
      await action(payload);status.textContent='Enregistré.';await load();
    }catch(error){status.textContent=error.message;button.disabled=false;}
  });
})();
