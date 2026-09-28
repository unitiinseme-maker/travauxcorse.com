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
      const a=document.createElement('a');a.href='mailto:'+encodeURIComponent(item.client.email);a.textContent=item.client.email;p.append(a);card.append(p);const h3=document.createElement('h3');h3.textContent='Répondre au projet';card.append(h3);
      const reply=document.createElement('form');reply.dataset.reply='';reply.dataset.project=item.id;reply.dataset.assignment=item.assignment.id;
      const responseLabel=document.createElement('label');responseLabel.textContent='Votre réponse';const responseInput=document.createElement('textarea');responseInput.name='message';responseInput.required=true;responseInput.maxLength=3000;responseInput.value=item.assignment.response||'';responseLabel.append(responseInput);
      const replyButton=document.createElement('button');replyButton.className='secondary';replyButton.textContent='Envoyer ma réponse';reply.append(responseLabel,replyButton);card.append(reply);
      const quote=document.createElement('form');quote.dataset.quote='';quote.dataset.project=item.id;quote.dataset.assignment=item.assignment.id;
      const headingQuote=document.createElement('h3');headingQuote.textContent='Transmettre un devis';quote.append(headingQuote);
      for(const [name,label,type] of [['description','Description du devis','text'],['amount','Montant HT (€)','number'],['vat','TVA (%)','number'],['validUntil','Validité du devis','date']]){
        const field=document.createElement('label'),input=document.createElement('input');field.textContent=label;input.name=name;input.type=type;input.required=name!=='validUntil';if(type==='number'){input.step='0.01';input.min='0';}if(name==='vat')input.value='20';field.append(input);quote.append(field);
      }
      const fileLabel=document.createElement('label');fileLabel.textContent='Devis PDF (facultatif, 2 Mo maximum)';const fileInput=document.createElement('input');fileInput.type='file';fileInput.accept='application/pdf';fileInput.name='pdf';fileLabel.append(fileInput);quote.append(fileLabel);
      const quoteButton=document.createElement('button');quoteButton.className='primary';quoteButton.textContent='Envoyer le devis';quote.append(quoteButton);card.append(quote);
      if(item.quotes.length){const summary=document.createElement('p');summary.textContent=item.quotes.length+' devis transmis · '+item.quotes.map(q=>q.status).join(', ');card.append(summary);}
      projects.append(card);
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
  projects.addEventListener('submit',async event=>{
    const form=event.target.closest('form[data-reply], form[data-quote]');if(!form)return;
    event.preventDefault();const button=form.querySelector('button');button.disabled=true;
    try{
      const payload={action:form.hasAttribute('data-reply')?'reply':'quote',project:form.dataset.project,assignmentId:form.dataset.assignment,...Object.fromEntries(new FormData(form))};
      delete payload.pdf;
      if(form.elements.pdf?.files?.length){
        const file=form.elements.pdf.files[0];if(file.type!=='application/pdf'||file.size>2*1024*1024)throw Error('PDF limité à 2 Mo.');
        payload.pdfData=await new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result).split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});
      }
      await action(payload);await load();status.textContent='Votre réponse a été enregistrée.';}
    catch(error){status.textContent=error.message;button.disabled=false;}
  });
  logout.addEventListener('click',async()=>{try{await action({action:'logout'});await load();}catch(error){status.textContent=error.message;}});
})();
